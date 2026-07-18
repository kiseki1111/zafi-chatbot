import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class DesignSessionService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    getSession(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        userId: string;
        expiresAt: Date;
        step: string;
        lastActive: Date;
    } | null>;
    isExpired(session: any): boolean;
    createSession(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        userId: string;
        expiresAt: Date;
        step: string;
        lastActive: Date;
    }>;
    updateSession(userId: string, step: string, newData?: object): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        userId: string;
        expiresAt: Date;
        step: string;
        lastActive: Date;
    }>;
    saveGeneration(userId: string, prompt: string | null, imageUrl: string | null, designType: string, status?: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        userId: string;
        imageUrl: string | null;
        prompt: string | null;
        designType: string | null;
    }>;
    saveAssetToSupabase(userId: string, imageBase64: string, metadata?: object): Promise<string | null>;
}
