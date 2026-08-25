import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OpenAI } from 'openai';
export declare class RagService {
    private configService;
    private prisma;
    private injectedOpenai;
    private openai;
    private readonly logger;
    constructor(configService: ConfigService, prisma: PrismaService, injectedOpenai: OpenAI | null);
    generateEmbedding(text: string): Promise<number[]>;
    getCatalogContext(tenantId?: string): Promise<string>;
    searchRelevantContext(query: string, topK?: number, tenantId?: string): Promise<string>;
}
