import { Injectable, InternalServerErrorException, forwardRef, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { RagService } from '../knowledge/rag.service';
import { OPENAI_CLIENT } from '../../infrastructure/openai/openai.module';

@Injectable()
export class AiService {
  private openai: OpenAI | null;
  private logger = new Logger(AiService.name);

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => RagService))
    private ragService: RagService,
    @Inject(OPENAI_CLIENT) private injectedOpenai: OpenAI | null,
  ) {
    this.openai = this.injectedOpenai;
  }

  async generateBrainstormResponse(prompt: string, context?: string): Promise<string> {
    if (!this.openai) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
    }

    try {
      let finalPrompt = prompt;
      if (context) {
        finalPrompt = `Context:\n${context}\n\nTask:\n${prompt}`;
      }

      const instructions = `You are an AI property assistant called PropertiKu. The user is asking for brainstorming ideas for social media (e.g. TikTok angles, Instagram scripts) for real estate marketing. 
Provide a clear, engaging response. 
Format your ideas clearly using markdown. Make sure to respond in Indonesian language.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: finalPrompt }
        ]
      });

      return response.choices[0].message?.content || '';
    } catch (error) {
      console.error('Error in AI Service:', error);
      throw new InternalServerErrorException('Failed to generate response from OpenAI');
    }
  }

  async generateImagePrompt(prompt: string, style: string): Promise<string> {
    if (!this.openai) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
    }

    try {
      const instructions = `You are an expert AI image prompt engineer. The user will provide a simple idea in Indonesian, and a desired style.
Your task is to translate their idea into English and expand it into a highly detailed, vivid, and highly optimized image generation prompt.
Only return the prompt text. Do not add any conversational filler.
Example style additions: 
- "Realistis": photorealistic, 8k resolution, highly detailed, professional photography, cinematic lighting
- "Ilustrasi 3D": 3d render, octane render, unreal engine 5, cute, pixar style
- "Sketsa": architectural sketch, pencil drawing, blueprint style, hand drawn

User Prompt: ${prompt}
Requested Style: ${style}
Output strictly just the English prompt:`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: instructions }
        ]
      });

      return response.choices[0].message?.content?.trim() || '';
    } catch (error) {
      console.error('Error generating image prompt:', error);
      throw new InternalServerErrorException('Failed to generate image prompt from OpenAI');
    }
  }


  /**
   * Helper untuk Multi-turn Context & Intent Detection: 
   * Merumuskan ulang pertanyaan menjadi Standalone Question dan mendeteksi
   * apakah user meminta daftar katalog produk.
   */
  private async rewriteQueryAndDetectIntent(message: string, chatHistory: any[]): Promise<{ standaloneQuery: string, isCatalogRequest: boolean }> {
    const recentHistory = chatHistory && chatHistory.length > 0
      ? chatHistory.slice(-4).map(h => `${h.senderType === 'bot' ? 'CS' : 'User'}: ${h.content}`).join('\n')
      : 'No history yet.';

    const prompt = `You are a query analyzer.
1. Rephrase the user's Follow-up Question into a standalone question using the Conversation History. If no history, just return the question as is or slightly cleaned up.
2. Determine if the user's intent is to list, see, or ask for ALL available products/houses/options (e.g. "ada rumah apa aja?", "daftar harga", "kirimkan list perumahan", "sebutkan semua produk").
Respond ONLY in valid JSON format:
{
  "standaloneQuery": "string",
  "isCatalogRequest": boolean
}

Conversation History:
${recentHistory}

Follow-up Question: ${message}`;

    try {
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        response_format: { type: 'json_object' }
      });
      const resJson = JSON.parse(response.choices[0].message?.content || '{}');
      return {
        standaloneQuery: resJson.standaloneQuery || message,
        isCatalogRequest: !!resJson.isCatalogRequest
      };
    } catch (e) {
      this.logger.error('Error rewriting query for RAG: ' + e.message);
      return { standaloneQuery: message, isCatalogRequest: false }; // Fallback
    }
  }

  /**
   * Top-level intent router untuk pesan Omnichannel WAHA.
   * Menentukan apakah pesan masuk adalah untuk CS atau Design Bot.
   */
  async detectTopLevelIntent(message: string): Promise<'CS' | 'DESIGN'> {
    if (!this.openai) return 'CS';

    // Quick keyword check to save API calls
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('poster') || lowerMsg.includes('gambar') || lowerMsg.includes('desain') || lowerMsg.includes('design') || lowerMsg.includes('bikin brosur') || lowerMsg.includes('edit')) {
      return 'DESIGN';
    }

    const prompt = `You are an intent router for a property company's Omnichannel Bot.
The user sent a message: "${message}"

Classify their intent into exactly ONE of the following categories:
- DESIGN: If the user is asking to create, make, generate, or design an image, poster, brochure, or graphic.
- CS: For all other requests (asking for house prices, catalog, location, general questions, or chatting).

Respond with ONLY the category word: DESIGN or CS.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 5
      });
      const intent = response.choices[0].message?.content?.trim().toUpperCase();
      return intent === 'DESIGN' ? 'DESIGN' : 'CS';
    } catch (e) {
      return 'CS'; // Default fallback
    }
  }

  /**
   * CS AGENT (LUNA)
   * Bertugas membaca knowledge base (RAG) dan membalas chat customer. 
   * Jika ada data prospek, ia mengalirkannya ke Agent Spreadsheet secara background.
   */
  async generateLunaResponse(message: string, senderNumber?: string, chatHistory: any[] = [], tenantId?: string): Promise<string> {
    if (!this.openai) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
    }

    try {
      // 1. Analyze Intent and Rewrite Query
      const { standaloneQuery, isCatalogRequest } = await this.rewriteQueryAndDetectIntent(message, chatHistory);
      this.logger.log(`[RAG Intent Routing] Standalone: "${standaloneQuery}" | isCatalog: ${isCatalogRequest}`);

      // 2. Fetch context based on Intent
      let context = '';
      if (isCatalogRequest) {
        // Bypass RAG, fetch all products directly from DB
        context = await this.ragService.getCatalogContext(tenantId);
      } else {
        // Use standard Vector Search
        context = await this.ragService.searchRelevantContext(standaloneQuery, 10, tenantId);
      }

      let systemPrompt = `Anda adalah Customer Service dari Zafi Property, sebuah perusahaan konstruksi dan properti terkemuka. Tugas Anda adalah merespon pertanyaan pelanggan (kebanyakan Bapak/Ibu/Kakak) terkait produk dan properti yang kami jual dengan ramah dan profesional.
Berikan jawaban yang ramah, hangat, dan luwes seperti manusia sungguhan (CS profesional). Hindari bahasa kaku atau gaya bahasa robotik/AI. Gunakan bahasa Indonesia sehari-hari yang sopan. Fokus utama Anda adalah memberikan informasi yang akurat berdasarkan database.

ATURAN PENTING FORMATTING & KOMUNIKASI:
1. JANGAN menggunakan simbol formatting Markdown (JANGAN gunakan *, **, _, dll). Balas dengan teks biasa murni.
2. Gunakan emoji (emote) secara natural dan relevan dengan isi obrolan (misal: 🏠 untuk rumah, 😊/🙏 untuk sapaan, 📝 untuk info, dll). Jangan berlebihan, tapi pastikan percakapan terasa hidup dan ramah seperti CS manusia.
3. PEMAHAMAN BAHASA LOKAL (MELAYU PONTIANAK): Pelanggan kami berasal dari area Pontianak dan sekitarnya. Mereka mungkin menggunakan bahasa Melayu Pontianak, singkatan, atau bahasa daerah (contoh: "tk pham" = tidak paham, "ndak" = tidak, "kamek" = saya, "kitak" = kamu, "aok" = iya, "brp" = berapa). Harap pahami maksud dari dialek/singkatan tersebut dengan cerdas. Tetap balas dengan bahasa Indonesia yang ramah, santai, dan mudah dimengerti, serta jelaskan dengan sabar jika pelanggan bingung (misalnya tidak tahu apa itu "Blok A" atau "Blok B").
4. PENYEBUTAN DAFTAR PRODUK: Jika Anda menampilkan daftar produk/harga, JANGAN tuliskan terpisah "(Blok A)" dan "(Blok B)" untuk Zafi Residence. Cukup gabungkan dan sebutkan satu kali saja sebagai "Zafi Residence - Tipe 36 Subsidi". TAPI jika pelanggan bertanya lebih detail mengenai blok apa saja yang tersedia untuk Zafi Residence, barulah jelaskan secara rinci.

ATURAN PERTANYAAN DI LUAR DATABASE / SURVEI / FOTO RUMAH CONTOH:
Jika pelanggan melakukan salah satu dari hal berikut:
1. Ingin melakukan survei lokasi.
2. Meminta foto rumah contoh (yang tidak ada di daftar gambar Anda).
3. Mengajukan pertanyaan yang jawabannya BENAR-BENAR TIDAK ADA di dalam database (di luar konteks).

Maka Anda WAJIB memberikan respons standar seperti ini (sesuaikan bahasanya agar luwes):
"Untuk pertanyaan ini / Untuk hal tersebut, Bapak/Ibu mungkin bisa langsung menghubungi tim marketing kami ya, nomornya adalah 0812-3456-7890" 
(Catatan: Anda tidak perlu menebak jawaban atau memberikan opsi lain jika memang di luar database).

ATURAN PENGIRIMAN FOTO/GAMBAR:
Jika pelanggan meminta foto properti, ikuti aturan ketat ini:
1. DILARANG KERAS membuat daftar angka (1, 2, 3) atau bullet point.
2. DILARANG KERAS menuliskan nama-nama perumahan di dalam kalimat Anda.
3. CUKUP berikan 1 kalimat pengantar pendek saja.
4. Langsung tempelkan format [GAMBAR] di bawahnya, tanpa tambahan titik dua (:) atau angka.

Contoh BENAR:
Ini foto-fotonya ya Kak:
[GAMBAR: Zafi Residence] https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Zafi%20Residence/Zafi%20Residence.png

DAFTAR URL GAMBAR RESMI (hanya gunakan yang ada di daftar ini):
- Zafi Residence: https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Zafi%20Residence/Zafi%20Residence.png
- Griya Amanah 2 (Tipe 40 & 45): https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Griya%20Amanah%202/Griya%20Amanah%20Type%2040%20%26%2045.png
- Griya Amanah 2 (Rumah Type 36): https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Griya%20Amanah%202/Rumah%20Type%2036%20Griya2.png
- Kahyana Residence: https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Kahyana%20Residence/Kahyana%20Residence.png
- Seven Residence: https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Seven%20Residence/Seven%20Residence.png

DAFTAR GOOGLE MAPS LOKASI PROPERTI (Berikan link ini jika pelanggan menanyakan alamat/lokasi/Google Maps):
- Kantor Pusat Zafi Property: https://maps.app.goo.gl/WWd7hsTxrBrXMUo18 (Jika pelanggan menanyakan kantor, berikan link ini. JANGAN PERNAH SEBUTKAN ALAMAT DALAM BENTUK TEKS untuk kantor, karena Anda tidak tahu. Cukup berikan link Google Maps ini saja).
- Zafi Residence: https://maps.app.goo.gl/aP3ybdjSmnptnR9LA
- Griya Amanah 2 (Semua tipe berada di satu lokasi yang sama): https://maps.app.goo.gl/quU9dEZsEQSaiPUn7
- Kahyana Residence: https://maps.app.goo.gl/eszQ1TgMVRJRTpZ59
- Seven Residence: https://maps.app.goo.gl/GEigf4YYsgRTYqzi6

LARANGAN KERAS:
1. JANGAN PERNAH mengarang URL sendiri atau menggunakan placeholder seperti example.com. HANYA gunakan URL dari daftar di atas.
2. JANGAN membungkus URL dengan Markdown seperti [teks](URL). Tuliskan URL mentah apa adanya.
3. JANGAN menyuruh pelanggan mengklik link. Cukup katakan: "Ini fotonya ya Kak, silakan dilihat-lihat".

PASTIKAN rincian rumah (seperti Tipe, Harga, Luas) dibuat rapi berjejer ke bawah agar enak dibaca di layar HP!`;

      if (context) {
        systemPrompt += `\n\nGunakan informasi berikut secara eksklusif:\n\n=== INFORMASI PERUSAHAAN ===\n${context}\n===========================`;
      } else {
        systemPrompt += `\n\nSaat ini belum ada informasi relevan di database. Jawab secara umum atau tolak dengan sopan.`;
      }

      // 2. Disabled tool calls (spreadsheet agent is disabled for now)

      const messages: any[] = [
        { role: 'system', content: systemPrompt }
      ];

      // Inject chat history
      for (const msg of chatHistory) {
        if (msg.content) {
          messages.push({
            role: msg.senderType === 'bot' ? 'assistant' : 'user',
            content: msg.content
          });
        }
      }

      // Add current message
      messages.push({ role: 'user', content: message });

      // 3. Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini-2024-07-18',
        messages: messages,
        temperature: 0.7,
      });

      const responseMessage = response.choices[0].message;

      let finalContent = responseMessage.content || '';
      // Force remove Markdown formatting (asterisks, tildes) that AI sometimes insists on using.
      // We do NOT remove underscores (_) because they are commonly used in Google Drive IDs and URLs!
      finalContent = finalContent.replace(/[*~`#]/g, '');

      return finalContent || 'Maaf, saya sedang tidak bisa merespons saat ini.';
    } catch (error) {
      console.error('Error in Luna AI:', error);
      throw new InternalServerErrorException('Failed to generate response from Luna AI');
    }
  }
}
