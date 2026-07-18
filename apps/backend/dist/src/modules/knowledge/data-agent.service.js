"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DataAgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataAgentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const rag_service_1 = require("./rag.service");
let DataAgentService = DataAgentService_1 = class DataAgentService {
    prisma;
    ragService;
    logger = new common_1.Logger(DataAgentService_1.name);
    constructor(prisma, ragService) {
        this.prisma = prisma;
        this.ragService = ragService;
    }
    async syncKnowledgeBase(tenantId) {
        this.logger.log(`Starting manual sync of master data to vector database${tenantId ? ' for tenant ' + tenantId : ''}...`);
        let inserted = 0;
        let errors = 0;
        try {
            if (tenantId) {
                await this.prisma.vectorKnowledge.deleteMany({
                    where: { tenantId }
                });
            }
            else {
                await this.prisma.vectorKnowledge.deleteMany();
            }
            this.logger.log('Cleared existing VectorKnowledge records.');
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
                }
                catch (err) {
                    this.logger.error(`Failed to sync product ${product.id}: ${err.message}`);
                    errors++;
                }
            }
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
          `, `KnowledgeBase: ${kb.metadata?.title || kb.id}`, kb.content, vectorString, kb.tenantId || null);
                    inserted++;
                }
                catch (err) {
                    this.logger.error(`Failed to sync KB item ${kb.id}: ${err.message}`);
                    errors++;
                }
            }
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
        }
        catch (error) {
            this.logger.error(`Critical error during knowledge base sync: ${error.message}`);
            throw new common_1.InternalServerErrorException('Failed to synchronize knowledge base');
        }
    }
};
exports.DataAgentService = DataAgentService;
exports.DataAgentService = DataAgentService = DataAgentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        rag_service_1.RagService])
], DataAgentService);
//# sourceMappingURL=data-agent.service.js.map