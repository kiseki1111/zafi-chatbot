import { Module } from '@nestjs/common';
import { WahaService } from './waha.service';
import { WahaController } from './waha.controller';
import { HrisAssistantRelayService } from './hris-assistant-relay.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { OmnichannelModule } from '../../core/omnichannel/omnichannel.module';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [PrismaModule, OmnichannelModule, AvailabilityModule],
  providers: [WahaService, HrisAssistantRelayService],
  controllers: [WahaController],
  exports: [WahaService],
})
export class WahaModule {}
