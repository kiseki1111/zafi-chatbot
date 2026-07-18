import { Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { RagService } from './rag.service';
import { DataAgentService } from './data-agent.service';

@Module({
  providers: [KnowledgeService, RagService, DataAgentService],
  controllers: [KnowledgeController],
  exports: [RagService, KnowledgeService, DataAgentService]
})
export class KnowledgeModule {}
