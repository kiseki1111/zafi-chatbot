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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RagService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const openai_module_1 = require("../../infrastructure/openai/openai.module");
let RagService = RagService_1 = class RagService {
    configService;
    prisma;
    injectedOpenai;
    openai;
    logger = new common_1.Logger(RagService_1.name);
    constructor(configService, prisma, injectedOpenai) {
        this.configService = configService;
        this.prisma = prisma;
        this.injectedOpenai = injectedOpenai;
        this.openai = this.injectedOpenai;
    }
    async generateEmbedding(text) {
        if (!this.openai) {
            throw new common_1.InternalServerErrorException('OpenAI client is not initialized');
        }
        try {
            const response = await this.openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: text,
            });
            return response.data[0].embedding;
        }
        catch (error) {
            this.logger.error(`Error generating embedding: ${error.message}`);
            throw new common_1.InternalServerErrorException('Failed to generate embedding');
        }
    }
    async getCatalogContext(tenantId) {
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
        }
        catch (error) {
            this.logger.error(`Error fetching catalog context: ${error.message}`);
            return '';
        }
    }
    async searchRelevantContext(query, topK = 10, tenantId) {
        try {
            const queryEmbedding = await this.generateEmbedding(query);
            const vectorString = `[${queryEmbedding.join(',')}]`;
            let results;
            if (tenantId) {
                results = await this.prisma.$queryRaw `
           SELECT id, title, content, 
                  1 - (embedding <=> ${vectorString}::vector) AS similarity
           FROM vector_knowledge
           WHERE tenant_id = ${tenantId}
           ORDER BY embedding <=> ${vectorString}::vector
           LIMIT ${topK};
         `;
            }
            else {
                results = await this.prisma.$queryRaw `
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
            const threshold = 0.2;
            const relevantResults = results.filter(r => r.similarity >= threshold);
            if (relevantResults.length === 0) {
                return '';
            }
            const contextBlocks = relevantResults.map((r, index) => {
                return `--- Referensi ${index + 1} (Similarity: ${(r.similarity * 100).toFixed(1)}%) ---\nJudul: ${r.title}\nIsi:\n${r.content}`;
            });
            return contextBlocks.join('\n\n');
        }
        catch (error) {
            this.logger.error(`Error fetching relevant context via pgvector: ${error.message}`);
            return '';
        }
    }
};
exports.RagService = RagService;
exports.RagService = RagService = RagService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(openai_module_1.OPENAI_CLIENT)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService, Object])
], RagService);
//# sourceMappingURL=rag.service.js.map