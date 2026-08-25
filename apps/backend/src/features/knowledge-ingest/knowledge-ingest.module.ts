import { Module } from '@nestjs/common';
import { ExcelParser } from './services/parsers/excel-parser';
import { DocumentParser } from './services/parsers/document-parser';
import { ImageParser } from './services/parsers/image-parser';
import { KnowledgeAiService } from './services/knowledge-ai.service';
import { IngestionRouterService } from './services/ingestion-router.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { RagService } from './rag.service';
import { DataAgentService } from './data-agent.service';

import { AgentSharedModule } from '../../core/agent-shared/agent-shared.module';

@Module({
  imports: [PrismaModule, ConfigModule, AgentSharedModule],
  providers: [
    ExcelParser,
    DocumentParser,
    ImageParser,
    KnowledgeAiService,
    IngestionRouterService,
    RagService,
    DataAgentService,
  ],
  exports: [IngestionRouterService, RagService, DataAgentService],
})
export class KnowledgeIngestModule {}
