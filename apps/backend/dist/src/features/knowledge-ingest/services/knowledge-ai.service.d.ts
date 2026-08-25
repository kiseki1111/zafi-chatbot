import { ConfigService } from '@nestjs/config';
import { ExtractedProductDto } from '../dto/extracted-product.dto';
export interface TextExtractionResult {
    intent: 'small_talk' | 'ingestion_product' | 'ingestion_knowledge' | 'ingestion_mixed';
    replyMessage: string;
    products: ExtractedProductDto[];
    knowledge_chunks: string[];
}
export declare class KnowledgeAiService {
    private readonly configService;
    private readonly logger;
    private openai;
    constructor(configService: ConfigService);
    cleanTextToJSON(rawText: string): Promise<TextExtractionResult>;
}
