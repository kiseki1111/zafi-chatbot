import { Controller, Get, Post, Put, Delete, Body, Param, UseInterceptors, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('api/v1/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  async findAll(@Req() req: any) {
    // Assuming tenantId is attached to the request by some auth middleware
    // If not, we might need a query param or default tenant.
    // For now, let's use a dummy or get it from req.user
    const tenantId = req.user?.tenantId || req.query.tenantId;
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    return this.knowledgeService.findAll(tenantId);
  }

  @Post('text')
  async createText(@Req() req: any, @Body() body: { title: string; content: string }) {
    const tenantId = req.user?.tenantId || req.query.tenantId || req.body.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!body.title || !body.content) throw new BadRequestException('title and content are required');
    return this.knowledgeService.createText(tenantId, body.title, body.content);
  }

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async createFile(@Req() req: any, @UploadedFile() file: Express.Multer.File, @Body('title') title?: string) {
    const tenantId = req.user?.tenantId || req.query.tenantId || req.body.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!file) throw new BadRequestException('File is required');
    return this.knowledgeService.createFile(tenantId, file, title);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Req() req: any, @Body() body: { title: string; content: string; tenantId?: string }) {
    const tenantId = body.tenantId || req.user?.tenantId || req.query.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!body.title || !body.content) throw new BadRequestException('title and content are required');
    return this.knowledgeService.update(id, tenantId, body.title, body.content);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.query.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.knowledgeService.remove(id, tenantId);
  }
}
