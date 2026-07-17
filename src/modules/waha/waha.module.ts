import { Module } from '@nestjs/common';
import { WahaService } from './waha.service';
import { WahaController } from './waha.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [PrismaModule, AiModule, TelegramModule],
  providers: [WahaService],
  controllers: [WahaController],
  exports: [WahaService],
})
export class WahaModule {}
