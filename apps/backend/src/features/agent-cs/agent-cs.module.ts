import { Module } from '@nestjs/common';
import { CsService } from './cs.service';
import { PrismaModule } from '../../core/prisma/prisma.module';

import { AgentSharedModule } from '../../core/agent-shared/agent-shared.module';

@Module({
  imports: [PrismaModule, AgentSharedModule],
  providers: [CsService],
  exports: [CsService],
})
export class AgentCsModule {}
