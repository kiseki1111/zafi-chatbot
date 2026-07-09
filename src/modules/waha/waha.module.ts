import { Module } from '@nestjs/common';
import { WahaService } from './waha.service';
import { WahaController } from './waha.controller';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [WahaService],
  controllers: [WahaController],
  exports: [WahaService],
})
export class WahaModule {}
