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
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
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

  @Post('media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname).toLowerCase();
          const cleanName = file.originalname
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9]/g, '_');
          const isVideo =
            file.mimetype.startsWith('video/') ||
            /\.(mov|mp4|mkv|avi|webm)$/i.test(file.originalname);
          const finalExt = isVideo ? '.mp4' : ext;
          cb(null, `${uniqueSuffix}-${cleanName}${finalExt}`);
        },
      }),
      limits: {
        fileSize: 300 * 1024 * 1024, // 300MB
      },
    }),
  )
  async uploadMedia(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name?: string,
    @Body('description') description?: string,
  ) {
    const tenantId = this.resolveTenantId(req);
    if (!file) throw new BadRequestException('File is required');
    return this.knowledgeService.createMedia(
      tenantId,
      file,
      name,
      description,
      req,
    );
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
