import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { RagService } from '../knowledge/rag.service';
export declare class AiService {
    private configService;
    private ragService;
    private injectedOpenai;
    private openai;
    private logger;
    constructor(configService: ConfigService, ragService: RagService, injectedOpenai: OpenAI | null);
    generateBrainstormResponse(prompt: string, context?: string): Promise<string>;
    generateImagePrompt(prompt: string, style: string): Promise<string>;
    private rewriteQueryAndDetectIntent;
    detectTopLevelIntent(message: string): Promise<'CS' | 'DESIGN'>;
    generateLunaResponse(message: string, senderNumber?: string, chatHistory?: any[], tenantId?: string): Promise<string>;
}
