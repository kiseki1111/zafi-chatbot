import { KnowledgeService } from './knowledge.service';
export declare class KnowledgeController {
    private readonly knowledgeService;
    constructor(knowledgeService: KnowledgeService);
    findAll(req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        content: string;
        title: string;
    }[]>;
    createText(req: any, body: {
        title: string;
        content: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        content: string;
        title: string;
    }>;
    createFile(req: any, file: Express.Multer.File, title?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        content: string;
        title: string;
    }>;
    update(id: string, req: any, body: {
        title: string;
        content: string;
        tenantId?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        content: string;
        title: string;
    }>;
    remove(id: string, req: any): Promise<{
        success: boolean;
    }>;
}
