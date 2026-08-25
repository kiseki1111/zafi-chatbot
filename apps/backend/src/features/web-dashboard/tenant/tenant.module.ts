import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { KnowledgeIngestModule } from '../../knowledge-ingest/knowledge-ingest.module';

@Module({
  imports: [PrismaModule, KnowledgeIngestModule],
  controllers: [TenantController],
  providers: [TenantService],
})
export class TenantModule {}
