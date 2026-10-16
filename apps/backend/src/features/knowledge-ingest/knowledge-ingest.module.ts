import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { RagService } from './rag.service';
import { DataAgentService } from './data-agent.service';
import { AgentSharedModule } from '../../core/agent-shared/agent-shared.module';

@Module({
  imports: [PrismaModule, ConfigModule, AgentSharedModule],
  providers: [RagService, DataAgentService],
  exports: [RagService, DataAgentService],
})
export class KnowledgeIngestModule {}
