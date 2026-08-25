import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
// OpenAiModule is global, no need to import unless required. Let's import just in case if it's not global everywhere.
import { OpenAiModule } from '../../core/openai/openai.module';

@Module({
  imports: [PrismaModule, OpenAiModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
