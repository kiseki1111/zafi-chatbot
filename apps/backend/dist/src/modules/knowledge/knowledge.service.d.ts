import { PrismaService } from '../../core/prisma/prisma.service';
import { OpenAI } from 'openai';
export declare class KnowledgeService {
    private readonly prisma;
    private readonly openai;
    constructor(prisma: PrismaService, openai: OpenAI);
    findAll(tenantId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        content: string;
        title: string;
    }[]>;
    findOne(id: string, tenantId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        content: string;
        title: string;
    }>;
    private getEmbedding;
    createText(tenantId: string, title: string, content: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        content: string;
        title: string;
    }>;
    processFile(file: Express.Multer.File): Promise<string>;
    createFile(tenantId: string, file: Express.Multer.File, title?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        content: string;
        title: string;
    }>;
    update(id: string, tenantId: string, title: string, content: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        content: string;
        title: string;
    }>;
    remove(id: string, tenantId: string): Promise<{
        success: boolean;
    }>;
}
