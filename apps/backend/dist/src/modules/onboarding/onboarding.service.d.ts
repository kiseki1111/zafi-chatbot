import { PrismaService } from '../../core/prisma/prisma.service';
import { OpenAI } from 'openai';
import { DataAgentService } from '../../features/knowledge-ingest/data-agent.service';
export declare class OnboardingService {
    private prisma;
    private injectedOpenai;
    private dataAgentService;
    private readonly logger;
    private openai;
    constructor(prisma: PrismaService, injectedOpenai: OpenAI | null, dataAgentService: DataAgentService);
    handleMessage(chatId: string, text: string, session: any, sendMessageFn: (chatId: string, text: string) => Promise<void>): Promise<void>;
    private finalizeOnboarding;
}
