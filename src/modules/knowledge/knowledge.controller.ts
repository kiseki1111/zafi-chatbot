import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { DataAgentService } from './data-agent.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Knowledge Base')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/knowledge')
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly dataAgentService: DataAgentService
  ) {}

  @Post('sync')
  @ApiOperation({ summary: 'Sync knowledge base from Google Sheet (RAG)' })
  async syncGoogleSheet() {
    return this.knowledgeService.syncFromGoogleSheet();
  }

  @Post('sync-vector')
  @ApiOperation({ summary: 'Sync data (Products & KB) to VectorKnowledge table for RAG search' })
  async syncVectorKnowledge() {
    return this.dataAgentService.syncKnowledgeBase();
  }

  // @Public()
  // @Post('sync-properties')
  // @ApiOperation({ summary: 'Sync properties from Google Sheet master database (produk sheet)' })
  // async syncProperties() {
  //   return this.knowledgeService.syncPropertiesFromSheet();
  // }

  // @Post('export-properties')
  // @ApiOperation({ summary: 'Bootstrap/Export properties from Prisma DB to Google Sheet' })
  // async exportProperties() {
  //   return this.knowledgeService.exportPropertiesToSheet();
  // }
}
