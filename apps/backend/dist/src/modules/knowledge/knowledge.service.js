"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const openai_module_1 = require("../../core/openai/openai.module");
const openai_1 = require("openai");
const uuid_1 = require("uuid");
const pdfParse = require('pdf-parse');
const mammoth = __importStar(require("mammoth"));
let KnowledgeService = class KnowledgeService {
    prisma;
    openai;
    constructor(prisma, openai) {
        this.prisma = prisma;
        this.openai = openai;
    }
    async findAll(tenantId) {
        return this.prisma.vectorKnowledge.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                content: true,
                metadata: true,
                tenantId: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
    async findOne(id, tenantId) {
        const item = await this.prisma.vectorKnowledge.findFirst({
            where: { id, tenantId },
            select: {
                id: true,
                title: true,
                content: true,
                metadata: true,
                tenantId: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!item) {
            throw new common_1.NotFoundException('Knowledge not found');
        }
        return item;
    }
    async getEmbedding(text) {
        if (!this.openai) {
            throw new common_1.BadRequestException('OpenAI client is not configured');
        }
        try {
            const response = await this.openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: text,
            });
            return response.data[0].embedding;
        }
        catch (error) {
            console.error('Error generating embedding:', error?.response?.data || error);
            throw new common_1.BadRequestException('Failed to generate embedding: ' + (error.message || 'Unknown error'));
        }
    }
    async createText(tenantId, title, content) {
        const embedding = await this.getEmbedding(content);
        const id = (0, uuid_1.v4)();
        const metadataStr = JSON.stringify({ title, type: 'text' });
        const embeddingStr = `[${embedding.join(',')}]`;
        try {
            await this.prisma.$executeRawUnsafe(`INSERT INTO "knowledge_base" (id, content, metadata, tenant_id, embedding, created_at, updated_at) 
         VALUES ($1, $2, $3::jsonb, $4, $5::vector, NOW(), NOW())`, id, content, metadataStr, tenantId, embeddingStr);
            await this.prisma.$executeRawUnsafe(`INSERT INTO "vector_knowledge" (id, title, content, metadata, tenant_id, embedding, created_at, updated_at) 
         VALUES ($1, $2, $3, $4::jsonb, $5, $6::vector, NOW(), NOW())`, id, title, content, metadataStr, tenantId, embeddingStr);
        }
        catch (error) {
            console.error('DB Insert Error:', error);
            throw new common_1.BadRequestException('Database insert failed: ' + error.message);
        }
        return this.findOne(id, tenantId);
    }
    async processFile(file) {
        if (!file)
            throw new common_1.BadRequestException('File is required');
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        let content = '';
        if (ext === 'pdf') {
            const parsed = await pdfParse(file.buffer);
            content = parsed.text;
        }
        else if (ext === 'doc' || ext === 'docx') {
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            content = result.value;
        }
        else if (ext === 'txt') {
            content = file.buffer.toString('utf8');
        }
        else {
            throw new common_1.BadRequestException('Unsupported file format. Use PDF, DOCX, or TXT.');
        }
        content = content.replace(/\n+/g, '\n').trim();
        if (!content)
            throw new common_1.BadRequestException('Could not extract text from file');
        return content;
    }
    async createFile(tenantId, file, title) {
        const content = await this.processFile(file);
        const finalTitle = title || file.originalname;
        const embedding = await this.getEmbedding(content);
        const id = (0, uuid_1.v4)();
        const metadataStr = JSON.stringify({ title: finalTitle, type: 'file', filename: file.originalname });
        const embeddingStr = `[${embedding.join(',')}]`;
        try {
            await this.prisma.$executeRawUnsafe(`INSERT INTO "knowledge_base" (id, content, metadata, tenant_id, embedding, created_at, updated_at) 
         VALUES ($1, $2, $3::jsonb, $4, $5::vector, NOW(), NOW())`, id, content, metadataStr, tenantId, embeddingStr);
            await this.prisma.$executeRawUnsafe(`INSERT INTO "vector_knowledge" (id, title, content, metadata, tenant_id, embedding, created_at, updated_at) 
         VALUES ($1, $2, $3, $4::jsonb, $5, $6::vector, NOW(), NOW())`, id, finalTitle, content, metadataStr, tenantId, embeddingStr);
        }
        catch (error) {
            console.error('DB Insert Error:', error);
            throw new common_1.BadRequestException('Database insert failed: ' + error.message);
        }
        return this.findOne(id, tenantId);
    }
    async update(id, tenantId, title, content) {
        const item = await this.findOne(id, tenantId);
        const embedding = await this.getEmbedding(content);
        const embeddingStr = `[${embedding.join(',')}]`;
        const existingMetadata = item.metadata || {};
        const metadataStr = JSON.stringify({ ...existingMetadata, title });
        await this.prisma.$executeRawUnsafe(`UPDATE "knowledge_base" 
       SET content = $1, metadata = $2::jsonb, embedding = $3::vector, updated_at = NOW() 
       WHERE id = $4 AND tenant_id = $5`, content, metadataStr, embeddingStr, id, tenantId);
        await this.prisma.$executeRawUnsafe(`UPDATE "vector_knowledge" 
       SET title = $1, content = $2, metadata = $3::jsonb, embedding = $4::vector, updated_at = NOW() 
       WHERE id = $5 AND tenant_id = $6`, title, content, metadataStr, embeddingStr, id, tenantId);
        return this.findOne(id, tenantId);
    }
    async remove(id, tenantId) {
        await this.findOne(id, tenantId);
        await this.prisma.knowledgeBase.deleteMany({
            where: { id, tenantId },
        });
        await this.prisma.vectorKnowledge.deleteMany({
            where: { id, tenantId },
        });
        return { success: true };
    }
};
exports.KnowledgeService = KnowledgeService;
exports.KnowledgeService = KnowledgeService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(openai_module_1.OPENAI_CLIENT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        openai_1.OpenAI])
], KnowledgeService);
//# sourceMappingURL=knowledge.service.js.map