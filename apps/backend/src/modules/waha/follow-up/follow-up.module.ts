import { Module } from '@nestjs/common';
import { FollowUpService } from './follow-up.service';
import { FollowUpController } from './follow-up.controller';
import { PrismaModule } from '../../../core/prisma/prisma.module';
import { WahaModule } from '../waha.module';
import { OpenAiModule } from '../../../core/openai/openai.module';
import { AgentSharedModule } from '../../../core/agent-shared/agent-shared.module';

@Module({
  imports: [PrismaModule, WahaModule, OpenAiModule, AgentSharedModule],
  providers: [FollowUpService],
  controllers: [FollowUpController],
  exports: [FollowUpService],
})
export class FollowUpModule {}