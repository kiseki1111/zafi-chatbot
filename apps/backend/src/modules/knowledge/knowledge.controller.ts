import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { DataAgentService } from '../../features/knowledge-ingest/data-agent.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/knowledge')
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly dataAgentService: DataAgentService,
  ) {}

  private resolveTenantId(req: any): string {
    const isSuperadmin = req.user?.roles?.includes('superadmin');
    if (isSuperadmin && (req.query?.tenantId || req.body?.tenantId)) {
      return (req.query?.tenantId || req.body?.tenantId) as string;
    }
    if (!req.user?.tenantId) {
      throw new ForbiddenException(
        'Akses ditolak: Akun Anda tidak terhubung dengan tenant manapun',
      );
    }
    return req.user.tenantId;
  }

  @Get()
  async findAll(@Req() req: any) {
    const tenantId = this.resolveTenantId(req);
    return this.knowledgeService.findAll(tenantId);
  }

  @Post('text')
  async createText(
    @Req() req: any,
    @Body() body: { title: string; content: string },
  ) {
    const tenantId = this.resolveTenantId(req);
    if (!body.title || !body.content)
      throw new BadRequestException('title and content are required');
    return this.knowledgeService.createText(tenantId, body.title, body.content);
  }

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async createFile(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
  ) {
    const tenantId = this.resolveTenantId(req);
    if (!file) throw new BadRequestException('File is required');
    return this.knowledgeService.createFile(tenantId, file, title);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { title: string; content: string },
  ) {
    const tenantId = this.resolveTenantId(req);
    if (!body.title || !body.content)
      throw new BadRequestException('title and content are required');
    return this.knowledgeService.update(id, tenantId, body.title, body.content);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const tenantId = this.resolveTenantId(req);
    return this.knowledgeService.remove(id, tenantId);
  }

  @Post('sync-vector')
  async syncVectorKnowledge(@Req() req: any) {
    const tenantId = this.resolveTenantId(req);
    return this.dataAgentService.syncKnowledgeBase(tenantId);
  }
}
