import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { DesignFlowService } from './design/design-flow.service';
import { DesignAiService } from './design/design-ai.service';
import { DesignImageService } from './design/design-image.service';
import { DesignSessionService } from './design/design-session.service';

@Module({
  imports: [PrismaModule, AiModule, OnboardingModule],
  providers: [
    TelegramService,
    DesignFlowService,
    DesignAiService,
    DesignImageService,
    DesignSessionService,
  ],
  exports: [TelegramService, DesignFlowService, DesignSessionService],
})
export class TelegramModule {}

