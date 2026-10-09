import {
  Injectable,
  Inject,
  Optional,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OPENAI_CLIENT, OPENAI_VISION_MODEL } from '../../core/openai/openai.module';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { DataAgentService } from '../../features/knowledge-ingest/data-agent.service';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import * as xlsx from 'xlsx';
const sharp = require('sharp');

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly dataAgentService: DataAgentService,
    @Optional() @Inject(OPENAI_VISION_MODEL) private readonly visionModel?: string,
  ) {}

  async findAll(tenantId: string) {
    const items = await this.prisma.knowledgeBase.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    // Extract title from metadata for response
    return items.map((item) => ({
      id: item.id,
      title: (item.metadata as any)?.title || 'Untitled',
      content: item.content,
      metadata: item.metadata,
      tenantId: item.tenantId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  async findOne(id: string, tenantId: string) {
    const item = await this.prisma.knowledgeBase.findFirst({
      where: { id, tenantId },
    });

    if (!item) {
      throw new NotFoundException('Knowledge not found');
    }
    // Extract title from metadata for response
    return {
      id: item.id,
      title: (item.metadata as any)?.title || 'Untitled',
      content: item.content,
      metadata: item.metadata,
      tenantId: item.tenantId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async createText(tenantId: string, title: string, content: string) {
    try {
      const result = await this.prisma.knowledgeBase.create({
        data: {
          content,
          tenantId,
          metadata: { title, type: 'text' },
        },
      });
      // Sync to vector DB so agent can use it immediately
      await this.dataAgentService
        .syncKnowledgeBase(tenantId)
        .catch((e) => console.warn('Knowledge sync warning:', e.message));
      return {
        id: result.id,
        title,
        content,
        metadata: result.metadata,
        tenantId,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };
    } catch (error: any) {
      console.error('DB Insert Error:', error);
      throw new BadRequestException('Database insert failed: ' + error.message);
    }
  }

  private async extractImagesFromPdfBuffer(
    pdfBuffer: Buffer,
  ): Promise<Buffer[]> {
    const images: Buffer[] = [];
    try {
      let startIndex = 0;
      while (
        (startIndex = pdfBuffer.indexOf(
          Buffer.from([0xff, 0xd8, 0xff]),
          startIndex,
        )) !== -1
      ) {
        const endIndex = pdfBuffer.indexOf(
          Buffer.from([0xff, 0xd9]),
          startIndex + 3,
        );
        if (endIndex !== -1) {
          const candidate = pdfBuffer.subarray(startIndex, endIndex + 2);
          try {
            const meta = await sharp(candidate).metadata();
            if (
              meta.width &&
              meta.height &&
              meta.width > 50 &&
              meta.height > 50
            ) {
              images.push(candidate);
            }
          } catch {}
          startIndex = endIndex + 2;
        } else {
          break;
        }
      }
    } catch (e: any) {
      this.logger.warn(`Error extracting images from PDF: ${e.message}`);
    }
    return images;
  }

  async extractTextFromImage(buffer: Buffer): Promise<string> {
    if (!this.openai) {
      throw new BadRequestException(
        'Layanan AI Vision tidak tersedia (OpenAI client tidak terkonfigurasi)',
      );
    }

    try {
      const resizedBuffer = await sharp(buffer)
        .resize({
          width: 2048,
          height: 2048,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const base64Image = resizedBuffer.toString('base64');
      const dataUri = `data:image/jpeg;base64,${base64Image}`;

      const isOpenRouter = Boolean(
        (this.openai as any)?.baseURL?.includes('openrouter.ai'),
      );

      const candidateModels = isOpenRouter
        ? [
            this.visionModel,
            'z-ai/glm-5.3-flash',
            'meta-llama/llama-3.2-11b-vision-instruct',
            'meta-llama/llama-4-scout',
            'xiaomi/mimo-v2.5',
            'openai/gpt-4o-mini',
            'google/gemini-2.5-flash',
          ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx)
        : [
            this.visionModel || 'gpt-4o-mini',
            'gpt-4o-mini',
            'gpt-4o',
          ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

      const prompt = `Anda adalah asisten OCR tingkat tinggi yang bertugas membaca dan mengekstrak seluruh informasi dari dokumen/brosur/gambar ini.

Tugas Anda:
1. Salin dan ekstrak SEMUA teks dan angka yang ada secara lengkap dan akurat. Jangan meringkas atau menghilangkan informasi penting apapun (nama instansi/perusahaan, alamat, nomor surat, seluruh nomor urut persyaratan, catatan, rincian biaya, tenor/angsuran, dsb).
2. Pertahankan struktur dokumen:
   - Gunakan format Heading Markdown (#, ##) untuk judul dan subjudul.
   - Gunakan numbered list (1., 2.) atau bullet list (-) untuk poin-poin persyaratan atau catatan.
   - Gunakan tabel Markdown (| Kolom 1 | Kolom 2 |) jika terdapat susunan kolom atau tabel seperti tabel tenor/angsuran cicilan.
3. Berikan langsung hasil teks dokumen tanpa kalimat pembuka atau penutup.`;

      let extractedText = '';
      let lastError: any = null;

      for (const model of candidateModels) {
        try {
          this.logger.log(
            `[KnowledgeService] Ekstraksi gambar via AI Vision: model ${model}...`,
          );
          const response = await this.openai.chat.completions.create({
            model: model as string,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  {
                    type: 'image_url',
                    image_url: { url: dataUri },
                  },
                ],
              },
            ],
            max_tokens: 3500,
          });

          const msg: any = response.choices?.[0]?.message;
          const content = (msg?.content || msg?.reasoning || '').trim();
          if (content) {
            this.logger.log(
              `[KnowledgeService] Berhasil mengekstrak teks (${model}), panjang: ${content.length} karakter`,
            );
            extractedText = content;
            break;
          }
          this.logger.warn(
            `[KnowledgeService] Model ${model} mengembalikan respon kosong, mencoba model berikutnya...`,
          );
        } catch (err: any) {
          lastError = err;
          this.logger.warn(
            `[KnowledgeService] Model ${model} gagal: ${err.message}`,
          );
        }
      }

      if (!extractedText) {
        throw new BadRequestException(
          `Could not extract text from file. Gagal membaca gambar via AI Vision: ${lastError?.message || 'Respon kosong'}`,
        );
      }

      return extractedText;
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      this.logger.error(`Error processing image: ${e.message}`, e.stack);
      throw new BadRequestException(
        `Could not extract text from file: ${e.message}`,
      );
    }
  }

  async processFile(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff'];
    let content = '';

    if (ext === 'pdf') {
      try {
        const parsed = await pdfParse(file.buffer);
        content = (parsed.text || '').trim();
      } catch (err: any) {
        this.logger.warn(`PDF parse error: ${err.message}`);
      }

      // Jika PDF tidak memiliki teks digital sama sekali (hasil scan atau konversi dari foto/gambar)
      if (!content || content.length < 5) {
        this.logger.log(
          `[KnowledgeService] PDF tidak memiliki teks digital (${content.length} chars). Mencoba ekstraksi gambar scan dari PDF...`,
        );
        const images = await this.extractImagesFromPdfBuffer(file.buffer);
        if (images.length > 0) {
          this.logger.log(
            `[KnowledgeService] Ditemukan ${images.length} gambar di dalam PDF. Memproses Vision AI OCR...`,
          );
          const pageTexts: string[] = [];
          for (let i = 0; i < Math.min(images.length, 5); i++) {
            const pageText = await this.extractTextFromImage(images[i]);
            if (pageText) {
              pageTexts.push(
                images.length > 1
                  ? `--- Halaman ${i + 1} ---\n${pageText}`
                  : pageText,
              );
            }
          }
          content = pageTexts.join('\n\n');
        }
      }
    } else if (ext === 'doc' || ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      content = result.value;
    } else if (ext === 'csv' || ext === 'xls' || ext === 'xlsx') {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheetTexts: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        // Format sebagai CSV baris teks terstruktur yang mudah dipahami LLM
        const csvText = xlsx.utils.sheet_to_csv(worksheet);
        if (csvText && csvText.trim()) {
          sheetTexts.push(`[Sheet: ${sheetName}]\n${csvText.trim()}`);
        }
      }
      content = sheetTexts.join('\n\n');
    } else if (ext === 'txt') {
      content = file.buffer.toString('utf8');
    } else if (imageExtensions.includes(ext || '')) {
      content = await this.extractTextFromImage(file.buffer);
    } else {
      throw new BadRequestException(
        'Unsupported file format. Use PDF, DOCX, CSV, XLS, XLSX, TXT, or Image (JPG, JPEG, PNG, WEBP).',
      );
    }

    // Basic cleanup
    content = content.replace(/\n+/g, '\n').trim();
    if (!content) {
      if (ext === 'pdf') {
        throw new BadRequestException(
          'Could not extract text from file. Dokumen PDF ini berupa scan/gambar tanpa teks digital. Silakan unggah langsung file fotonya (JPG/PNG).',
        );
      }
      throw new BadRequestException('Could not extract text from file');
    }

    return content;
  }

  async createFile(
    tenantId: string,
    file: Express.Multer.File,
    title?: string,
  ) {
    const content = await this.processFile(file);
    const finalTitle = title || file.originalname;

    try {
      const result = await this.prisma.knowledgeBase.create({
        data: {
          content,
          tenantId,
          metadata: {
            title: finalTitle,
            type: 'file',
            filename: file.originalname,
          },
        },
      });
      // Sync to vector DB so agent can use it immediately
      await this.dataAgentService
        .syncKnowledgeBase(tenantId)
        .catch((e) => console.warn('Knowledge sync warning:', e.message));
      return {
        id: result.id,
        title: finalTitle,
        content,
        metadata: result.metadata,
        tenantId,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };
    } catch (error: any) {
      console.error('DB Insert Error:', error);
      throw new BadRequestException('Database insert failed: ' + error.message);
    }
  }

  async update(id: string, tenantId: string, title: string, content: string) {
    const item = await this.findOne(id, tenantId); // ensure it exists

    // Merge existing metadata with new title
    const existingMetadata = (item.metadata as any) || {};
    const metadataStr = JSON.stringify({ ...existingMetadata, title });

    // 1. Update source of truth
    await this.prisma.$executeRawUnsafe(
      `UPDATE "knowledge_base"
       SET content = $1, metadata = $2::jsonb, updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4`,
      content,
      metadataStr,
      id,
      tenantId,
    );

    // Sync to vector DB so agent gets updated knowledge
    await this.dataAgentService
      .syncKnowledgeBase(tenantId)
      .catch((e) => console.warn('Knowledge sync warning:', e.message));

    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId); // ensure it exists

    await this.prisma.knowledgeBase.deleteMany({
      where: { id, tenantId },
    });

    return { success: true };
  }
}
