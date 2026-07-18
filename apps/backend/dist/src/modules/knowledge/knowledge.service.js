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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var KnowledgeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const rag_service_1 = require("./rag.service");
const axios_1 = __importDefault(require("axios"));
const csvParser = require("csv-parser");
let KnowledgeService = KnowledgeService_1 = class KnowledgeService {
    configService;
    prisma;
    ragService;
    logger = new common_1.Logger(KnowledgeService_1.name);
    constructor(configService, prisma, ragService) {
        this.configService = configService;
        this.prisma = prisma;
        this.ragService = ragService;
    }
    async syncFromGoogleSheet() {
        const sheetId = this.configService.get('KNOWLEDGE_SHEET_ID');
        if (!sheetId) {
            throw new common_1.BadRequestException('KNOWLEDGE_SHEET_ID is not configured in .env');
        }
        this.logger.log(`Starting sync from Google Sheet: ${sheetId}`);
        const sheetNames = ['customer', 'produk', 'dokumen'];
        let syncedCount = 0;
        try {
            await this.prisma.knowledgeBase.deleteMany({});
            for (const sheetName of sheetNames) {
                const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
                let response;
                try {
                    response = await axios_1.default.get(csvUrl, { responseType: 'stream' });
                }
                catch (err) {
                    this.logger.warn(`Could not fetch sheet '${sheetName}'. It might not exist or is empty.`);
                    continue;
                }
                const results = [];
                await new Promise((resolve, reject) => {
                    response.data
                        .pipe(csvParser())
                        .on('data', (data) => results.push(data))
                        .on('end', () => resolve(results))
                        .on('error', (error) => reject(error));
                });
                if (results.length === 0) {
                    this.logger.warn(`Sheet '${sheetName}' is empty.`);
                    continue;
                }
                for (const row of results) {
                    const rowText = Object.entries(row)
                        .filter(([_, value]) => value && value.trim() !== '')
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ');
                    if (!rowText)
                        continue;
                    const finalContext = `[Kategori: ${sheetName.toUpperCase()}] ${rowText}`;
                    const embedding = await this.ragService.generateEmbedding(finalContext);
                    const embeddingString = `[${embedding.join(',')}]`;
                    await this.prisma.$executeRawUnsafe(`
            INSERT INTO knowledge_base (id, content, embedding, "created_at", "updated_at")
            VALUES (gen_random_uuid(), $1, $2::vector, NOW(), NOW())
          `, finalContext, embeddingString);
                    syncedCount++;
                }
            }
            this.logger.log(`Successfully synced ${syncedCount} rows from Google Sheet.`);
            return { success: true, syncedCount };
        }
        catch (error) {
            this.logger.error(`Error syncing from Google Sheet: ${error.message}`);
            if (error.response && error.response.status === 401 || error.response?.status === 404) {
                throw new common_1.BadRequestException('Could not access Google Sheet. Please make sure the sheet is public (Anyone with the link can view) and the ID is correct.');
            }
            throw new common_1.InternalServerErrorException('Failed to sync knowledge base.');
        }
    }
};
exports.KnowledgeService = KnowledgeService;
exports.KnowledgeService = KnowledgeService = KnowledgeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        rag_service_1.RagService])
], KnowledgeService);
//# sourceMappingURL=knowledge.service.js.map