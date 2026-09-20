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
   * 2. Mengambil informasi dari knowledge_base (Bukan vector/RAG lagi).
   */
  async retrieveRelevantKnowledge(
    query: string,
    tenantId: string,
  ): Promise<string> {
    try {
      // 1. Ambil semua knowledge dari tenant ini
      const knowledges = await this.prisma.knowledgeBase.findMany({
        where: { tenantId },
        take: 50,
      });

      if (knowledges.length === 0) {
        return '';
      }

      // Gabungkan semua isi knowledge menjadi satu teks (sebagai konteks LLM)
      return knowledges.map((k) => k.content).join('\n\n');
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

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        response_format: requireJson
          ? { type: 'json_object' }
          : { type: 'text' },
      });

      return response.choices[0].message?.content || '';
    } catch (error) {
      this.logger.error('Error in LLM call:', error);
      throw new InternalServerErrorException(
        'Failed to generate response from LLM',
      );
    }
  }

  /**
   * 4b. Wrapper untuk memanggil OpenAI secara streaming.
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

    try {
      const stream = await this.openai.chat.completions.create({
        model: this.model,
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
      return fullContent;
    } catch (error) {
      this.logger.error('Error in LLM stream call:', error);
      throw new InternalServerErrorException(
        'Failed to generate stream response from LLM',
      );
    }
  }

  async analyzeImage(
    mediaUrl: string,
    prompt: string = 'Deskripsikan apa isi gambar ini dengan singkat dan jelas, fokus pada nama produk, merk, jumlah, atau informasi harga jika ada.',
  ): Promise<string> {
    if (!this.openai) return '';
    try {
      // Convert media ke base64 data URI agar OpenRouter/Llama dapat baca gambar
      // tanpa bergantung URL publik (localhost/private gagal).
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

      const response = await this.openai.chat.completions.create({
        // Gunakan model Vision (Llama-4-Scout) yang mendukung input gambar
        model: this.visionModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              imageContent,
            ] as any, // type override for openai array content
          },
        ],
        max_tokens: 400,
      });
      return response.choices[0].message?.content || '';
    } catch (e) {
      this.logger.error(
        `Error analyzing image (model=${this.visionModel}): ${e}`,
      );
      return '';
    }
  }

  /**
   * Unduh gambar & mengkonversi ke base64 data URI, agar vision model tidak
   * depend pada URL publik. Untuk URL WAHA internal (localhost:3000) -> arahkan
   * ke baseUrl WAHA yang benar sebelum unduh.
   */
  private async fetchImageAsDataUri(mediaUrl: string): Promise<string | null> {
    try {
      let targetUrl = mediaUrl;
      // Perbaiki URL WAHA internal (localhost:3000/api/files/...) -> baseUrl WAHA
      if (
        mediaUrl &&
        /localhost|127\.0\.0\.1/i.test(mediaUrl) &&
        mediaUrl.includes('/api/files/')
      ) {
        const baseUrl =
          process.env.WAHA_API_URL || 'http://103.30.195.145:3060';
        const pathPart = mediaUrl.substring(mediaUrl.indexOf('/api/files/'));
        targetUrl = `${baseUrl.replace(/\/+$/, '')}${pathPart}`;
      }

      const res = await axios.get(targetUrl, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' },
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
