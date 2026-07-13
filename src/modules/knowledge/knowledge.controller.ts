import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Knowledge Base')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('sync')
  @ApiOperation({ summary: 'Sync knowledge base from Google Sheet (RAG)' })
  async syncGoogleSheet() {
    return this.knowledgeService.syncFromGoogleSheet();
  }

  @Public()
  @Post('sync-properties')
  @ApiOperation({ summary: 'Sync properties from Google Sheet master database (produk sheet)' })
  async syncProperties() {
    return this.knowledgeService.syncPropertiesFromSheet();
  }

  @Post('export-properties')
  @ApiOperation({ summary: 'Bootstrap/Export properties from Prisma DB to Google Sheet' })
  async exportProperties() {
    return this.knowledgeService.exportPropertiesToSheet();
  }
}
