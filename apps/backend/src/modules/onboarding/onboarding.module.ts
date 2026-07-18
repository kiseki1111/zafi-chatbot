import { Module, forwardRef } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [forwardRef(() => KnowledgeModule)],
  providers: [OnboardingService],
  exports: [OnboardingService]
})
export class OnboardingModule {}
