import { ConfigService } from '@nestjs/config';
export interface ImageGenerateResult {
    success: boolean;
    imageBase64?: string;
    generatedPrompt?: string;
    error?: string;
}
export declare class DesignImageService {
    private readonly configService;
    private readonly logger;
    private openaiImage;
    private openaiChat;
    constructor(configService: ConfigService);
    private base64ToReadable;
    base64ToBuffer(base64String: string): Buffer;
    generate(prompt: string, size?: string): Promise<ImageGenerateResult>;
    generateWithReference(base64Aset: string, base64Referensi: string, instruksiTambahan?: string, size?: string): Promise<ImageGenerateResult>;
}
