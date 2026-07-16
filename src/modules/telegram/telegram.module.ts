import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { OnboardingModule } from '../onboarding/onboarding.module';

@Module({
  imports: [PrismaModule, AiModule, OnboardingModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
