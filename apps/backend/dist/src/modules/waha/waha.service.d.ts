import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
export declare class WahaService {
    private readonly configService;
    private readonly prisma;
    private readonly logger;
    private readonly baseUrl;
    private readonly apiKey;
    constructor(configService: ConfigService, prisma: PrismaService);
    private getHeaders;
    private randomDelay;
    private adaptiveWpmDelay;
    sendTypingPresence(sessionName: string, chatId: string): Promise<void>;
    startSession(sessionName: string, webhookUrl?: string, channelAccountId?: string): Promise<any>;
    getSessions(): Promise<any>;
    sendMessage(sessionName: string, chatId: string, text: string): Promise<any>;
    sendImage(sessionName: string, chatId: string, imageUrl: string, caption?: string): Promise<any>;
    getQrCode(sessionName: string): Promise<any>;
    stopSession(sessionName: string): Promise<any>;
    logoutSession(sessionName: string): Promise<any>;
}
