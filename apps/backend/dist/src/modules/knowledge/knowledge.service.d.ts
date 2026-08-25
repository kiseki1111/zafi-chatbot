import { PrismaService } from '../../core/prisma/prisma.service';
import { OpenAI } from 'openai';
export declare class KnowledgeService {
    private readonly prisma;
    private readonly openai;
    constructor(prisma: PrismaService, openai: OpenAI);
    findAll(tenantId: string): Promise<{
        id: string;
        title: string;
        content: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string, tenantId: string): Promise<{
        id: string;
        title: string;
        content: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    private getEmbedding;
    createText(tenantId: string, title: string, content: string): Promise<{
        id: string;
        title: string;
        content: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    processFile(file: Express.Multer.File): Promise<string>;
    createFile(tenantId: string, file: Express.Multer.File, title?: string): Promise<{
        id: string;
        title: string;
        content: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, tenantId: string, title: string, content: string): Promise<{
        id: string;
        title: string;
        content: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string, tenantId: string): Promise<{
        success: boolean;
    }>;
}
