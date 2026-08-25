import { Module } from '@nestjs/common';
import { OmnichannelQueueService } from './omnichannel-queue.service';
import { AgentCsModule } from '../../features/agent-cs/agent-cs.module';

@Module({
  imports: [AgentCsModule],
  providers: [OmnichannelQueueService],
  exports: [OmnichannelQueueService],
})
export class OmnichannelModule {}
