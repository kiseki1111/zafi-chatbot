import { Module } from '@nestjs/common';
import { AgentSharedService } from './agent-shared.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OpenAiModule } from '../openai/openai.module';

@Module({
  imports: [PrismaModule, OpenAiModule],
  providers: [AgentSharedService],
  exports: [AgentSharedService],
})
export class AgentSharedModule {}
