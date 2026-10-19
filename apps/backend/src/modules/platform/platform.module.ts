import { Module } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';
import { AgentSharedModule } from '../../core/agent-shared/agent-shared.module';

@Module({
  imports: [AgentSharedModule],
  providers: [PlatformService],
  controllers: [PlatformController],
  exports: [PlatformService],
})
export class PlatformModule {}