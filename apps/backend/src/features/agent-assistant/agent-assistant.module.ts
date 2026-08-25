import { Module, forwardRef } from '@nestjs/common';
import { AgentAssistantService } from './agent-assistant.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { KnowledgeIngestModule } from '../knowledge-ingest/knowledge-ingest.module';
import { OpenAiModule } from '../../core/openai/openai.module';
import { AgentSharedModule } from '../../core/agent-shared/agent-shared.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => KnowledgeIngestModule),
    OpenAiModule,
    AgentSharedModule,
  ],
  providers: [AgentAssistantService],
  exports: [AgentAssistantService],
})
export class AgentAssistantModule {}
