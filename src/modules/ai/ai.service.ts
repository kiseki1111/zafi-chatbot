import { Injectable, InternalServerErrorException, forwardRef, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { RagService } from '../knowledge/rag.service';
import { KnowledgeService } from '../knowledge/knowledge.service';

@Injectable()
export class AiService {
  private openai: OpenAI;
  private logger = new Logger(AiService.name);

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => RagService))
    private ragService: RagService,
    @Inject(forwardRef(() => KnowledgeService))
    private knowledgeService: KnowledgeService,
  ) {

    const openaiApiKey = this.configService.get<string>('CHATGPT_API_KEY') || this.configService.get<string>('OPENAI_API_KEY');
    const openaiBaseUrl = this.configService.get<string>('OPENAI_BASE_URL');

    if (openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: openaiApiKey,
        baseURL: openaiBaseUrl || undefined,
      });
    }
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
   * AGENT SPREADSHEET (DATA ENTRY)
   * Tugasnya murni membaca data mentah dari CS, memformat ke 11 kolom, dan memasukkan ke Google Sheets.
   */
  async generateSpreadsheetAgentResponse(dataMentah: string, senderNumber?: string): Promise<void> {
    if (!this.openai) {
      this.logger?.warn('OPENAI_API_KEY is not configured, cannot run Spreadsheet Agent');
      return;
    }

    try {
      const systemPrompt = `Anda adalah Agent Data Entry (Agent Spreadsheet). Tugas Anda murni membaca data pelanggan mentah yang di-forward oleh CS Agent, kemudian mengekstrak 11 parameter spesifik untuk dimasukkan ke dalam database (Google Sheets) melalui tool yang tersedia.
Pastikan untuk mengisi data dengan format yang tepat, jika ada informasi yang tidak tersedia (seperti nominal DP, tanggal booking, dll), isi dengan tanda strip (-) atau "Belum ada".`;

      const tools: any[] = [
        {
          type: 'function',
          function: {
            name: 'catat_customer_baru',
            description: 'Eksekusi penyimpanan data pelanggan baru ke Google Sheets.',
            parameters: {
              type: 'object',
              properties: {
                nama: { type: 'string', description: 'Nama lengkap pelanggan' },
                telepon: { type: 'string', description: 'Nomor telepon pelanggan' },
                tahap_pipeline: { type: 'string', description: 'Pilih salah satu: Lead, Prospek, Negosiasi, Customer. Nilai default adalah Lead.', enum: ['Lead', 'Prospek', 'Negosiasi', 'Customer'] },
                tags: { type: 'string', description: 'Kategori pelanggan, pisahkan dengan koma. Contoh: VIP, Cash, KPR, Investor, Sewa' },
                properti_diminati: { type: 'string', description: 'Tipe, unit, atau produk properti yang diminati pelanggan' },
                tgl_booking: { type: 'string', description: 'Tanggal booking (jika ada)' },
                progress_dp: { type: 'string', description: 'Nominal DP yang dibayarkan (contoh: 20jt/50jt)' },
                status_dp: { type: 'string', description: 'Status DP: Lunas, Sebagian, atau kosong' },
                pic: { type: 'string', description: 'Nama agen yang menangani (jika disebutkan)' },
                catatan: { type: 'string', description: 'Catatan tambahan atau ringkasan obrolan' },
              },
              required: [], // Tidak ada yang wajib agar bisa mencatat data parsial (sebagian)
            },
          },
        }
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini-2024-07-18',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: dataMentah }
        ],
        temperature: 0,
        tools: tools,
        tool_choice: { type: 'function', function: { name: 'catat_customer_baru' } }, // Force AI to call the tool
      });

      const responseMessage = response.choices[0].message;

      if (responseMessage.tool_calls) {
        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.type === 'function' && toolCall.function.name === 'catat_customer_baru') {
            const args = JSON.parse(toolCall.function.arguments);
            const cleanPhone = senderNumber ? senderNumber.split('@')[0] : (args.telepon || 'Belum diketahui');

            console.log('\n=== [AGENT SPREADSHEET LOG] ===');
            console.log(`Nama Konsumen     : ${args.nama || 'Belum diketahui'}`);
            console.log(`No. Telepon       : ${cleanPhone}`);
            console.log(`Tahap Pipeline    : ${args.tahap_pipeline || 'Lead'}`);
            console.log(`Tags              : ${args.tags || '-'}`);
            console.log(`Proyek/Unit       : ${args.properti_diminati || 'Belum ada'}`);
            console.log(`Tgl Booking       : ${args.tgl_booking || '-'}`);
            console.log(`Progress DP       : ${args.progress_dp || '-'}`);
            console.log(`Status Pembayaran : ${args.status_dp || '-'}`);
            console.log(`PIC               : ${args.pic || '-'}`);
            console.log(`Riwayat & Catatan : ${args.catatan || '-'}`);
            console.log('===============================\n');

            // Simpan ke Google Sheets
            await this.knowledgeService.appendCustomerToSheet(
              args.nama || 'Belum diketahui',
              cleanPhone,
              args.tahap_pipeline || 'Lead',
              args.tags || '',
              args.properti_diminati || 'Belum ada',
              args.tgl_booking || '-',
              args.progress_dp || '-',
              args.status_dp || '-',
              args.pic || '-',
              args.catatan || 'Diinput oleh AI (Agent Spreadsheet)'
            );
            
            console.log(`[Agent Spreadsheet] Berhasil mengekstrak dan menyimpan data prospek: ${args.nama || 'Tanpa Nama'}`);
          }
        }
      }
    } catch (error) {
      console.error('[Agent Spreadsheet] Error:', error);
    }
  }

  /**
   * CS AGENT (LUNA)
   * Bertugas membaca knowledge base (RAG) dan membalas chat customer. 
   * Jika ada data prospek, ia mengalirkannya ke Agent Spreadsheet secara background.
   */
  async generateLunaResponse(message: string, senderNumber?: string, chatHistory: any[] = []): Promise<string> {
    if (!this.openai) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
    }

    try {
      // 1. Fetch relevant context from Spreadsheet Knowledge Base using RAG (READ-ONLY)
      const context = await this.ragService.searchRelevantContext(message);

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
Jika pelanggan meminta foto properti, Anda WAJIB menempelkan 'Link Gambar' secara utuh di paling akhir pesan Anda.
Jika di database terdapat beberapa link gambar, Anda harus mengklasifikasikannya: link yang TIDAK memiliki nama/label di depannya adalah foto wujud rumah utama (Tampak Depan). Sedangkan link yang memiliki label adalah detail spesifik (seperti Dapur, Layout, dll).
Jika pelanggan HANYA meminta gambar spesifik (misal: "lihat dapurnya dong"), maka Anda HANYA boleh mengirimkan link yang relevan saja (link Dapur). Jika pelanggan meminta "foto rumahnya", kirimkan link foto utama (yang tidak berlabel) atau kirimkan semuanya jika pelanggan ingin melihat selengkapnya.
SANGAT PENTING: JANGAN PERNAH menyuruh pelanggan "mengklik link" atau berkata "Berikut adalah link gambarnya". Karena sistem kami akan mengubah link itu menjadi gambar asli. Cukup katakan kalimat pengantar yang natural seperti: "Ini fotonya ya Kak, silakan dilihat-lihat" atau "Berikut foto rumahnya Pak/Bu".

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
