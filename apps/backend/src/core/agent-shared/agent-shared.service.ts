import {
  Injectable,
  Logger,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import {
  OPENAI_CLIENT,
  OPENAI_MODEL,
  OPENAI_VISION_MODEL,
} from '../openai/openai.module';
import { OpenAI } from 'openai';

@Injectable()
export class AgentSharedService {
  private readonly logger = new Logger(AgentSharedService.name);
  private openai: OpenAI | null;
  private model: string;
  private visionModel: string;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPENAI_CLIENT) private readonly injectedOpenai: OpenAI | null,
    @Inject(OPENAI_MODEL) private readonly injectedModel: string,
    @Inject(OPENAI_VISION_MODEL)
    private readonly injectedVisionModel: string,
  ) {
    this.openai = this.injectedOpenai;
    this.model = this.injectedModel;
    this.visionModel = this.injectedVisionModel;
    this.logger.log(`[AgentShared] Using model: ${this.model}`);
    this.logger.log(`[AgentShared] Vision model: ${this.visionModel}`);
  }

  /**
   * 1. Mengambil N chat terakhir untuk short-term memory LLM.
   */
  async getRecentContext(
    chatId: string,
    instanceName: string,
    limit: number = 6,
  ) {
    try {
      const messages = await this.prisma.message.findMany({
        where: {
          conversation: {
            contact: { phone: chatId },
            instanceName: instanceName,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return messages.reverse();
    } catch (e) {
      this.logger.error(
        `Error fetching recent context for ${chatId}: ${e.message}`,
      );
      return [];
    }
  }

  /**
   * 2. Mengambil informasi dari knowledge_base dengan pola Hybrid Threshold:
   * - Jika dokumen tenant <= 15 (UMKM standar): Ambil semua langsung (100% akurat, cepat).
   * - Jika dokumen tenant > 15 (dokumen banyak/tebal): Filter Top-5 paling relevan berbasis kata kunci & update terbaru.
   */
  async retrieveRelevantKnowledge(
    query: string,
    tenantId: string,
  ): Promise<string> {
    try {
      const count = await this.prisma.knowledgeBase.count({
        where: { tenantId },
      });

      if (count === 0) {
        return '';
      }

      // 1. Jika dokumen sedikit (<= 15 dokumen), gabungkan seluruhnya langsung
      if (count <= 15) {
        const knowledges = await this.prisma.knowledgeBase.findMany({
          where: { tenantId },
          take: 15,
          orderBy: { createdAt: 'desc' },
        });
        return knowledges.map((k) => k.content).join('\n\n');
      }

      // 2. Jika dokumen banyak (> 15 dokumen), lakukan pencarian terseleksi berbasis kata kunci query
      const keywords = (query || '')
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3);

      let matchedItems: any[] = [];
      if (keywords.length > 0) {
        matchedItems = await this.prisma.knowledgeBase.findMany({
          where: {
            tenantId,
            OR: keywords.map((k) => ({
              content: { contains: k, mode: 'insensitive' as const },
            })),
          },
          take: 5,
        });
      }

      // Lengkapi hingga 5 dokumen menggunakan data terupdate jika keyword match < 3
      if (matchedItems.length < 3) {
        const needed = 5 - matchedItems.length;
        const recentItems = await this.prisma.knowledgeBase.findMany({
          where: { tenantId },
          take: needed,
          orderBy: { updatedAt: 'desc' },
        });
        const existingIds = new Set(matchedItems.map((m) => m.id));
        for (const item of recentItems) {
          if (!existingIds.has(item.id)) {
            matchedItems.push(item);
          }
        }
      }

      return matchedItems.map((k) => k.content).join('\n\n');
    } catch (e) {
      this.logger.error(`Error retrieving relevant knowledge: ${e.message}`);
      return '';
    }
  }

  /**
   * 2b. Mengambil data ketersediaan unit/plansite dari database untuk konteks AI (Read-Only).
   */
  async getAvailabilityContext(tenantId: string): Promise<string> {
    try {
      const groups = await this.prisma.resourceGroup.findMany({
        where: tenantId ? { tenantId } : {},
        include: {
          items: {
            orderBy: { code: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!groups || groups.length === 0) {
        return '';
      }

      const summaries = groups.map((g) => {
        const total = g.items.length;
        const available = g.items.filter(
          (i) => i.status === 'AVAILABLE',
        ).length;
        const booked = g.items.filter((i) => i.status === 'BOOKED').length;
        const occupied = g.items.filter((i) => i.status === 'OCCUPIED').length;

        const itemList = g.items
          .map((i) => {
            const typeStr = i.houseType ? ` (Tipe ${i.houseType})` : '';
            const priceStr = i.price
              ? ` - Rp ${Number(i.price).toLocaleString('id-ID')}`
              : '';
            let statusLabel = 'UNIT READY (Hijau - Tersedia)';
            if (i.status === 'BOOKED')
              statusLabel = 'PROSES BANK (Orange - Sedang proses KPR/Bank)';
            if (i.status === 'OCCUPIED') statusLabel = 'SUDAH TERJUAL (Merah)';
            if (i.status === 'MAINTENANCE')
              statusLabel = 'RUMAH CONTOH (Abu Hitam)';

            return `  * ${i.code}${typeStr}: ${statusLabel}${priceStr}`;
          })
          .join('\n');

        let mediaStr = '';
        if (g.siteplanImage) {
          try {
            const raw = g.siteplanImage.trim();
            if (raw.startsWith('[')) {
              const medias = JSON.parse(raw);
              if (Array.isArray(medias) && medias.length > 0) {
                mediaStr =
                  '\nDaftar Foto & Video yang tersedia untuk dikirimkan ke pelanggan:\n' +
                  medias
                    .map(
                      (m: any) =>
                        `  - [${m.type === 'video' ? 'VIDEO' : 'FOTO'}] "${m.name}": ${m.url}${m.description ? ` (${m.description})` : ''}`,
                    )
                    .join('\n');
              }
            } else {
              mediaStr = `\nFoto/Video Siteplan: ${raw}`;
            }
          } catch (e) {}
        }

        let descStr = '';
        if (g.description) {
          try {
            const rawDesc = g.description.trim();
            if (rawDesc.startsWith('[')) {
              const knowledges = JSON.parse(rawDesc);
              if (Array.isArray(knowledges) && knowledges.length > 0) {
                descStr =
                  '\nKnowledge & Informasi Khusus Cluster:\n' +
                  knowledges
                    .map(
                      (k: any) =>
                        `  * [${k.category || 'Info'}] ${k.title}:\n    ${k.content.replace(/\n/g, '\n    ')}`,
                    )
                    .join('\n\n') +
                  '\n';
              }
            } else {
              descStr = `\nInformasi & Knowledge Khusus Cluster:\n${rawDesc}\n`;
            }
          } catch (e) {
            descStr = `\nInformasi Khusus Cluster:\n${g.description}\n`;
          }
        }

        return `Perumahan: "${g.name}" (Total ${total} Unit | Unit Ready: ${available} | Proses Bank: ${booked} | Sudah Terjual: ${occupied})${descStr}\nDaftar Unit/Blok:\n${itemList}${mediaStr}`;
      });

      return summaries.join('\n\n');
    } catch (e: any) {
      this.logger.error(`Error fetching availability context: ${e.message}`);
      return '';
    }
  }

  /**
   * Wrapper tunggal untuk memanggil OpenAI.
   */
  async callLLM(
    prompt: string,
    systemPrompt: string,
    requireJson: boolean = false,
  ): Promise<string> {
    if (!this.openai) {
      throw new InternalServerErrorException(
        'OPENAI_API_KEY is not configured',
      );
    }

    // Model text utama tetap DeepSeek, diikuti fallback dari yang termurah ke termahal:
    // 1. deepseek/deepseek-v4-flash-0731 (Utama)
    // 2. z-ai/glm-5.3-flash (In $0.045 / Out $0.14)
    // 3. xiaomi/mimo-v2.5 (In $0.119 / Out $0.238)
    // 4. openai/gpt-4o-mini (In $0.15 / Out $0.60)
    const candidateModels = [
      this.model,
      'deepseek/deepseek-v4-flash-0731',
      'z-ai/glm-5.3-flash',
      'xiaomi/mimo-v2.5',
      'openai/gpt-4o-mini',
    ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await this.openai.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          response_format: requireJson
            ? { type: 'json_object' }
            : { type: 'text' },
        });

        const content = response.choices[0]?.message?.content || '';
        if (content) return content;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `[AgentShared LLM Fallback] Model ${model} gagal: ${error.message}. Mencoba model cadangan...`,
        );
      }
    }

    this.logger.error('All candidate LLM models failed:', lastError);
    throw new InternalServerErrorException(
      'Failed to generate response from LLM (all fallbacks exhausted)',
    );
  }

  /**
   * 4b. Wrapper untuk memanggil OpenAI secara streaming dengan fallback.
   */
  async callLLMStream(
    prompt: string,
    systemPrompt: string,
    requireJson: boolean = false,
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    if (!this.openai) {
      throw new InternalServerErrorException(
        'OPENAI_API_KEY is not configured',
      );
    }

    const candidateModels = [
      this.model,
      'deepseek/deepseek-v4-flash-0731',
      'z-ai/glm-5.3-flash',
      'xiaomi/mimo-v2.5',
      'openai/gpt-4o-mini',
    ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const stream = await this.openai.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          response_format: requireJson
            ? { type: 'json_object' }
            : { type: 'text' },
          stream: true,
        });

        let fullContent = '';
        for await (const chunk of stream) {
          const textChunk = chunk.choices[0]?.delta?.content || '';
          if (textChunk) {
            fullContent += textChunk;
            onChunk(textChunk);
          }
        }
        if (fullContent) return fullContent;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `[AgentShared LLM Stream Fallback] Model ${model} gagal: ${error.message}. Mencoba model cadangan...`,
        );
      }
    }

    this.logger.error('All candidate LLM stream models failed:', lastError);
    throw new InternalServerErrorException(
      'Failed to generate stream response from LLM (all fallbacks exhausted)',
    );
  }

  async analyzeImage(
    mediaUrl: string,
    prompt: string = 'Analisis dan deskripsikan isi gambar ini secara singkat, padat, dan jelas dalam Bahasa Indonesia. Identifikasi objek utama secara spesifik (misalnya: tipe/desain rumah atau properti, denah/siteplan, produk/barang dagangan, struk transfer/pembayaran, atau dokumen). Sebutkan teks yang terbaca, ciri visual utama, warna, dan kondisinya.',
  ): Promise<string> {
    if (!this.openai) {
      this.logger.warn('[Vision AI] OpenAI client not initialized.');
      return '';
    }

    let imageContent: any = { type: 'image_url', image_url: { url: mediaUrl } };
    try {
      const dataUri = await this.fetchImageAsDataUri(mediaUrl);
      if (dataUri) {
        imageContent = {
          type: 'image_url',
          image_url: { url: dataUri },
        };
      }
    } catch (e) {
      this.logger.warn(`Could not pre-fetch image, fallback URL: ${e.message}`);
    }

    // Daftar model Vision diurutkan dari yang termurah ke termahal:
    // 1. z-ai/glm-5.3-flash (In $0.045 / Out $0.14) -> UTAMA
    // 2. meta-llama/llama-3.2-11b-vision-instruct (In $0.05 / Out $0.33)
    // 3. meta-llama/llama-4-scout (In $0.10 / Out $0.30)
    // 4. xiaomi/mimo-v2.5 (In $0.119 / Out $0.238)
    // 5. openai/gpt-4o-mini (In $0.15 / Out $0.60)
    const candidateModels = [
      this.visionModel,
      'z-ai/glm-5.3-flash',
      'meta-llama/llama-3.2-11b-vision-instruct',
      'meta-llama/llama-4-scout',
      'xiaomi/mimo-v2.5',
      'openai/gpt-4o-mini',
    ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

    for (const model of candidateModels) {
      try {
        this.logger.log(`[Vision AI] Mencoba analisis gambar dengan model: ${model}...`);
        const response = await this.openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                imageContent,
              ] as any,
            },
          ],
          max_tokens: 500,
        });

        const msg: any = response.choices[0]?.message;
        const description = (msg?.content || msg?.reasoning || '').trim();
        if (description) {
          this.logger.log(`[Vision AI] Sukses menganalisis gambar (${model}): "${description.substring(0, 80)}..."`);
          return description;
        }
        this.logger.warn(`[Vision AI] Model ${model} mengembalikan respon kosong, mencoba fallback...`);
      } catch (e: any) {
        const errorDetail = e.response?.data || e.message || e;
        this.logger.warn(
          `[Vision AI Fallback] Gagal dengan model ${model}: ${JSON.stringify(errorDetail)}. Mencoba kandidat berikutnya...`,
        );
      }
    }

    this.logger.error('[Vision AI] Seluruh model vision (termasuk fallback) gagal.');
    return '';
  }

  /**
   * Unduh gambar & mengkonversi ke base64 data URI, agar vision model tidak
   * depend pada URL publik. Untuk URL WAHA internal (localhost:3000) -> arahkan
   * ke baseUrl WAHA yang benar sebelum unduh.
   */
  private async fetchImageAsDataUri(mediaUrl: string): Promise<string | null> {
    try {
      let targetUrl = mediaUrl;
      const isWahaInternal =
        mediaUrl &&
        /localhost|127\.0\.0\.1/i.test(mediaUrl) &&
        mediaUrl.includes('/api/files/');

      // Perbaiki URL WAHA internal (localhost:3000/api/files/...) -> baseUrl WAHA
      // sekaligus tambahkan header X-Api-Key (WAHA minta autentikasi)
      if (isWahaInternal) {
        const baseUrl =
          process.env.WAHA_API_URL || 'http://127.0.0.1:3000';
        const pathPart = mediaUrl.substring(mediaUrl.indexOf('/api/files/'));
        targetUrl = `${baseUrl.replace(/\/+$/, '')}${pathPart}`;
      }

      const apiKey =
        process.env.WAHA_API_KEY || process.env.WHATSAPP_API_KEY || '';
      const res = await axios.get(targetUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          ...(isWahaInternal ? { 'X-Api-Key': apiKey } : {}),
        },
        timeout: 30000,
      });
      const mime = String(res.headers['content-type'] || 'image/jpeg');
      const base64 = Buffer.from(res.data).toString('base64');
      return `data:${mime};base64,${base64}`;
    } catch (e) {
      this.logger.warn(
        `fetchImageAsDataUri failed for ${mediaUrl}: ${e.message}`,
      );
      return null;
    }
  }
}
