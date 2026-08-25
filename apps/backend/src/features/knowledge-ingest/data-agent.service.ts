import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RagService } from './rag.service';

@Injectable()
export class DataAgentService {
  private readonly logger = new Logger(DataAgentService.name);

  constructor(
    private prisma: PrismaService,
    private ragService: RagService,
  ) {}

  /**
   * Manual synchronization: Fetches all Products and KnowledgeBase items,
   * creates vectors, and saves them into the VectorKnowledge table.
   * This effectively duplicates the read-only data for AI into a dedicated vector store.
   */
  async syncKnowledgeBase(tenantId?: string): Promise<{ inserted: number; errors: number }> {
    this.logger.log(`Starting manual sync of master data to vector database${tenantId ? ' for tenant ' + tenantId : ''}...`);
    
    let inserted = 0;
    let errors = 0;

    try {
      // 1. Kosongkan tabel VectorKnowledge lama
      if (tenantId) {
         await this.prisma.vectorKnowledge.deleteMany({
           where: { tenantId }
         });
      } else {
         await this.prisma.vectorKnowledge.deleteMany();
      }
      this.logger.log('Cleared existing VectorKnowledge records.');

      // 2. Ambil data produk
      const products = await this.prisma.product.findMany({
        where: tenantId ? { tenantId } : undefined
      });
      this.logger.log(`Found ${products.length} products to sync.`);

      for (const product of products) {
        try {
          const content = `Produk: ${product.name}\nKategori: ${product.category}\nDeskripsi: ${product.description}\nHarga: Rp ${product.price}\nStok: ${product.stock}`;
          const embedding = await this.ragService.generateEmbedding(content);
          
          const vectorString = `[${embedding.join(',')}]`;
          
          await this.prisma.$executeRawUnsafe(`
            INSERT INTO vector_knowledge (id, title, content, embedding, tenant_id, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3::vector, $4, CURRENT_TIMESTAMP)
          `, `Produk: ${product.name}`, content, vectorString, product.tenantId || null);
          inserted++;
        } catch (err) {
          this.logger.error(`Failed to sync product ${product.id}: ${err.message}`);
          errors++;
        }
      }

      // 3. Ambil data Knowledge Base bebas
      const kbs = await this.prisma.knowledgeBase.findMany({
        where: tenantId ? { tenantId } : undefined
      });
      this.logger.log(`Found ${kbs.length} KnowledgeBase items to sync.`);

      for (const kb of kbs) {
        try {
          const embedding = await this.ragService.generateEmbedding(kb.content);
          
          const vectorString = `[${embedding.join(',')}]`;
          
          await this.prisma.$executeRawUnsafe(`
            INSERT INTO vector_knowledge (id, title, content, embedding, tenant_id, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3::vector, $4, CURRENT_TIMESTAMP)
          `, `KnowledgeBase: ${(kb.metadata as any)?.title || kb.id}`, kb.content, vectorString, kb.tenantId || null);
          inserted++;
        } catch (err) {
          this.logger.error(`Failed to sync KB item ${kb.id}: ${err.message}`);
          errors++;
        }
      }

      // 4. Masukkan Profil Tenant sebagai Vector
      if (tenantId) {
         const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
         if (tenant) {
            const tenantInfo = `Profil Toko: ${tenant.name}\nKategori: ${tenant.category || '-'}\nAlamat: ${tenant.address || '-'}\nJam Operasional: ${tenant.operatingHours || '-'}\nMetode Pembayaran: ${tenant.paymentMethods || '-'}\nPengiriman: ${tenant.shippingMethods || '-'}\nKebijakan Retur: ${tenant.returnPolicy || '-'}\nPromo Aktif: ${tenant.currentPromo || '-'}`;
            const tEmbedding = await this.ragService.generateEmbedding(tenantInfo);
            const tVectorString = `[${tEmbedding.join(',')}]`;

            await this.prisma.$executeRawUnsafe(`
              INSERT INTO vector_knowledge (id, title, content, embedding, tenant_id, updated_at)
              VALUES (gen_random_uuid(), $1, $2, $3::vector, $4, CURRENT_TIMESTAMP)
            `, `Profil Toko: ${tenant.name}`, tenantInfo, tVectorString, tenant.id);
            inserted++;
         }
      }

      this.logger.log(`Sync completed. Inserted: ${inserted}, Errors: ${errors}`);
      return { inserted, errors };
    } catch (error) {
      this.logger.error(`Critical error during knowledge base sync: ${error.message}`);
      throw new InternalServerErrorException('Failed to synchronize knowledge base');
    }
  }
}
