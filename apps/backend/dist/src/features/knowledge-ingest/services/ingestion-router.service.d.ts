import { ExcelParser } from './parsers/excel-parser';
import { DocumentParser } from './parsers/document-parser';
import { ImageParser } from './parsers/image-parser';
import { KnowledgeAiService } from './knowledge-ai.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DataAgentService } from '../data-agent.service';
export declare class IngestionRouterService {
    private readonly excelParser;
    private readonly documentParser;
    private readonly imageParser;
    private readonly knowledgeAiService;
    private readonly prisma;
    private readonly dataAgentService;
    private readonly logger;
    constructor(excelParser: ExcelParser, documentParser: DocumentParser, imageParser: ImageParser, knowledgeAiService: KnowledgeAiService, prisma: PrismaService, dataAgentService: DataAgentService);
    routeAndProcess(mimeType: string, buffer: Buffer | null, text: string | null, tenantId: string | null): Promise<string>;
}
