import { Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { RagService } from './rag.service';

@Module({
  providers: [KnowledgeService, RagService],
  controllers: [KnowledgeController],
  exports: [RagService, KnowledgeService]
})
export class KnowledgeModule {}
