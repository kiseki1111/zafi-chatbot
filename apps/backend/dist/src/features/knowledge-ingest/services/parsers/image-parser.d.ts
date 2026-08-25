import { ConfigService } from '@nestjs/config';
import { ExtractedProductDto } from '../../dto/extracted-product.dto';
export declare class ImageParser {
    private readonly configService;
    private readonly logger;
    private openai;
    constructor(configService: ConfigService);
    parseImage(buffer: Buffer): Promise<ExtractedProductDto[]>;
}
