import { Module } from '@nestjs/common';
import { OmnichannelQueueService } from './omnichannel-queue.service';
import { AgentCsModule } from '../../features/agent-cs/agent-cs.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [AgentCsModule],
  providers: [OmnichannelQueueService, PrismaService],
  exports: [OmnichannelQueueService],
})
export class OmnichannelModule {}
