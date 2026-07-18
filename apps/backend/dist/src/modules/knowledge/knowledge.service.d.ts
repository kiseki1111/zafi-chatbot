import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RagService } from './rag.service';
export declare class KnowledgeService {
    private configService;
    private prisma;
    private ragService;
    private readonly logger;
    constructor(configService: ConfigService, prisma: PrismaService, ragService: RagService);
    syncFromGoogleSheet(): Promise<any>;
}
