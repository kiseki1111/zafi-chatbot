import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { OpenAiModule } from '../../core/openai/openai.module';
import { KnowledgeIngestModule } from '../../features/knowledge-ingest/knowledge-ingest.module';

@Module({
  imports: [PrismaModule, OpenAiModule, KnowledgeIngestModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
