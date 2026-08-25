import { Module, forwardRef } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { KnowledgeIngestModule } from '../../features/knowledge-ingest/knowledge-ingest.module';

@Module({
  imports: [forwardRef(() => KnowledgeIngestModule)],
  providers: [OnboardingService],
  exports: [OnboardingService]
})
export class OnboardingModule {}
