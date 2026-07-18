import { Injectable, InternalServerErrorException, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OPENAI_CLIENT } from '../../infrastructure/openai/openai.module';
import { OpenAI } from 'openai';

@Injectable()
export class RagService {
  private openai: OpenAI | null;
  private readonly logger = new Logger(RagService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(OPENAI_CLIENT) private injectedOpenai: OpenAI | null,
  ) {
    this.openai = this.injectedOpenai;
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
   * Mengambil daftar SEMUA produk dari database SQL secara langsung (Bypass RAG).
   * Digunakan saat pengguna memiliki intent "LIST_ALL" (sebutkan semua produk).
   */
  async getCatalogContext(tenantId?: string): Promise<string> {
    try {
      const products = await this.prisma.product.findMany({
        where: tenantId ? { tenantId } : undefined,
        select: { name: true, price: true, category: true }
      });

      if (!products || products.length === 0) {
        return 'Sistem Informasi: Saat ini belum ada produk yang terdaftar di database kami.';
      }

      let catalogText = '--- DAFTAR SEMUA PRODUK KAMI ---\n';
      products.forEach((p, idx) => {
        catalogText += `${idx + 1}. ${p.name} (Kategori: ${p.category}) - Harga: Rp ${p.price}\n`;
      });
      catalogText += '\n(Informasi Sistem untuk AI: Berikan daftar singkat di atas kepada pelanggan. Jangan jelaskan semuanya panjang lebar secara otomatis, cukup sebutkan namanya dan minta pelanggan memilih jika ingin tahu detail lebih lanjut.)';

      return catalogText;
    } catch (error) {
      this.logger.error(`Error fetching catalog context: ${error.message}`);
      return '';
    }
  }

  /**
   * Mengambil konteks dari tabel VectorKnowledge menggunakan pencarian semantik (Vector Similarity Search)
   * Ini meminimalkan penggunaan token karena hanya mengambil Top K konteks yang paling relevan.
   */
  async searchRelevantContext(query: string, topK: number = 10, tenantId?: string): Promise<string> {
    try {
      // 1. Generate embedding dari pertanyaan user
      const queryEmbedding = await this.generateEmbedding(query);
      const vectorString = `[${queryEmbedding.join(',')}]`;

      // 2. Lakukan pencarian menggunakan Cosine Similarity (<=>)
      // Jika tenantId diberikan, filter hanya untuk tenant tersebut.
      let results: any[];
      if (tenantId) {
         results = await this.prisma.$queryRaw<any[]>`
           SELECT id, title, content, 
                  1 - (embedding <=> ${vectorString}::vector) AS similarity
           FROM vector_knowledge
           WHERE tenant_id = ${tenantId}
           ORDER BY embedding <=> ${vectorString}::vector
           LIMIT ${topK};
         `;
      } else {
         results = await this.prisma.$queryRaw<any[]>`
           SELECT id, title, content, 
                  1 - (embedding <=> ${vectorString}::vector) AS similarity
           FROM vector_knowledge
           ORDER BY embedding <=> ${vectorString}::vector
           LIMIT ${topK};
         `;
      }

      if (!results || results.length === 0) {
        return '';
      }

      // 3. Filter similarity yang terlalu rendah jika perlu
      const threshold = 0.2;
      const relevantResults = results.filter(r => r.similarity >= threshold);

      if (relevantResults.length === 0) {
        return '';
      }

      // 4. Format hasil ke dalam teks
      const contextBlocks = relevantResults.map((r, index) => {
        return `--- Referensi ${index + 1} (Similarity: ${(r.similarity * 100).toFixed(1)}%) ---\nJudul: ${r.title}\nIsi:\n${r.content}`;
      });

      return contextBlocks.join('\n\n');
    } catch (error) {
      this.logger.error(`Error fetching relevant context via pgvector: ${error.message}`);
      return '';
    }
  }
}
