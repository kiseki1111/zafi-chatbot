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
var AgentSharedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentSharedService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const openai_module_1 = require("../openai/openai.module");
let AgentSharedService = AgentSharedService_1 = class AgentSharedService {
    prisma;
    injectedOpenai;
    logger = new common_1.Logger(AgentSharedService_1.name);
    openai;
    constructor(prisma, injectedOpenai) {
        this.prisma = prisma;
        this.injectedOpenai = injectedOpenai;
        this.openai = this.injectedOpenai;
    }
    async getRecentContext(chatId, instanceName, limit = 6) {
        try {
            const messages = await this.prisma.message.findMany({
                where: {
                    conversation: {
                        contact: { phone: chatId },
                        instanceName: instanceName
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            });
            return messages.reverse();
        }
        catch (e) {
            this.logger.error(`Error fetching recent context for ${chatId}: ${e.message}`);
            return [];
        }
    }
    async retrieveRelevantKnowledge(query, tenantId) {
        if (!this.openai) {
            return 'Sistem AI sedang tidak tersedia.';
        }
        try {
            const embeddingResponse = await this.openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: query,
                encoding_format: 'float',
            });
            const embedding = embeddingResponse.data[0].embedding;
            const vectorString = `[${embedding.join(',')}]`;
            const results = await this.prisma.$queryRawUnsafe(`
        SELECT 
          content,
          1 - (embedding <=> $1::vector) as similarity
        FROM vector_knowledge
        WHERE tenant_id = $2
        ORDER BY embedding <=> $1::vector
        LIMIT 5
      `, vectorString, tenantId);
            const filtered = results.filter(r => r.similarity > 0.3);
            if (filtered.length === 0) {
                return '';
            }
            return filtered.map(r => r.content).join('\\n\\n');
        }
        catch (e) {
            this.logger.error(`Error retrieving relevant knowledge: ${e.message}`);
            return '';
        }
    }
    async generateClarification(ambiguousText, missingInfo) {
        const prompt = `User saying: "${ambiguousText}"
We are missing the following information to proceed: ${missingInfo.join(', ')}

Please generate a polite, short, and natural clarification question in Indonesian asking the user to provide the missing information. 
Do not use Markdown. Keep it conversational.`;
        return this.callLLM(prompt, 'You are a helpful customer service assistant.');
    }
    async callLLM(prompt, systemPrompt, requireJson = false) {
        if (!this.openai) {
            throw new common_1.InternalServerErrorException('OPENAI_API_KEY is not configured');
        }
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                response_format: requireJson ? { type: 'json_object' } : { type: 'text' }
            });
            return response.choices[0].message?.content || '';
        }
        catch (error) {
            this.logger.error('Error in LLM call:', error);
            throw new common_1.InternalServerErrorException('Failed to generate response from LLM');
        }
    }
    async callLLMStream(prompt, systemPrompt, requireJson = false, onChunk) {
        if (!this.openai) {
            throw new common_1.InternalServerErrorException('OPENAI_API_KEY is not configured');
        }
        try {
            const stream = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                response_format: requireJson ? { type: 'json_object' } : { type: 'text' },
                stream: true
            });
            let fullContent = '';
            for await (const chunk of stream) {
                const textChunk = chunk.choices[0]?.delta?.content || '';
                if (textChunk) {
                    fullContent += textChunk;
                    onChunk(textChunk);
                }
            }
            return fullContent;
        }
        catch (error) {
            this.logger.error('Error in LLM stream call:', error);
            throw new common_1.InternalServerErrorException('Failed to generate stream response from LLM');
        }
    }
    async analyzeImage(mediaUrl, prompt = "Deskripsikan apa isi gambar ini dengan singkat dan jelas, fokus pada nama produk, merk, jumlah, atau informasi harga jika ada.") {
        if (!this.openai)
            return '';
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: mediaUrl } }
                        ]
                    }
                ],
                max_tokens: 300,
            });
            return response.choices[0].message?.content || '';
        }
        catch (e) {
            this.logger.error(`Error analyzing image: ${e}`);
            return '';
        }
    }
    async detectIntent(userText) {
        const systemPrompt = `You are an intent detection engine. 
Classify the user's text into exactly ONE of the following categories:
- DESIGN: user wants to make a poster, brochure, or graphic design.
- INGEST: user wants to save product info, price, or knowledge base.
- CATALOG: user wants to see the list of all products or house types.
- CS: user is asking a general question, asking for a specific price, chatting, or anything else.

Respond with ONLY the category word.`;
        try {
            const result = await this.callLLM(userText, systemPrompt, false);
            const cleanResult = result.trim().toUpperCase();
            if (['DESIGN', 'INGEST', 'CATALOG', 'CS'].includes(cleanResult)) {
                return cleanResult;
            }
            return 'CS';
        }
        catch (e) {
            return 'CS';
        }
    }
};
exports.AgentSharedService = AgentSharedService;
exports.AgentSharedService = AgentSharedService = AgentSharedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(openai_module_1.OPENAI_CLIENT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], AgentSharedService);
//# sourceMappingURL=agent-shared.service.js.map