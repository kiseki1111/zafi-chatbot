import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RagService } from './rag.service';
export declare class DataAgentService {
    private prisma;
    private ragService;
    private readonly logger;
    constructor(prisma: PrismaService, ragService: RagService);
    syncKnowledgeBase(tenantId?: string): Promise<{
        inserted: number;
        errors: number;
    }>;
}
