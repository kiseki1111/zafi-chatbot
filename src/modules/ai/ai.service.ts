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
   * Helper untuk Multi-turn Context: 
   * Jika ada chat history, rumuskan ulang pertanyaan user (message) menjadi Standalone Question
   * agar Vector Search (RAG) tetap bisa mencari konteks spesifik yang mungkin terlewat di pesan terakhir.
   */
  private async rewriteQueryForRag(message: string, chatHistory: any[]): Promise<string> {
    if (!chatHistory || chatHistory.length === 0) return message;

    // Ambil 4 pesan terakhir saja agar tidak terlalu panjang
    const recentHistory = chatHistory.slice(-4).map(h => `${h.senderType === 'bot' ? 'CS' : 'User'}: ${h.content}`).join('\n');
    
    const prompt = `Given the following conversation history and a follow-up question, rephrase the follow-up question to be a standalone question that captures all relevant context from the history. 
Do NOT answer the question, just return the standalone question. If the follow-up question is already standalone or changes the topic entirely, return it as is.

Conversation History:
${recentHistory}

Follow-up Question: ${message}

Standalone Question:`;

    try {
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0, // Deterministic
      });
      return response.choices[0].message?.content?.trim() || message;
    } catch (e) {
      this.logger.error('Error rewriting query for RAG: ' + e.message);
      return message; // Fallback to original message
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
      // 1. Rewrite query if there is context
      const standaloneQuery = await this.rewriteQueryForRag(message, chatHistory);
      this.logger.log(`[RAG Rewrite] Original: "${message}" -> Standalone: "${standaloneQuery}"`);

      // 2. Fetch relevant context from Spreadsheet Knowledge Base using RAG (READ-ONLY)
      // Note: ragService.searchRelevantContext now uses topK=5
      const context = await this.ragService.searchRelevantContext(standaloneQuery, 5, tenantId);

      let systemPrompt = `Anda adalah Luna, CS Agent sebuah perusahaan konstruksi dan properti. Tugas Anda adalah merespon pertanyaan pelanggan (kebanyakan Bapak/Ibu/Kakak) terkait produk dan properti yang kami jual. 
Berikan jawaban yang ramah, hangat, dan luwes seperti manusia sungguhan (CS profesional). Hindari bahasa kaku atau gaya bahasa robotik/AI. Gunakan bahasa Indonesia sehari-hari yang sopan. Fokus utama Anda adalah memberikan informasi yang akurat berdasarkan database.

ATURAN PENTING FORMATTING:
JANGAN menggunakan simbol formatting Markdown (JANGAN gunakan *, **, _, dll). Balas dengan teks biasa murni.

ATURAN PENTING KNOWLEDGE BASE (READ-ONLY):
Anda HANYA boleh menjawab pertanyaan berdasarkan informasi dari database (Google Sheets) yang diberikan. Jika pengguna menanyakan hal di luar produk/database, TOLAK dengan sopan dan halus.
Jika ada pertanyaan umum di luar konteks database, jawab dengan singkat dan natural, jangan terkesan sok tahu.
Jika pelanggan menanyakan diskon atau promo yang tidak ada di database, beri tahu dengan ramah bahwa saat ini belum ada promo untuk tipe tersebut.

ALUR SURVEI DAN KONTAK MARKETING:
Jika pelanggan ingin survei lokasi atau meminta kontak marketing, berikan 2 opsi dengan santai:
1. Berikan kontak tim marketing (jika ada di database).
2. Tawarkan agar tim marketing kami yang menghubungi mereka langsung.

ATURAN PENGIRIMAN FOTO/GAMBAR:
Jika pelanggan meminta foto properti, WAJIB tempelkan URL gambar secara UTUH (copy-paste, tanpa diubah sedikitpun) di paling AKHIR pesan Anda. Anda BEBAS mengirim lebih dari 1 gambar jika produk tersebut memiliki beberapa tipe (misalnya Griya Amanah 2 memiliki 2 foto). Tempelkan URL-URL tersebut berbaris ke bawah.

DAFTAR URL GAMBAR RESMI (hanya gunakan yang ada di daftar ini):
- Zafi Residence: https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Zafi%20Residence/Zafi%20Residence.png
- Griya Amanah 2 (Tipe 40 & 45): https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Griya%20Amanah%202/Griya%20Amanah%20Type%2040%20%26%2045.png
- Griya Amanah 2 (Rumah Type 36): https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Griya%20Amanah%202/Rumah%20Type%2036%20Griya2.png
- Kahyana Residence: https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Kahyana%20Residence/Kahyana%20Residence.png
- Seven Residence: https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Seven%20Residence/Seven%20Residence.png

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
