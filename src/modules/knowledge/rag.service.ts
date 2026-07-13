import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class RagService {
  private openai: OpenAI;
  private readonly logger = new Logger(RagService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const openaiApiKey = this.configService.get<string>('CHATGPT_API_KEY') || this.configService.get<string>('OPENAI_API_KEY');
    const openaiBaseUrl = this.configService.get<string>('OPENAI_BASE_URL');
    
    if (openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: openaiApiKey,
        baseURL: openaiBaseUrl || undefined,
      });
    } else {
      this.logger.warn('OpenAI API Key is not configured. RAG will not work.');
    }
  }

  /**
   * Generates embeddings for a given text.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new InternalServerErrorException('OpenAI client is not initialized');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small', // Highly efficient embedding model
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`Error generating embedding: ${error.message}`);
      throw new InternalServerErrorException('Failed to generate embedding');
    }
  }

  /**
   * Mengambil data Properti dari database untuk dijadikan konteks AI.
   * Karena saat ini jumlah properti masih sedikit (puluhan), kita bisa mengambil semuanya 
   * secara langsung yang menjamin tingkat akurasi 100% tanpa risiko "missed vector".
   * Jika jumlah properti sudah ribuan, kita akan mengaktifkan kembali Vector Search (pgvector).
   */
  async searchRelevantContext(query: string, limit: number = 3): Promise<string> {
    try {
      const properties = await this.prisma.property.findMany();
      const knowledgeBases = await this.prisma.knowledgeBase.findMany();

      if ((!properties || properties.length === 0) && (!knowledgeBases || knowledgeBases.length === 0)) {
        return '';
      }

      // Format semua properti menjadi teks yang rapi agar mudah dibaca oleh LLM
      const contextBlock = properties.map((p, index) => {
        return `[PROPERTI ${index + 1}]
Nama Perumahan: ${p.name}
Lokasi: ${p.location}
Kategori Tipe: ${p.type}
Harga Cash: Rp ${p.cashPrice.toLocaleString('id-ID')}
Admin Fee: ${p.adminFee ? `Rp ${p.adminFee.toLocaleString('id-ID')}` : '-'}
DP (Minimal): ${p.dp ? `Rp ${p.dp.toLocaleString('id-ID')}` : '-'}

Luas Tanah: ${p.landArea}
Listrik: ${p.electricity}
Kamar Tidur: ${p.bedrooms}
Kamar Mandi: ${p.bathrooms}

Spesifikasi Teknis:
${p.specifications}

Fasilitas:
${p.facilities}

Informasi Cicilan & Detail DP:
${p.installmentInfo}

Link Gambar: ${p.imageUrl || '-'}
`;
      }).join('\n\n=========================================\n\n');
      
      let finalContext = contextBlock;
      
      if (knowledgeBases && knowledgeBases.length > 0) {
        const kbText = knowledgeBases.map((kb, index) => {
          return `[PANDUAN/INFORMASI UMUM ${index + 1}]\n${kb.content}`;
        }).join('\n\n');
        
        finalContext += `\n\n=== PENGETAHUAN UMUM & SYARAT ADMINISTRASI ===\n\n${kbText}`;
      }
      
      return finalContext;
    } catch (error) {
      this.logger.error(`Error fetching properties for context: ${error.message}`);
      // In case of error, just return empty context so the bot can still answer without it
      return '';
    }
  }
}
