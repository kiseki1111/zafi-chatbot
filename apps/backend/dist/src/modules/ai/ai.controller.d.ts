import { AiService } from './ai.service';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    brainstorm(prompt: string, context: string): Promise<{
        result: string;
    }>;
    generateImage(prompt: string, style: string): Promise<{
        imageUrl: string;
        enhancedPrompt: string;
    }>;
}
