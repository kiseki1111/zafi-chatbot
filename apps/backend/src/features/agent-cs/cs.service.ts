import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  IncomingMessage,
  AgentResponse,
} from '../../core/omnichannel/interfaces/incoming-message.interface';
import { AgentSharedService } from '../../core/agent-shared/agent-shared.service';

@Injectable()
export class CsService {
  private readonly logger = new Logger(CsService.name);

  // ponytail: default prompt template — stored here as fallback when tenant has no custom prompt in DB.
  // Variables use {varName} syntax, replaced at runtime.
  private readonly DEFAULT_SYSTEM_PROMPT = `Anda adalah Customer Service bernama {agentName} dari toko {tenantName}. Tugas Anda adalah melayani pelanggan terkait produk dan layanan kami.
Gaya bahasa Anda: {botTone}.
Waktu saat ini: {currentTime}. Jam Operasional Toko: {operatingHours}. Alamat Toko: {storeAddress}.
Jika pelanggan menghubungi di luar jam operasional, infokan dengan ramah bahwa toko sedang tutup atau admin sedang istirahat dan akan segera dibalas saat jam buka.
Berikan jawaban yang natural seperti CS manusia sungguhan. Jangan menggunakan bahasa kaku atau gaya bahasa AI.

ATURAN WAJIB KOMUNIKASI:
1. DILARANG menggunakan simbol Markdown (*, **, _, #). Balas dengan teks murni pada property "text".
2. Gunakan emoji secukupnya agar ramah (maksimal 2 emoji per pesan).
3. Pahami maksud bahasa daerah atau singkatan dari pelanggan, tetapi tetap membalas dengan sopan sesuai gaya bahasa Anda.

ATURAN MENYEBUTKAN PRODUK / KATALOG:
DILARANG KERAS menggunakan format list/bullet point atau penomoran.
Anda WAJIB merangkai informasi produk menjadi kalimat narasi yang mengalir.
Jika pelanggan menanyakan daftar produk secara umum, sebutkan MAKSIMAL 5 produk pilihan, dan tanyakan spesifik apa yang mereka cari. Jangan pernah menyebutkan semua barang panjang lebar.
Contoh: "Untuk Produk A, harganya di Rp 50.000 ya Kak. Kami juga ada Produk B. Kakak tertarik yang mana?"

ATURAN MENJAWAB KETERSEDIAAN UNIT / PLANSITE:
1. Anda HANYA BISA MEMBACA data ketersediaan dari database di atas (Read-Only). Anda TIDAK BISA mengubah, memesan, atau memblokir unit secara langsung di sistem.
2. Jika pelanggan bertanya tentang ketersediaan rumah, nomor blok, tipe rumah, atau harga unit, jelaskan dengan ramah dan ringkas unit mana yang berstatus TERSEDIA berdasarkan data di atas.
3. JIKA PELANGGAN INGIN SURVEY LOKASI, BOOKING, ATAU KONSULTASI LEBIH LANJUT:
   Anda WAJIB mengarahkan mereka untuk langsung menghubungi tim Sales / Marketing resmi kami {fallbackContact} agar jadwal survey atau pemesanan unit dapat segera diproses.

ATURAN PENGIRIMAN GAMBAR:
Jika di dalam database terdapat link gambar untuk produk tersebut, JANGAN memasukannya ke dalam text balasan.
PISAHKAN link URL gambar tersebut ke dalam array "images" pada format JSON. Jangan pernah gunakan example.com.

ATURAN FALLBACK (PERTANYAAN DI LUAR DATABASE):
JANGAN NGARANG. Jika informasi yang ditanyakan TIDAK ADA di DATABASE TOKO, balas dengan menolak secara halus menggunakan kalimat ini:
"Maaf Kak, untuk info detail tersebut saya kurang tahu. Kakak bisa chat {fallbackContact} ya, agar bisa dibantu lebih lanjut!"

WAJIB MERESPON DALAM FORMAT JSON BERIKUT:
{
  "text": "Balasan teks untuk pelanggan",
  "images": [
    { "url": "https://url-gambar...", "caption": "Nama Produk" }
  ],
  "order": {
    "customerName": "Nama Pelanggan",
    "items": "Nama barang x Jumlah",
    "quantity": 1,
    "totalPrice": 50000,
    "notes": "Catatan tambahan misal waktu ambil"
  } // opsional, HANYA DISERTAKAN jika pelanggan MEMFIXKAN pesanan
}`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentSharedService: AgentSharedService,
  ) {}

  private resolvePrompt(
    template: string,
    vars: Record<string, string>,
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replaceAll(`{${key}}`, value);
    }
    return result;
  }

  async handleMessage(
    message: IncomingMessage,
    onChunk?: (chunk: string) => void,
  ): Promise<AgentResponse> {
    const {
      senderId,
      sessionName,
      mediaUrls,
      tenantId: messageTenantId,
    } = message;
    let text = message.text || '';
    const effectiveSessionName = sessionName || 'unknown-session';

    // S-CS2: Handle image by converting to text via Vision AI
    if (mediaUrls && mediaUrls.length > 0) {
      this.logger.log(`[CS-BOT] Menganalisis ${mediaUrls.length} gambar...`);
      const imgDesc = await this.agentSharedService.analyzeImage(
        mediaUrls[0],
        'Deskripsikan barang apa ini. Sebutkan merk, model, dan warna jika terlihat jelas.',
      );
      text += `\n[Gambar dikirim oleh pelanggan: ${imgDesc}]`;
    }

    // 1. Ambil History menggunakan utilitas terpusat
    const recentMessages = await this.agentSharedService.getRecentContext(
      senderId,
      effectiveSessionName,
      8,
    );

    // SANITASI: Hapus pesan halusinasi example.com
    const cleanHistory = recentMessages.filter((msg) => {
      if (
        msg.senderType === 'bot' &&
        msg.content &&
        msg.content.includes('example.com')
      ) {
        return false;
      }
      return true;
    });

    const chatHistoryText = cleanHistory
      .map((m) => `${m.senderType === 'bot' ? 'CS' : 'Customer'}: ${m.content}`)
      .join('\n');

    const instance = await this.prisma.whatsappInstance.findUnique({
      where: { instanceName: effectiveSessionName },
      include: { tenant: true },
    });
    const tenantId = messageTenantId || instance?.tenantId || '';

    if (!tenantId) {
      return {
        text: 'Maaf, nomor bot ini belum terhubung dengan toko manapun.',
        images: [],
      };
    }

    // 2. Rewrite Query & Detect Catalog Intent (Optional, for now just use standard RAG)
    let context = await this.agentSharedService.retrieveRelevantKnowledge(
      text,
      tenantId,
    );

    // PLANSITE: Real-time unit availability context
    const availabilityContext =
      await this.agentSharedService.getAvailabilityContext(tenantId);
    if (availabilityContext) {
      context += `\n\n=== DATA PLANSITE & KETERSEDIAAN UNIT PERUMAHAN (REAL-TIME DATABASE) ===\n${availabilityContext}\n===================================================================`;
    }

    // S-CS3: Real-time stock check bypass
    const lowerText = text.toLowerCase();
    if (
      lowerText.includes('stok') ||
      lowerText.includes('sisa') ||
      lowerText.includes('masih ada') ||
      lowerText.includes('ready')
    ) {
      const products = await this.prisma.product.findMany({
        where: { tenantId },
        take: 20,
      });
      const stockInfo = products
        .map((p) => `- ${p.name}: Sisa stok ${p.stock}`)
        .join('\n');
      context += `\n\n=== INFO STOK REAL-TIME SAAT INI (PENTING) ===\n${stockInfo}`;
    }

    // Fetch Tenant Config
    let tenantConfig: any = null;
    if (tenantId) {
      tenantConfig = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
    }

    const agentName = tenantConfig?.agentName || 'Luna';
    const botTone = tenantConfig?.agentTone || 'ramah dan profesional';
    const tenantName = tenantConfig?.name || 'Perusahaan Kami';

    const fallbackContact = tenantConfig?.phone
      ? `di nomor WA: ${tenantConfig.phone}`
      : 'langsung ke tim marketing kami';
    const operatingHours = tenantConfig?.operatingHours || 'Setiap Hari';
    const storeAddress = tenantConfig?.address || 'Hanya Online';
    const currentTime = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
    });

    const promptTemplate =
      tenantConfig?.systemPrompt || this.DEFAULT_SYSTEM_PROMPT;
    let systemPrompt = this.resolvePrompt(promptTemplate, {
      agentName,
      tenantName,
      botTone,
      currentTime,
      operatingHours,
      storeAddress,
      fallbackContact,
    });

    if (context) {
      systemPrompt += `\n\n=== DATABASE TOKO (GUNAKAN INFO INI SAJA) ===\n${context}\n=============================================`;
    } else {
      systemPrompt += `\n\n=== DATABASE TOKO KOSONG ===\nSaat ini belum ada informasi produk di database. Silakan gunakan Aturan Fallback (arahkan ke tim marketing).`;
    }

    const fullPrompt = `Riwayat Chat Terakhir (PENTING: INI HANYA UNTUK KONTEKS PERCAKAPAN, JANGAN JADIKAN REFERENSI FAKTA / HARGA):
${chatHistoryText ? chatHistoryText : '(Belum ada riwayat)'}

Pesan Masuk Saat Ini dari Customer:
"${text}"

Balas pesan saat ini berdasarkan konteks dan database di atas menggunakan format JSON yang diminta.`;

    try {
      let rawResponse = '';
      if (onChunk) {
        rawResponse = await this.agentSharedService.callLLMStream(
          fullPrompt,
          systemPrompt,
          true,
          onChunk,
        );
      } else {
        rawResponse = await this.agentSharedService.callLLM(
          fullPrompt,
          systemPrompt,
          true,
        );
      }

      const parsed = JSON.parse(rawResponse);

      let aiText = parsed.text || '';
      aiText = aiText.replace(/[*~`]/g, '');

      const aiImages = Array.isArray(parsed.images)
        ? parsed.images.filter(
            (img: any) => img && img.url && !img.url.includes('example.com'),
          )
        : [];
      const order = parsed.order || null;
      return {
        text: aiText,
        images: aiImages,
        order: order,
      };
    } catch (e) {
      this.logger.error(`Error parsing LLM JSON: ${e.message}`);
      return {
        text: 'Maaf, sistem sedang sibuk. Silakan coba lagi nanti.',
        images: [],
      };
    }
  }
}
