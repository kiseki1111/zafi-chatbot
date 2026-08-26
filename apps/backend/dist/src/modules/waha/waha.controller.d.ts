import { WahaService } from './waha.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OmnichannelQueueService } from '../../core/omnichannel/omnichannel-queue.service';
export declare class WahaController {
    private readonly wahaService;
    private readonly prisma;
    private readonly omnichannelQueue;
    private readonly logger;
    private cliOutputQueue;
    constructor(wahaService: WahaService, prisma: PrismaService, omnichannelQueue: OmnichannelQueueService);
    createInstance(name: string, webhookUrl?: string, channelAccountId?: string, tenantId?: string): Promise<any>;
    stopInstance(id: string): Promise<any>;
    logoutInstance(id: string): Promise<any>;
    deleteInstance(id: string): Promise<{
        success: boolean;
    }>;
    getInstances(): Promise<any>;
    getInstancesFromDb(req: any): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        phone: string | null;
        instanceName: string;
        channelAccountId: string | null;
        profileName: string | null;
        profilePicture: string | null;
        qrCode: string | null;
        provider: string;
        webhookUrl: string | null;
        messagesSent: number;
        messagesReceived: number;
        messagesFailed: number;
        lastConnectedAt: Date | null;
    }[]>;
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
}
