import { OpenAI } from 'openai';
import { RagService } from '../knowledge-ingest/rag.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AgentSharedService } from '../../core/agent-shared/agent-shared.service';
import { IngestionRouterService } from '../knowledge-ingest/services/ingestion-router.service';
import { DataAgentService } from '../knowledge-ingest/data-agent.service';
export declare class AgentAssistantService {
    private ragService;
    private injectedOpenai;
    private prisma;
    private readonly agentSharedService;
    private ingestionRouterService;
    private dataAgentService;
    private openai;
    private readonly logger;
    constructor(ragService: RagService, injectedOpenai: OpenAI | null, prisma: PrismaService, agentSharedService: AgentSharedService, ingestionRouterService: IngestionRouterService, dataAgentService: DataAgentService);
    detectOwnerIntent(message: string, mediaUrls?: string[]): Promise<'INGEST_KNOWLEDGE' | 'GENERAL_ASSISTANT'>;
    chatWithOwnerAssistant(text: string, tenantId?: string, chatId?: string, onChunk?: (chunk: string) => void): Promise<string>;
}
