import { ConfigService } from '@nestjs/config';
export interface DesignSummaryResult {
    summary_id: string;
    english_prompt: string;
    image_size: string;
}
export interface DesignRevisionResult {
    analysis_a: string;
    analysis_b?: string;
    combined_prompt: string;
    image_size: string;
}
export declare class DesignAiService {
    private readonly configService;
    private readonly logger;
    private openai;
    constructor(configService: ConfigService);
    summarizePrompt(userPrompt: string, previousSummary?: string | null): Promise<DesignSummaryResult | null>;
    analyzeMultipleImagesAndSummarize(existingSummary: string | object, imagesBase64Array: string[], userNotes: string): Promise<DesignSummaryResult | null>;
    analyzeRevision(lastImageUrl: string, newReferencesBase64Array: string[], userRequest: string): Promise<DesignRevisionResult | null>;
}
