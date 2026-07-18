import { WahaService } from './waha.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { DesignFlowService } from '../telegram/design/design-flow.service';
import { DesignSessionService } from '../telegram/design/design-session.service';
export declare class WahaController {
    private readonly wahaService;
    private readonly prisma;
    private readonly aiService;
    private readonly designFlowService;
    private readonly designSessionService;
    private readonly logger;
    private messageBuffer;
    private processingQueue;
    private isProcessingQueue;
    private cliOutputQueue;
    constructor(wahaService: WahaService, prisma: PrismaService, aiService: AiService, designFlowService: DesignFlowService, designSessionService: DesignSessionService);
    createInstance(name: string, webhookUrl?: string, channelAccountId?: string): Promise<any>;
    stopInstance(id: string): Promise<any>;
    logoutInstance(id: string): Promise<any>;
    deleteInstance(id: string): Promise<{
        success: boolean;
    }>;
    getInstances(): Promise<any>;
    getQrCode(id: string, res: any): Promise<any>;
    sendMessage(id: string, body: {
        chatId: string;
        text: string;
    }): Promise<{
        success: boolean;
        messageId: string;
    }>;
    getLogs(id: string): Promise<{
        id: string;
        createdAt: Date;
        instanceName: string;
        event: string;
        payload: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    cliPoll(): Promise<any[]>;
    handleWebhook(payload: any): Promise<{
        status: string;
    }>;
    private processQueue;
}
