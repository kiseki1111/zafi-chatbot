import { Injectable, Logger } from '@nestjs/common';
import { ExcelParser } from './parsers/excel-parser';
import { DocumentParser } from './parsers/document-parser';
import { ImageParser } from './parsers/image-parser';
import { KnowledgeAiService } from './knowledge-ai.service';
import { ExtractedProductDto } from '../dto/extracted-product.dto';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DataAgentService } from '../data-agent.service';

interface PendingIngestionData {
  type: 'products' | 'knowledge';
  data: any[];
}

@Injectable()
export class IngestionRouterService {
  private readonly logger = new Logger(IngestionRouterService.name);
  constructor(
    private readonly excelParser: ExcelParser,
    private readonly documentParser: DocumentParser,
    private readonly imageParser: ImageParser,
    private readonly knowledgeAiService: KnowledgeAiService,
    private readonly prisma: PrismaService,
    private readonly dataAgentService: DataAgentService,
  ) {}

  async routeAndProcess(
    mimeType: string,
    buffer: Buffer | null,
    text: string | null,
    tenantId: string | null
  ): Promise<string> {
    this.logger.log(`[ROUTER] Menerima request proses dengan tipe: ${mimeType}`);

    if (mimeType.includes('audio') || mimeType.includes('voice')) {
      this.logger.log(`[ROUTER] Tipe tidak didukung (Audio/Voice). Menolak request.`);
      return "Mohon maaf Bapak/Ibu, saat ini saya belum bisa membaca link web atau mendengarkan suara. Boleh tolong dikirimkan screenshot katalognya atau ketik harganya langsung?";
    }

    if (text && text.match(/https?:\/\/[^\s]+/)) {
       this.logger.log(`[ROUTER] Tipe tidak didukung (Link Web). Menolak request.`);
       return "Mohon maaf Bapak/Ibu, saat ini saya belum bisa membaca link web atau mendengarkan suara. Boleh tolong dikirimkan screenshot katalognya atau ketik harganya langsung?";
    }

    let products: ExtractedProductDto[] = [];
    let knowledgeChunks: string[] = [];
    let isKnowledge = false;

    try {
      this.logger.log(`[ROUTER] Memulai proses ekstraksi data...`);
      if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv') || mimeType.includes('sheet')) {
        this.logger.log(`[ROUTER] Mengeksekusi ExcelParser...`);
        try {
          products = await this.excelParser.parseBuffer(buffer!);
        } catch (e) {
          throw new Error('File parse error: Excel/CSV gagal dibaca');
        }
      } else if (mimeType.includes('pdf')) {
        this.logger.log(`[ROUTER] Mengeksekusi DocumentParser (PDF)...`);
        let rawText = '';
        try {
          rawText = await this.documentParser.parsePdf(buffer!);
        } catch (e) {
          throw new Error('File parse error: Dokumen PDF gagal dibaca');
        }
        this.logger.log(`[ROUTER] Teks Mentah dari PDF berhasil diekstrak (Panjang: ${rawText.length}). Memulai pembersihan AI...`);
        const result = await this.knowledgeAiService.cleanTextToJSON(rawText);
        if (result.intent === 'small_talk') return result.replyMessage;
        if (result.intent === 'ingestion_knowledge' || result.intent === 'ingestion_mixed') {
          isKnowledge = true;
          knowledgeChunks = result.knowledge_chunks;
        }
        if (result.intent === 'ingestion_product' || result.intent === 'ingestion_mixed') {
          products = result.products;
        }
      } else if (mimeType.includes('word') || mimeType.includes('docx')) {
        this.logger.log(`[ROUTER] Mengeksekusi DocumentParser (Word)...`);
        let rawText = '';
        try {
          rawText = await this.documentParser.parseDocx(buffer!);
        } catch (e) {
          throw new Error('File parse error: Dokumen Word gagal dibaca');
        }
        this.logger.log(`[ROUTER] Teks Mentah dari DOCX berhasil diekstrak (Panjang: ${rawText.length}). Memulai pembersihan AI...`);
        const result = await this.knowledgeAiService.cleanTextToJSON(rawText);
        if (result.intent === 'small_talk') return result.replyMessage;
        if (result.intent === 'ingestion_knowledge' || result.intent === 'ingestion_mixed') {
          isKnowledge = true;
          knowledgeChunks = result.knowledge_chunks;
        }
        if (result.intent === 'ingestion_product' || result.intent === 'ingestion_mixed') {
          products = result.products;
        }
      } else if (mimeType.includes('image')) {
        this.logger.log(`[ROUTER] Mengeksekusi ImageParser (Vision AI)...`);
        products = await this.imageParser.parseImage(buffer!);
      } else if (text) {
        this.logger.log(`[ROUTER] Mengeksekusi KnowledgeAiService (Text AI)...`);
        const result = await this.knowledgeAiService.cleanTextToJSON(text);
        if (result.intent === 'small_talk') return result.replyMessage;
        if (result.intent === 'ingestion_knowledge' || result.intent === 'ingestion_mixed') {
          isKnowledge = true;
          knowledgeChunks = result.knowledge_chunks;
        }
        if (result.intent === 'ingestion_product' || result.intent === 'ingestion_mixed') {
          products = result.products;
        }
      }

      this.logger.log(`[ROUTER] Proses ekstraksi selesai.`);
      
      let activeTenantId = tenantId;
      if (!activeTenantId) {
          const firstTenant = await this.prisma.tenant.findFirst();
          if (firstTenant) activeTenantId = firstTenant.id;
      }

      if (isKnowledge && knowledgeChunks.length > 0) {
        this.logger.log(`[ROUTER] Ditemukan ${knowledgeChunks.length} knowledge chunks.`);
        if (activeTenantId) {
          const dataToInsert = knowledgeChunks.map(chunk => ({
            content: chunk,
            tenantId: activeTenantId!
          }));
          await this.prisma.knowledgeBase.createMany({ data: dataToInsert });
          this.logger.log(`[ROUTER] Data sukses disimpan permanen ke database.`);
          
          // Sinkronisasi Vector (Agar AI CS tahu data baru ini)
          await this.dataAgentService.syncKnowledgeBase(activeTenantId);
        }
      }

      if (products.length > 0) {
        this.logger.log(`[ROUTER] Ditemukan ${products.length} produk.`);
        this.logger.log(`[ROUTER] Hasil JSON Ekstraksi:\n${JSON.stringify(products, null, 2)}`);
        
        if (activeTenantId) {
            const dataToInsert = products.map(p => {
                let attrsObj: any = {};
                if (Array.isArray(p.attributes)) {
                    p.attributes.forEach((attr: any) => {
                        if (attr.key && attr.value) attrsObj[attr.key] = attr.value;
                    });
                } else if (typeof p.attributes === 'object' && p.attributes !== null) {
                    attrsObj = p.attributes;
                }

                let calculatedStock = 0;
                if (attrsObj && attrsObj.variants) {
                    for (const key in attrsObj.variants) {
                        calculatedStock += (Number(attrsObj.variants[key]) || 0);
                    }
                } else if (attrsObj && (attrsObj.stock !== undefined || attrsObj.stok !== undefined)) {
                    calculatedStock = Number(attrsObj.stock || attrsObj.stok) || 0;
                }

                return {
                    name: p.nama,
                    price: p.harga,
                    description: p.deskripsi,
                    attributes: attrsObj,
                    stock: calculatedStock,
                    category: 'Katalog AI',
                    tenantId: activeTenantId!
                };
            });
            
            // Deduplikasi Cerdas: Upsert berdasarkan nama (case-insensitive) dan tenantId
            for (const p of dataToInsert) {
                const existing = await this.prisma.product.findFirst({
                    where: { 
                        tenantId: activeTenantId, 
                        name: { equals: p.name, mode: 'insensitive' }
                    }
                });
                
                if (existing) {
                    await this.prisma.product.update({
                        where: { id: existing.id },
                        data: p
                    });
                } else {
                    await this.prisma.product.create({ data: p });
                }
            }
            this.logger.log(`[ROUTER] Data sukses disimpan/diperbarui permanen ke database.`);
            
            // Sinkronisasi Vector (Agar AI CS tahu data baru ini)
            await this.dataAgentService.syncKnowledgeBase(activeTenantId);
        } else {
            this.logger.warn(`[ROUTER] Tidak ada TenantID yang aktif. Data tidak disimpan.`);
        }
      }

      let reply = '';
      if (isKnowledge && knowledgeChunks.length > 0) {
        reply += `Berhasil mengekstrak dan menyimpan permanen ${knowledgeChunks.length} poin informasi terkait kebijakan/toko Anda.\n`;
      }
      if (products.length > 0) {
        reply += `Berhasil mengekstrak dan menyimpan permanen ${products.length} produk:\n\n`;
        products.forEach((p, index) => {
            let attrCount = 0;
            if (p.attributes) {
                if (Array.isArray(p.attributes)) attrCount = p.attributes.length;
                else if (typeof p.attributes === 'object') attrCount = Object.keys(p.attributes).length;
            }
            const hasDesc = p.deskripsi ? 'berikut dengan deskripsi' : 'tanpa deskripsi';
            const hasAttr = attrCount > 0 ? ` & ${attrCount} info atribut pelengkap` : '';
            reply += `${index + 1}. *${p.nama}* (Rp ${p.harga})\n   (Tersimpan ${hasDesc}${hasAttr})\n`;
        });
      }

      if (reply !== '') {
        reply += `\nLangkah selanjutnya: Apakah ada hal lain yang ingin disesuaikan, atau mau langsung testing bot CS?`;
        return reply;
      } else {
        return "Mohon maaf, saya tidak menemukan data produk atau aturan yang valid dari pesan/file tersebut.";
      }
    } catch (e: any) {
      this.logger.error(`Error processing ingestion: ${e.message || e}`, e.stack);
      
      if (e.message?.includes('File parse error:')) {
        return `Maaf, saya gagal membaca file yang dikirim (${e.message.split('File parse error:')[1].trim()}). Tolong pastikan format file sudah benar dan tidak rusak/corrupt.`;
      }
      
      return "Mohon maaf, terjadi kesalahan saat memproses data Anda. Tolong coba lagi atau hubungi tim support.";
    }
  }
}
