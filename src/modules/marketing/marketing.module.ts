import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { KprController } from './kpr.controller';
import { KprService } from './kpr.service';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [PrismaModule],
  controllers: [ListingController, BookingController, KprController, SalesController],
  providers: [ListingService, BookingService, KprService, SalesService]
})
export class MarketingModule {}
