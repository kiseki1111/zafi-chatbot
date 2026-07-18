import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateChannelAccountDto } from './dto/create-channel-account.dto';
import { UpdateChannelAccountDto } from './dto/update-channel-account.dto';
export declare class ChannelAccountsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(createChannelAccountDto: CreateChannelAccountDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        description: string | null;
        platform: string;
    }>;
    findAll(): Promise<({
        whatsappInstances: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            instanceName: string;
            channelAccountId: string | null;
            phone: string | null;
            profileName: string | null;
            profilePicture: string | null;
            qrCode: string | null;
            provider: string;
            webhookUrl: string | null;
            messagesSent: number;
            messagesReceived: number;
            messagesFailed: number;
            lastConnectedAt: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        description: string | null;
        platform: string;
    })[]>;
    findOne(id: string): Promise<({
        whatsappInstances: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            instanceName: string;
            channelAccountId: string | null;
            phone: string | null;
            profileName: string | null;
            profilePicture: string | null;
            qrCode: string | null;
            provider: string;
            webhookUrl: string | null;
            messagesSent: number;
            messagesReceived: number;
            messagesFailed: number;
            lastConnectedAt: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        description: string | null;
        platform: string;
    }) | null>;
    update(id: string, updateChannelAccountDto: UpdateChannelAccountDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        description: string | null;
        platform: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        description: string | null;
        platform: string;
    }>;
}
