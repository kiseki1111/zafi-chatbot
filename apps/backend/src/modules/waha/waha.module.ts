import { Module } from '@nestjs/common';
import { WahaService } from './waha.service';
import { WahaController } from './waha.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { OmnichannelModule } from '../../core/omnichannel/omnichannel.module';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [PrismaModule, OmnichannelModule, AvailabilityModule],
  providers: [WahaService],
  controllers: [WahaController],
  exports: [WahaService],
})
export class WahaModule {}
