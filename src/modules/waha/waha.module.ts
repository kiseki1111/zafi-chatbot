import { Module } from '@nestjs/common';
import { WahaService } from './waha.service';
import { WahaController } from './waha.controller';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [HttpModule, PrismaModule, AiModule],
  providers: [WahaService],
  controllers: [WahaController],
  exports: [WahaService],
})
export class WahaModule {}
