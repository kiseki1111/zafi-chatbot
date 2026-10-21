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
1. DILARANG menggunakan format Markdown tebal/miring (*, **, _, #). Balas dengan teks murni pada property "text". Pindah baris (enter / newline) dan simbol strip (-) atau bullet (•) sangat dianjurkan untuk merapikan rincian.
2. Gunakan emoji secukupnya agar ramah (maksimal 2 emoji per pesan).
3. Pahami maksud bahasa daerah atau singkatan dari pelanggan, tetapi tetap membalas dengan sopan sesuai gaya bahasa Anda.

ATURAN MENYEBUTKAN PRODUK & SPESIFIKASI:
1. Untuk pembuka obrolan dan rekomendasi produk umum, gunakan kalimat narasi yang ramah dan mengalir.
2. KHUSUS SPESIFIKASI UNIT/RUMAH, FASILITAS, ATAU PERSYARATAN: WAJIB disajikan per poin ke bawah (baris baru menggunakan tanda strip '-' atau bullet '•') agar rapi, terstruktur, dan nyaman dibaca pelanggan di WhatsApp, jangan ditumpuk dalam satu paragraf panjang!
   Contoh format:
   Spesifikasi unit:
   - Tanah 7x22 m
   - 2 Kamar Tidur
   - 1 Kamar Mandi
   - Listrik 1300 Watt
3. Jika pelanggan menanyakan daftar produk secara umum, sebutkan MAKSIMAL 5 produk pilihan, dan tanyakan spesifik apa yang mereka cari. Jangan pernah menyebutkan semua barang panjang lebar.

ATURAN MENJAWAB KETERSEDIAAN UNIT / PLANSITE:
1. Anda HANYA BISA MEMBACA data ketersediaan dari database di atas (Read-Only). Anda TIDAK BISA mengubah, memesan, atau memblokir unit secara langsung di sistem.
2. Jika pelanggan bertanya tentang ketersediaan rumah, nomor blok, tipe rumah, atau harga unit, jelaskan dengan ramah dan ringkas unit mana yang berstatus TERSEDIA berdasarkan data di atas.
3. JIKA PELANGGAN INGIN SURVEY LOKASI, BOOKING, ATAU KONSULTASI LEBIH LANJUT:
   Anda WAJIB mengarahkan mereka untuk langsung menghubungi tim Sales / Marketing resmi kami {fallbackContact} agar jadwal survey atau pemesanan unit dapat segera diproses.

ATURAN PENGIRIMAN GAMBAR & VIDEO (STRICT):
1. Array "videos" dan "images" HANYA untuk FILE MEDIA LANGSUNG yang tersimpan di sistem/database (format path /uploads/... atau file langsung berakhiran .mp4, .jpg, .png).
2. TAUTAN MEDIA SOSIAL / WEB (seperti Instagram Reel, YouTube, TikTok, Facebook): DILARANG dimasukkan ke array "videos" atau "images"! Tautan sosial media/web WAJIB disertakan langsung di dalam teks balasan ("text") agar WhatsApp otomatis menampilkan rich preview tautan yang bisa diklik.
3. Pengiriman FILE VIDEO di array "videos" HANYA BOLEH jika pelanggan SECARA EKSPLISIT DAN JELAS MEMINTA video dan file videonya memang tersedia di database. Jika tidak diminta atau tidak ada file video, array "videos" WAJIB KOSONG [].
4. Jika pelanggan meminta foto/gambar atau brosur perusahaan (termasuk dari daftar [MEDIA_PERUSAHAAN] atau siteplan), masukkan file ke array "images" dengan format { "url": "URL_DARI_DATABASE", "caption": "Nama Media" }.
5. Jangan pernah mengarang URL (dilarang menggunakan example.com atau link fiktif).
6. DILARANG MENGAMBIL LINK DARI RIWAYAT CHAT LAMA: Semua media (gambar/video/brosur) yang Anda kirimkan WAJIB bersumber dari DATABASE TOKO atau DATA PLANSITE yang aktif saat ini. DILARANG KERAS mengulangi atau mengambil kembali tautan media dari riwayat percakapan lama jika media tersebut sudah tidak tercantum di DATABASE TOKO saat ini (karena sudah dihapus oleh pemilik toko). Jika tidak ada di DATABASE TOKO saat ini, berarti media tersebut SUDAH TIDAK TERSEDIA.

ATURAN FALLBACK (PERTANYAAN DI LUAR DATABASE):
JANGAN NGARANG. Jika informasi yang ditanyakan TIDAK ADA di DATABASE TOKO, balas dengan menolak secara halus menggunakan kalimat ini:
"Maaf Kak, untuk info detail tersebut saya kurang tahu. Kakak bisa chat {fallbackContact} ya, agar bisa dibantu lebih lanjut!"

ATURAN IDENTIFIKASI PROSPEK (LEAD PROFILING BERTAHAP):
Pelanggan biasanya mengobrol santai dan informasi mereka terungkap bertahap di sepanjang percakapan.
Anda WAJIB menganalisis SELURUH riwayat chat + pesan saat ini untuk mengekstrak data prospek pada property "lead".

Aturan Akurasi Ekstraksi:
1. customerName:
   - Jika pelanggan pernah menyebutkan nama mereka di percakapan (contoh: "saya Budi", "nama saya Hendra Wijaya", "dengan Ibu Rini", "panggil saya Joko"), ekstrak nama tersebut.
   - JIKA PELANGGAN BELUM MENYEBUTKAN NAMA di sepanjang percakapan, ISI "Anonim".
   - DILARANG menggunakan nama Anda ('{agentName}') atau nomor telepon.
2. perumahan:
   - Nama cluster/perumahan dari database yang diminati/dibahas pelanggan (contoh: 'Griya Amanah 2', 'Zafi Residence', 'Kahyana Residence').
   - Jika sudah pernah dibahas di riwayat pesan sebelumnya, TETAP PERTAHANKAN nama perumahan tersebut meskipun pesan terbaru sedang membahas hal lain. Jika belum dibahas sama sekali, isi null.
3. tipeUnit:
   - Tipe unit yang diminati (contoh: 'Tipe 36', 'Tipe 40', 'Tipe 45'). Pertahankan dari riwayat jika sudah pernah ditentukan. Jika belum ada, isi null.
4. hargaUnit:
   - Angka nominal rupiah harga unit yang sedang dibahas berdasarkan database (contoh: 192800000, 295000000). Jika belum ada harga pasti, isi null.
5. status (Fase Prospek Saat Ini):
   - 'Follow-Up': Customer masih bertanya-tanya santai, konsultasi lokasi, minta brosur, atau cek perbandingan tipe rumah.
   - 'SLIK': Customer mulai membahas kelayakan finansial, syarat pengajuan KPR, BI Checking / SLIK OJK, slip gaji, kemampuan angsuran, atau tenor cicilan bank.
   - 'Survey': Customer menyatakan ingin cek fisik ke lapangan, tanya jadwal lihat unit, minta diantar marketing ke perumahan, atau atur janji survey.
   - 'Booking': Customer ingin mengunci kavling/nomor unit tertentu, menanyakan nomor rekening transfer DP/tanda jadi, atau menyatakan fix pesan unit.
   - 'Closing': Customer sudah mengonfirmasi transfer pembayaran DP / lunas / tanda tangan akad jual beli.
   - 'Batal': Customer menyatakan batal, tidak jadi ambil, atau merasa tidak cocok.
6. notes:
   - Rangkuman padat 1-2 kalimat berisi poin-poin penting kebutuhan pelanggan yang terungkap selama ini (pekerjaan/penghasilan, preferensi cara bayar KPR/tempo, kondisi keluarga, kendala SLIK, atau tanggal rencana survey).

Format property "lead":
{
  "customerName": "Anonim", // atau nama asli jika sudah disebutkan
  "perumahan": "Griya Amanah 2",
  "tipeUnit": "Tipe 40",
  "hargaUnit": 295000000,
  "status": "Follow-Up",
  "notes": "Rangkuman padat preferensi dan kebutuhan customer"
}

WAJIB MERESPON DALAM FORMAT JSON BERIKUT:
{
  "text": "Balasan teks untuk pelanggan",
  "images": [
    { "url": "https://url-gambar...", "caption": "Nama Produk" }
  ],
  "videos": [
    { "url": "https://url-video...", "caption": "Video Produk" }
  ],
  "order": {
    "customerName": "Nama Pelanggan",
    "items": "Nama barang x Jumlah",
    "quantity": 1,
    "totalPrice": 50000,
    "notes": "Catatan tambahan misal waktu ambil"
  }, // opsional, HANYA DISERTAKAN jika pelanggan MEMFIXKAN pesanan
  "lead": {
    "customerName": "Nama Pelanggan",
    "perumahan": "Nama Perumahan",
    "tipeUnit": "Tipe 36",
    "hargaUnit": 192800000,
    "status": "Follow-Up",
    "notes": "Ringkasan ringkas preferensi/kondisi prospek"
  } // opsional, sertakan jika ada info prospek yang terdeteksi
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

  async buildSystemPrompt(tenantId: string): Promise<string> {
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

    if (
      tenantConfig?.systemPrompt &&
      !tenantConfig.systemPrompt.includes('{botTone}') &&
      botTone
    ) {
      systemPrompt += `\n\n[GAYA BAHASA & NADA BICARA CS]:\n${botTone}`;
    }

    return systemPrompt;
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
      this.logger.log(`[CS-BOT] Menganalisis ${mediaUrls.length} gambar via Vision AI...`);
      const imgDesc = await this.agentSharedService.analyzeImage(mediaUrls[0]);
      if (imgDesc) {
        text += `\n[Informasi Visual Gambar dari Pelanggan: ${imgDesc}]`;
      }
    }

    // S-CS3: Handle voice note (audio) by converting to text via OpenRouter STT
    if (message.audioUrl) {
      this.logger.log(`[CS-BOT] Mentranskripsi voice note via OpenRouter STT...`);
      const transcript = await this.agentSharedService.transcribeAudio(message.audioUrl);
      if (transcript) {
        text = text && !text.includes('[Pelanggan mengirimkan pesan suara')
          ? `${text}\n[Pesan Suara Pelanggan: "${transcript}"]`
          : `[Pesan Suara Pelanggan: "${transcript}"]`;
      }
    }

    const instance = await this.prisma.whatsappInstance.findUnique({
      where: { instanceName: effectiveSessionName },
      include: { tenant: true },
    });
    const tenantId = messageTenantId || instance?.tenantId || '';

    if (!tenantId) {
      return {
        text: 'Maaf, nomor bot ini belum terhubung dengan toko manapun.',
        images: [],
        videos: [],
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

    // HYBRID DUAL-CONTEXT: Katalog produk aktif selalu disertakan ke konteks
    // agar bot tidak buta produk saat pelanggan menanyakan daftar barang, rekomendasi, maupun stok
    const products = await this.prisma.product
      .findMany({
        where: { tenantId },
        take: 30,
      })
      .catch(() => []);

    if (products && products.length > 0) {
      const stockInfo = products
        .map(
          (p) =>
            `- ${p.name}: Harga Rp ${Number(p.price || 0).toLocaleString('id-ID')} [Sisa stok: ${p.stock}]`,
        )
        .join('\n');
      context += `\n\n=== INFO PRODUK & STOK REAL-TIME SAAT INI (PENTING) ===\n${stockInfo}`;
    }

    const activeKnowledgeSource = `${context || ''}\n${availabilityContext || ''}`;

    // 1. Ambil History percakapan (8 pesan agar hemat token & respons AI jauh lebih cepat)
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

    const sanitizeHistoryContent = (content: string): string => {
      if (!content) return '';
      // Netralkan tautan media sosial / video lama yang sudah tidak ada di database toko aktif saat ini
      // agar AI tidak mengulangi atau memunculkan link yang sudah dihapus pemilik toko
      return content.replace(
        /https?:\/\/(www\.)?(instagram\.com|instagr\.am|tiktok\.com|youtube\.com|youtu\.be|facebook\.com|fb\.watch)\/[^\s]+/gi,
        (url) => {
          const cleanUrl = url.split('?')[0];
          if (!activeKnowledgeSource.includes(url) && !activeKnowledgeSource.includes(cleanUrl)) {
            return '[tautan media sebelumnya telah dihapus dari database]';
          }
          return url;
        },
      );
    };

    const chatHistoryText = cleanHistory
      .map(
        (m) =>
          `${m.senderType === 'bot' ? 'CS' : 'Customer'}: ${sanitizeHistoryContent(m.content)}`,
      )
      .join('\n');

    let systemPrompt = await this.buildSystemPrompt(tenantId);

    if (context) {
      systemPrompt += `\n\n=== DATABASE TOKO (GUNAKAN INFO INI SAJA) ===\n${context}\n=============================================`;
    } else {
      systemPrompt += `\n\n=== DATABASE TOKO KOSONG ===\nSaat ini belum ada informasi produk di database. Silakan gunakan Aturan Fallback (arahkan ke tim marketing).`;
    }

    const fullPrompt = `Riwayat Chat Terakhir (PENTING: HANYA UNTUK MEMAHAMI ALUR PERCAKAPAN. DILARANG MENGAMBIL FAKTA/HARGA/LINK DARI SINI):
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

      const isSocialOrWebLink = (url: string): boolean => {
        if (!url) return false;
        const lower = url.toLowerCase();
        if (
          lower.includes('instagram.com') ||
          lower.includes('instagr.am') ||
          lower.includes('tiktok.com') ||
          lower.includes('youtube.com') ||
          lower.includes('youtu.be') ||
          lower.includes('facebook.com') ||
          lower.includes('fb.watch')
        ) {
          return true;
        }
        const hasVideoExt = /\.(mp4|mov|avi|mkv|webm|m4v)($|\?)/i.test(lower);
        const isLocalUpload = lower.startsWith('/uploads/') || lower.includes('/uploads/');
        return !hasVideoExt && !isLocalUpload;
      };

      const isDirectImageUrl = (url: string): boolean => {
        if (!url) return false;
        const lower = url.toLowerCase();
        if (
          lower.includes('instagram.com') ||
          lower.includes('instagr.am') ||
          lower.includes('tiktok.com') ||
          lower.includes('youtube.com') ||
          lower.includes('youtu.be') ||
          lower.includes('facebook.com')
        ) {
          return false;
        }
        return (
          lower.startsWith('/uploads/') ||
          lower.includes('/uploads/') ||
          /\.(jpg|jpeg|png|webp|gif|bmp)($|\?)/i.test(lower)
        );
      };

      // Verifikasi apakah URL yang di-output AI benar-benar ada di database pengetahuan aktif
      // (mencegah AI mengambil link usang/dihapus dari ingatan percakapan)
      const isKnownInActiveDatabase = (url: string): boolean => {
        if (!url) return false;
        const cleanUrl = url.split('?')[0];
        return (
          activeKnowledgeSource.includes(url) ||
          activeKnowledgeSource.includes(cleanUrl) ||
          (url.includes('/uploads/') && activeKnowledgeSource.includes(url.split('/uploads/')[1]))
        );
      };

      const aiImages: { url: string; caption: string }[] = [];
      if (Array.isArray(parsed.images)) {
        for (const img of parsed.images) {
          if (!img || !img.url || img.url.includes('example.com')) continue;
          if (!isKnownInActiveDatabase(img.url)) {
            this.logger.warn(
              `[CS-BOT] Menolak image URL '${img.url}' karena tidak ditemukan di database pengetahuan aktif.`,
            );
            continue;
          }
          if (isDirectImageUrl(img.url)) {
            aiImages.push(img);
          } else if (!aiText.includes(img.url)) {
            aiText += `\n\n${img.caption ? `${img.caption}: ` : ''}${img.url}`;
          }
        }
      }

      // Strict guard: hanya sertakan video jika pesan user secara eksplisit meminta video
      const userAskedVideo = /\b(video|vidio|rekaman|virtual tour|vt)\b/i.test(text);
      const aiVideos: { url: string; caption: string }[] = [];
      const extractedWebVideos: { url: string; caption: string }[] = [];

      if (userAskedVideo && Array.isArray(parsed.videos)) {
        for (const vid of parsed.videos) {
          if (!vid || !vid.url || vid.url.includes('example.com')) continue;
          if (!isKnownInActiveDatabase(vid.url)) {
            this.logger.warn(
              `[CS-BOT] Menolak video URL '${vid.url}' karena tidak ditemukan di database pengetahuan aktif (link sudah dihapus dari sistem).`,
            );
            continue;
          }
          if (isSocialOrWebLink(vid.url)) {
            extractedWebVideos.push(vid);
          } else {
            aiVideos.push(vid);
          }
        }
      }

      // Jika ada video yang berupa tautan web/sosial media (seperti IG Reel atau YouTube),
      // sertakan ke dalam teks balasan agar WhatsApp memunculkan rich link preview,
      // bukan diunduh sebagai file biner MP4 yang rusak/kosong.
      if (extractedWebVideos.length > 0) {
        for (const linkItem of extractedWebVideos) {
          if (!aiText.includes(linkItem.url)) {
            const label = linkItem.caption ? `${linkItem.caption}:\n` : '';
            aiText += `\n\n${label}${linkItem.url}`;
          }
        }
      }

      // Jika AI mencoba menuliskan tautan media sosial usang di dalam teks balasan, bersihkan
      aiText = aiText.replace(
        /https?:\/\/(www\.)?(instagram\.com|instagr\.am|tiktok\.com|youtube\.com|youtu\.be)\/[^\s]+/gi,
        (matchedUrl) => {
          if (!isKnownInActiveDatabase(matchedUrl)) {
            this.logger.warn(
              `[CS-BOT] Membersihkan tautan media usang '${matchedUrl}' dari teks balasan karena tidak ada di database aktif.`,
            );
            return '';
          }
          return matchedUrl;
        },
      ).trim();
      const order = parsed.order || null;
      const lead = parsed.lead || null;

      if (lead) {
        await this.saveLeadToContact(senderId, effectiveSessionName, lead);
      }

      return {
        text: aiText,
        images: aiImages,
        videos: aiVideos,
        order: order,
        lead: lead,
      };
    } catch (e) {
      this.logger.error(`Error parsing LLM JSON: ${e.message}`);
      return {
        text: 'Maaf, sistem sedang sibuk. Silakan coba lagi nanti.',
        images: [],
        videos: [],
      };
    }
  }

  private async saveLeadToContact(
    senderId: string,
    sessionName: string,
    lead: any,
  ) {
    if (!lead || typeof lead !== 'object') return;
    try {
      const cleanPhone = (senderId || '')
        .replace(/@(c\.us|s\.whatsapp\.net|lid|broadcast)$/i, '')
        .replace(/^\+/, '')
        .replace('-customer', '');

      let contact = await this.prisma.contact.findFirst({
        where: {
          OR: [
            { phone: senderId },
            { phone: cleanPhone },
            { phone: { contains: cleanPhone } },
          ],
        },
      });

      const existingMeta = (contact?.metadata as Record<string, any>) || {};
      const updatedMeta: Record<string, any> = {
        ...existingMeta,
        ...(lead.perumahan ? { perumahan: lead.perumahan } : {}),
        ...(lead.tipeUnit ? { tipeUnit: lead.tipeUnit } : {}),
        ...(lead.hargaUnit ? { hargaUnit: Number(lead.hargaUnit) || lead.hargaUnit } : {}),
      };

      if (!contact) {
        if (!cleanPhone) return;
        const hasDeclared = Boolean(
          lead.customerName &&
          typeof lead.customerName === 'string' &&
          lead.customerName.trim() !== '' &&
          lead.customerName.toLowerCase() !== 'anonim' &&
          !lead.customerName.startsWith('+') &&
          lead.customerName !== cleanPhone,
        );
        if (hasDeclared) {
          updatedMeta.selfDeclaredName = lead.customerName.trim();
          updatedMeta.nameSource = 'self_declared';
        }
        const initialName = hasDeclared ? lead.customerName.trim() : 'Anonim';
        contact = await this.prisma.contact.create({
          data: {
            phone: cleanPhone,
            name: initialName,
            status: lead.status || 'Follow-Up',
            notes: lead.notes || null,
            metadata: updatedMeta,
          },
        });

        if (sessionName && sessionName !== 'unknown' && sessionName !== 'unknown-session') {
          await this.prisma.conversation
            .upsert({
              where: {
                instanceName_contactId: {
                  instanceName: sessionName,
                  contactId: contact.id,
                },
              },
              update: {},
              create: {
                instanceName: sessionName,
                contactId: contact.id,
                status: 'OPEN',
              },
            })
            .catch(() => null);
        }

        this.logger.log(
          `[CS-LEAD] Kontak prospek baru otomatis terdata: ${contact.name} (${contact.phone})`,
        );
        return;
      }

      const existingNotes = contact.notes || '';
      let combinedNotes = existingNotes;
      if (lead.notes && typeof lead.notes === 'string') {
        const cleanNewNotes = lead.notes.trim();
        if (cleanNewNotes && !existingNotes.includes(cleanNewNotes)) {
          combinedNotes = existingNotes
            ? `${existingNotes}\n${cleanNewNotes}`
            : cleanNewNotes;
        }
      }

      // Customer menyatakan sendiri namanya di percakapan (prioritas tertinggi dalam hierarki)
      const hasSelfDeclaredName = Boolean(
        lead.customerName &&
        typeof lead.customerName === 'string' &&
        lead.customerName.trim() !== '' &&
        lead.customerName.toLowerCase() !== 'anonim' &&
        !lead.customerName.startsWith('+') &&
        lead.customerName !== cleanPhone,
      );

      if (hasSelfDeclaredName) {
        updatedMeta.selfDeclaredName = lead.customerName.trim();
        updatedMeta.nameSource = 'self_declared';
      }

      await this.prisma.contact.update({
        where: { id: contact.id },
        data: {
          ...(hasSelfDeclaredName && { name: lead.customerName.trim() }),
          ...(lead.status && { status: lead.status }),
          ...(combinedNotes && { notes: combinedNotes }),
          metadata: updatedMeta,
        },
      });
      this.logger.log(
        `[CS-LEAD] Berhasil update prospek ${contact.phone}: ${lead.customerName || contact.name} [Status: ${lead.status || contact.status}]`,
      );
    } catch (err: any) {
      this.logger.warn(`[CS-LEAD] Gagal simpan data prospek: ${err.message}`);
    }
  }
}
