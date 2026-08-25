import { KnowledgeService } from './knowledge.service';
export declare class KnowledgeController {
    private readonly knowledgeService;
    constructor(knowledgeService: KnowledgeService);
    findAll(req: any): Promise<{
        id: string;
        title: string;
        content: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    createText(req: any, body: {
        title: string;
        content: string;
    }): Promise<{
        id: string;
        title: string;
        content: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createFile(req: any, file: Express.Multer.File, title?: string): Promise<{
        id: string;
        title: string;
        content: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, req: any, body: {
        title: string;
        content: string;
        tenantId?: string;
    }): Promise<{
        id: string;
        title: string;
        content: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string, req: any): Promise<{
        success: boolean;
    }>;
}
