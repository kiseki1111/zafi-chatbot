import {
  Injectable,
  Inject,
  Optional,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  OPENAI_CLIENT,
  OPENAI_VISION_MODEL,
} from '../../core/openai/openai.module';
import { OpenAI } from 'openai';
import { DataAgentService } from '../../features/knowledge-ingest/data-agent.service';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import * as xlsx from 'xlsx';
const sharp = require('sharp');
import * as fs from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { isFeatureAllowed } from '../../features/web-dashboard/tenant/tenant.service';

const execAsync = promisify(exec);

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly dataAgentService: DataAgentService,
    @Optional()
    @Inject(OPENAI_VISION_MODEL)
    private readonly visionModel?: string,
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
      // Sync to vector DB secara background agar HTTP response langsung kembali cepat
      this.dataAgentService
        .syncKnowledgeBase(tenantId)
        .catch((e) => this.logger.warn(`Knowledge sync warning: ${e.message}`));
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
            this.visionModel && this.visionModel !== 'z-ai/glm-5.3-flash'
              ? this.visionModel
              : null,
            'google/gemini-2.0-flash-001',
            'google/gemini-2.5-flash',
            'openai/gpt-4o-mini',
            'meta-llama/llama-3.2-11b-vision-instruct',
            'z-ai/glm-5.3-flash',
            'xiaomi/mimo-v2.5',
          ].filter(
            (m, idx, arr): m is string => Boolean(m) && arr.indexOf(m) === idx,
          )
        : [this.visionModel || 'gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o'].filter(
            (m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx,
          );

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
          const isReasoningModel =
            String(model).toLowerCase().includes('glm') ||
            String(model).toLowerCase().includes('r1');
          const requestPayload: any = {
            model: model,
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
          };
          if (isOpenRouter && isReasoningModel) {
            requestPayload.extra_body = { reasoning: { effort: 'low' } };
          }
          const response =
            await this.openai.chat.completions.create(requestPayload);

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
    const ext = file?.originalname?.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff'];
    // ponytail: feature gating OCR extraction for Lite & Bronze
    if (tenantId && imageExtensions.includes(ext || '')) {
      const tenant = await Promise.resolve(
        this.prisma.tenant?.findUnique?.({ where: { id: tenantId } }),
      ).catch(() => null);
      if (
        tenant &&
        (tenant.metadata as any)?.plan &&
        !isFeatureAllowed(tenant.metadata, 'ocrExtract')
      ) {
        throw new BadRequestException(
          'Fitur ekstraksi OCR dokumen & gambar dengan AI eksklusif untuk paket Silver ke atas.',
        );
      }
    }

    const content = await this.processFile(file);
    const finalTitle = title || file.originalname;

    // Simpan salinan file ke folder uploads agar dapat dilihat / diunduh pengguna di modal preview
    let relativeUrl: string | undefined = undefined;
    if (file.buffer) {
      try {
        const uploadPath = join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${uniqueSuffix}-${cleanName}`;
        fs.writeFileSync(join(uploadPath, filename), file.buffer);
        relativeUrl = `/uploads/${filename}`;
      } catch (e: any) {
        this.logger.warn(`Could not save file copy to uploads: ${e.message}`);
      }
    }

    try {
      const result = await this.prisma.knowledgeBase.create({
        data: {
          content,
          tenantId,
          metadata: {
            title: finalTitle,
            type: 'file',
            filename: file.originalname,
            url: relativeUrl,
          },
        },
      });
      // Sync to vector DB secara background agar HTTP response tidak tertahan dan tidak timeout / socket hang up (ECONNRESET)
      this.dataAgentService
        .syncKnowledgeBase(tenantId)
        .catch((e) => this.logger.warn(`Knowledge sync warning: ${e.message}`));
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

  async createMedia(
    tenantId: string,
    file: Express.Multer.File,
    name?: string,
    description?: string,
    req?: any,
  ) {
    if (!file) throw new BadRequestException('File is required');

    const isVideo =
      file.mimetype.startsWith('video/') ||
      /\.(mov|mp4|mkv|avi|webm)$/i.test(file.originalname);
    const isImage =
      file.mimetype.startsWith('image/') ||
      /\.(jpe?g|png|webp|bmp|gif)$/i.test(file.originalname);
    const isPdf =
      file.mimetype.includes('pdf') || /\.pdf$/i.test(file.originalname);

    const mediaType = isVideo
      ? 'video'
      : isImage
        ? 'image'
        : isPdf
          ? 'pdf'
          : 'document';
    const finalTitle =
      (name || '').trim() ||
      file.originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const cleanDesc = (description || '').trim();

    if (isVideo && file.path) {
      this.optimizeVideoInBackground(file.path, file.originalname);
    }

    const host = req?.get
      ? req.get('host') || 'localhost:3000'
      : 'localhost:3000';
    const protocol =
      req?.headers && req.headers['x-forwarded-proto']
        ? req.headers['x-forwarded-proto']
        : req?.protocol || 'http';
    const baseUrl = process.env.PUBLIC_URL || `${protocol}://${host}`;
    const relativeUrl = `/uploads/${file.filename}`;

    const typeLabel = isVideo
      ? 'VIDEO'
      : isImage
        ? 'FOTO/GAMBAR'
        : isPdf
          ? 'DOKUMEN_PDF'
          : 'FILE';

    const content = `[MEDIA_PERUSAHAAN]
Judul: ${finalTitle}
Tipe: ${typeLabel}
URL: ${relativeUrl}
${cleanDesc ? `Keterangan: ${cleanDesc}` : ''}`.trim();

    try {
      const result = await this.prisma.knowledgeBase.create({
        data: {
          tenantId,
          content,
          metadata: {
            type: 'media',
            mediaType,
            title: finalTitle,
            name: finalTitle,
            description: cleanDesc,
            url: relativeUrl,
            fullUrl: `${baseUrl}${relativeUrl}`,
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
          },
        },
      });

      this.dataAgentService
        .syncKnowledgeBase(tenantId)
        .catch((e) => this.logger.warn(`Knowledge sync warning: ${e.message}`));

      return {
        id: result.id,
        title: finalTitle,
        content,
        metadata: result.metadata,
        url: relativeUrl,
        fullUrl: `${baseUrl}${relativeUrl}`,
        mediaType,
        tenantId,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };
    } catch (error: any) {
      this.logger.error('DB Insert Error:', error);
      throw new BadRequestException('Database insert failed: ' + error.message);
    }
  }

  private async optimizeVideoInBackground(
    filePath: string,
    originalName: string,
  ) {
    const tempOutputPath = `${filePath}.opt.mp4`;
    const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
    this.logger.log(
      `[FFMPEG-ASYNC-START] File: ${originalName} | Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`,
    );

    try {
      const startTime = Date.now();
      await execAsync(
        `ffmpeg -y -i "${filePath}" -vf "scale='min(720,iw)':-2" -c:v libx264 -preset fast -crf 28 -g 60 -keyint_min 30 -c:a aac -b:a 128k -movflags +faststart "${tempOutputPath}"`,
        { timeout: 360000 },
      );
      const durationMs = Date.now() - startTime;

      if (
        fs.existsSync(tempOutputPath) &&
        fs.statSync(tempOutputPath).size > 0
      ) {
        fs.unlinkSync(filePath);
        fs.renameSync(tempOutputPath, filePath);

        this.logger.log(
          `[FFMPEG-ASYNC-SUCCESS] Video ${originalName} berhasil dioptimasi dalam ${durationMs}ms!`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `[FFMPEG-ASYNC-ERROR] Gagal konversi video ${originalName}: ${err.message}`,
      );
      if (fs.existsSync(tempOutputPath)) {
        try {
          fs.unlinkSync(tempOutputPath);
        } catch {}
      }
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

    // Sync to vector DB secara background
    this.dataAgentService
      .syncKnowledgeBase(tenantId)
      .catch((e) => this.logger.warn(`Knowledge sync warning: ${e.message}`));

    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId); // ensure it exists

    await this.prisma.knowledgeBase.deleteMany({
      where: { id, tenantId },
    });

    // Sinkronisasi ulang vector knowledge agar data lama terhapus dari vector_knowledge
    this.dataAgentService
      .syncKnowledgeBase(tenantId)
      .catch((e) => this.logger.warn(`Knowledge sync warning: ${e.message}`));

    return { success: true };
  }

  /**
   * AI-powered Knowledge Segmentation (Split Preview)
   * Membaca isi dokumen pengetahuan dan membaginya menjadi potongan-potongan topik mandiri.
   */
  async previewSplitKnowledge(id: string, tenantId?: string) {
    let item: any = null;
    if (tenantId) {
      item = await this.prisma.knowledgeBase.findFirst({
        where: { id, tenantId },
      });
    }
    if (!item) {
      item = await this.prisma.knowledgeBase.findUnique({
        where: { id },
      });
    }
    if (!item) {
      throw new NotFoundException('Knowledge not found');
    }
    return this.splitContentWithAi(item.content, item.title, id);
  }

  /**
   * AI-powered Text Segmentation langsung dari string konten (sebelum disimpan).
   */
  async previewSplitRawText(content: string, title?: string) {
    if (!content || content.trim().length < 40) {
      throw new BadRequestException(
        'Konten terlalu pendek untuk dipecah (minimal 40 karakter)',
      );
    }
    return this.splitContentWithAi(content, title || 'Dokumen');
  }

  private async splitContentWithAi(
    content: string,
    defaultTitle: string,
    originalId?: string,
  ) {
    if (!this.openai) {
      throw new BadRequestException('OpenAI/LLM client belum terkonfigurasi');
    }

    const systemPrompt = `Anda adalah AI Knowledge Architect ahli manajemen basis pengetahuan.
Tugas Anda adalah membedah satu dokumen pengetahuan bisnis/toko/perumahan yang panjang atau berisi banyak topik menjadi beberapa segmen pengetahuan mandiri (modular) yang rapi, bersih, dan terpisah.

ATURAN WAJIB STRUKTUR & FORMAT:
1. Pisahkan menjadi 2 sampai 6 topik mandiri yang logis (misal: "Profil & Kontak", "Lokasi & Jam Buka", "Pricelist & Skema Pembayaran", "Spesifikasi Unit/Bangunan", "Legalitas & Proyek", "Fasilitas Kawasan", "Persyaratan Berkas KPR", dll).
2. Setiap topik WAJIB memiliki "title" yang singkat, padat, dan jelas (maksimal 60 karakter).
3. "content" WAJIB DISUSUN PER POIN (menggunakan tanda strip '- ' per baris) agar rapi, terstruktur, mudah diedit, dan nyaman dibaca pelanggan di WhatsApp. DILARANG KERAS menumpuk teks menjadi satu paragraf blok panjang!
   Contoh format content yang benar:
   - Nama pengembang: PT Rindang Alam Semesta
   - Kontak marketing: +62 878-4762-8400
   - Jam operasional: Senin - Sabtu 08.00 - 16.00 WIB
4. "isSiteplan": Nilai TRUE jika topik ini secara spesifik membahas spesifikasi teknis bangunan, siteplan/denah, tipe unit rumah, luas tanah/bangunan, atau fasilitas cluster perumahan; nilai FALSE jika topik berupa profil umum perusahaan, kontak umum, atau tata tertib toko.
5. "suggestedCategory": Pilih salah satu: "Spesifikasi Bangunan", "Pricelist & Skema", "Legalitas & Lokasi", atau "Fasilitas Kawasan".
6. "detectedCluster": Tulis nama perumahan/cluster yang dibahas jika disebutkan di teks (misal: "Zafi Residence", "MAS 3", "Skyland", "Griya Amanah"), atau null jika umum.

Format respon WAJIB berupa JSON valid:
{
  "topics": [
    {
      "title": "Nama Topik Spesifik",
      "content": "- Poin 1: keterangan\\n- Poin 2: keterangan",
      "isSiteplan": true,
      "suggestedCategory": "Spesifikasi Bangunan",
      "detectedCluster": "Zafi Residence"
    }
  ]
}`;

    const userPrompt = `Judul Dokumen Asal: "${defaultTitle}"\n\nIsi Dokumen yang akan dipecah:\n"""\n${content}\n"""\n\nBedah dokumen di atas menjadi topik-topik mandiri dengan format per poin dalam JSON yang diminta.`;

    // Prioritaskan model cepat (gpt-4o-mini) agar tidak melewati timeout proxy 30 detik
    const candidateModels = [
      'openai/gpt-4o-mini',
      process.env.OPENAI_MODEL || 'deepseek/deepseek-v4-flash-0731',
      'deepseek/deepseek-v4-flash-0731',
      'z-ai/glm-5.3-flash',
    ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await this.openai.chat.completions.create(
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          },
          { timeout: 20000 },
        );

        const raw = response.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(raw);
        const topics = Array.isArray(parsed.topics) ? parsed.topics : [];

        if (topics.length > 0) {
          return {
            originalId,
            originalTitle: defaultTitle,
            topics: topics.map((t: any) => ({
              title: String(t.title || 'Topik Tanpa Judul').trim(),
              content: String(t.content || '').trim(),
              isSiteplan: Boolean(t.isSiteplan),
              suggestedCategory: String(
                t.suggestedCategory || 'Spesifikasi Bangunan',
              ).trim(),
              detectedCluster: t.detectedCluster
                ? String(t.detectedCluster).trim()
                : null,
            })),
          };
        }
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Split AI model ${model} gagal: ${err.message}`);
      }
    }

    throw new BadRequestException(
      `Gagal memproses pemecahan AI: ${lastError?.message || 'Format tidak valid'}`,
    );
  }

  /**
   * Menerapkan hasil pemecahan: menyimpan topik-topik baru ke knowledge_base dan mengarsipkan/menghapus dokumen asal.
   */
  async applySplitKnowledge(
    id: string,
    tenantId: string,
    topics: {
      title: string;
      content: string;
      target?: 'knowledge' | 'siteplan';
      targetGroupId?: string;
      targetCategory?: string;
    }[],
    keepOriginal: boolean = false,
  ) {
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      throw new BadRequestException(
        'Daftar topik hasil pemecahan wajib disertakan',
      );
    }

    const item = await this.findOne(id, tenantId); // Validasi kepemilikan

    const knowledgeTopics = topics.filter(
      (t) => t.target !== 'siteplan' || !t.targetGroupId,
    );
    const siteplanTopics = topics.filter(
      (t) => t.target === 'siteplan' && t.targetGroupId,
    );

    // 1. Simpan topik-topik yang ditujukan ke Knowledge Base
    const createdKnowledgeItems = await Promise.all(
      knowledgeTopics.map((t) =>
        this.prisma.knowledgeBase.create({
          data: {
            tenantId,
            content: t.content,
            metadata: {
              title: t.title,
              type: 'text',
              splitFrom: id,
              splitFromTitle: item.title,
            },
          },
        }),
      ),
    );

    // 2. Simpan topik-topik yang ditujukan langsung ke Siteplan Cluster
    for (const st of siteplanTopics) {
      const group = await this.prisma.resourceGroup.findFirst({
        where: { id: st.targetGroupId, tenantId },
      });
      if (group) {
        let existingList: any[] = [];
        if (group.description) {
          try {
            const raw = group.description.trim();
            if (raw.startsWith('[')) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) existingList = parsed;
            } else {
              existingList = [
                {
                  id: 'k-init',
                  title: 'Informasi Cluster',
                  category: 'Umum',
                  content: raw,
                },
              ];
            }
          } catch {
            existingList = [
              {
                id: 'k-init',
                title: 'Informasi Cluster',
                category: 'Umum',
                content: group.description,
              },
            ];
          }
        }
        existingList.push({
          id: 'k-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          title: st.title.trim(),
          category: st.targetCategory || 'Spesifikasi Bangunan',
          content: st.content.trim(),
          updatedAt: new Date().toISOString().slice(0, 10),
        });
        await this.prisma.resourceGroup.update({
          where: { id: group.id },
          data: { description: JSON.stringify(existingList) },
        });
      }
    }

    // 3. Hapus dokumen lama jika keepOriginal false
    if (!keepOriginal) {
      await this.prisma.knowledgeBase.deleteMany({
        where: { id, tenantId },
      });
    }

    // 4. Sync vector knowledge di background
    this.dataAgentService
      .syncKnowledgeBase(tenantId)
      .catch((e) => this.logger.warn(`Knowledge sync warning: ${e.message}`));

    return {
      success: true,
      originalId: id,
      deletedOriginal: !keepOriginal,
      count: createdKnowledgeItems.length + siteplanTopics.length,
      knowledgeCount: createdKnowledgeItems.length,
      siteplanCount: siteplanTopics.length,
      items: createdKnowledgeItems.map((ci) => ({
        id: ci.id,
        title: (ci.metadata as any)?.title || 'Untitled',
        content: ci.content,
        metadata: ci.metadata,
        createdAt: ci.createdAt,
      })),
    };
  }

  /**
   * Memindahkan satu segmen materi ke dalam Knowledge Cluster / Siteplan (ResourceGroup.description)
   */
  async moveToSiteplan(
    tenantId: string,
    data: {
      groupId: string;
      title: string;
      category?: string;
      content: string;
      sourceKnowledgeId?: string;
    },
  ) {
    if (!data.groupId || !data.title || !data.content) {
      throw new BadRequestException('groupId, title, dan content wajib diisi');
    }

    const group = await this.prisma.resourceGroup.findFirst({
      where: { id: data.groupId, tenantId },
    });
    if (!group) {
      throw new NotFoundException('Cluster / Perumahan tidak ditemukan');
    }

    let existingList: any[] = [];
    if (group.description) {
      try {
        const raw = group.description.trim();
        if (raw.startsWith('[')) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) existingList = parsed;
        } else {
          existingList = [
            {
              id: 'k-init',
              title: 'Informasi Cluster',
              category: 'Umum',
              content: raw,
            },
          ];
        }
      } catch {
        existingList = [
          {
            id: 'k-init',
            title: 'Informasi Cluster',
            category: 'Umum',
            content: group.description,
          },
        ];
      }
    }

    const newKnowledgeItem = {
      id: 'k-' + Date.now(),
      title: data.title.trim(),
      category: data.category || 'Spesifikasi Bangunan',
      content: data.content.trim(),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    const updatedList = [...existingList, newKnowledgeItem];

    await this.prisma.resourceGroup.update({
      where: { id: group.id },
      data: { description: JSON.stringify(updatedList) },
    });

    if (data.sourceKnowledgeId) {
      await this.prisma.knowledgeBase
        .deleteMany({
          where: { id: data.sourceKnowledgeId, tenantId },
        })
        .catch(() => null);
    }

    this.dataAgentService
      .syncKnowledgeBase(tenantId)
      .catch((e) => this.logger.warn(`Knowledge sync warning: ${e.message}`));

    return {
      success: true,
      groupId: group.id,
      groupName: group.name,
      addedItem: newKnowledgeItem,
      totalClusterKnowledge: updatedList.length,
    };
  }
}
