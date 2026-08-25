import { PrismaService } from '../prisma/prisma.service';
import { OpenAI } from 'openai';
export declare class AgentSharedService {
    private readonly prisma;
    private readonly injectedOpenai;
    private readonly logger;
    private openai;
    constructor(prisma: PrismaService, injectedOpenai: OpenAI | null);
    getRecentContext(chatId: string, instanceName: string, limit?: number): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        content: string;
        wahaMessageId: string | null;
        conversationId: string;
        senderType: string;
        senderId: string | null;
        messageType: string;
    }[]>;
    retrieveRelevantKnowledge(query: string, tenantId: string): Promise<string>;
    generateClarification(ambiguousText: string, missingInfo: string[]): Promise<string>;
    callLLM(prompt: string, systemPrompt: string, requireJson?: boolean): Promise<string>;
    callLLMStream(prompt: string, systemPrompt: string, requireJson: boolean | undefined, onChunk: (chunk: string) => void): Promise<string>;
    analyzeImage(mediaUrl: string, prompt?: string): Promise<string>;
    detectIntent(userText: string): Promise<string>;
}
