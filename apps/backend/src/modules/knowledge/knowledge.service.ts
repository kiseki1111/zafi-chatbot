import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OPENAI_CLIENT } from '../../core/openai/openai.module';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { DataAgentService } from '../../features/knowledge-ingest/data-agent.service';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly dataAgentService: DataAgentService,
  ) {}

  async findAll(tenantId: string) {
    const items = await this.prisma.knowledgeBase.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    // Extract title from metadata for response
    return items.map(item => ({
      id: item.id,
      title: (item.metadata as any)?.title || 'Untitled',
      content: item.content,
      metadata: item.metadata,
      tenantId: item.tenantId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));
  }

  async findOne(id: string, tenantId: string) {
    const item = await this.prisma.knowledgeBase.findFirst({
      where: { id, tenantId }
    });

    if (!item) {
      throw new NotFoundException('Knowledge not found');
    }
    // Extract title from metadata for response
    return {
      id: item.id,
      title: (item.metadata as any)?.title || 'Untitled',
      content: item.content,
      metadata: item.metadata,
      tenantId: item.tenantId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  async createText(tenantId: string, title: string, content: string) {
    try {
      const result = await this.prisma.knowledgeBase.create({
        data: {
          content,
          tenantId,
          metadata: { title, type: 'text' }
        }
      });
      // Sync to vector DB so agent can use it immediately
      await this.dataAgentService.syncKnowledgeBase(tenantId).catch(e => console.warn('Knowledge sync warning:', e.message));
      return { id: result.id, title, content, metadata: result.metadata, tenantId, createdAt: result.createdAt, updatedAt: result.updatedAt };
    } catch (error: any) {
      console.error('DB Insert Error:', error);
      throw new BadRequestException('Database insert failed: ' + error.message);
    }
  }

  async processFile(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    let content = '';

    if (ext === 'pdf') {
      const parsed = await pdfParse(file.buffer);
      content = parsed.text;
    } else if (ext === 'doc' || ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      content = result.value;
    } else if (ext === 'txt') {
      content = file.buffer.toString('utf8');
    } else {
      throw new BadRequestException('Unsupported file format. Use PDF, DOCX, or TXT.');
    }

    // Basic cleanup
    content = content.replace(/\n+/g, '\n').trim();
    if (!content) throw new BadRequestException('Could not extract text from file');
    
    return content;
  }

  async createFile(tenantId: string, file: Express.Multer.File, title?: string) {
    const content = await this.processFile(file);
    const finalTitle = title || file.originalname;

    try {
      const result = await this.prisma.knowledgeBase.create({
        data: {
          content,
          tenantId,
          metadata: { title: finalTitle, type: 'file', filename: file.originalname }
        }
      });
      // Sync to vector DB so agent can use it immediately
      await this.dataAgentService.syncKnowledgeBase(tenantId).catch(e => console.warn('Knowledge sync warning:', e.message));
      return { id: result.id, title: finalTitle, content, metadata: result.metadata, tenantId, createdAt: result.createdAt, updatedAt: result.updatedAt };
    } catch (error: any) {
      console.error('DB Insert Error:', error);
      throw new BadRequestException('Database insert failed: ' + error.message);
    }
  }

  async update(id: string, tenantId: string, title: string, content: string) {
    const item = await this.findOne(id, tenantId); // ensure it exists

    // Merge existing metadata with new title
    const existingMetadata = (item.metadata as any) || {};
    const metadataStr = JSON.stringify({ ...existingMetadata, title });

    // 1. Update source of truth
    await this.prisma.$executeRawUnsafe(
      `UPDATE "knowledge_base"
       SET content = $1, metadata = $2::jsonb, updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4`,
      content, metadataStr, id, tenantId
    );

    // Sync to vector DB so agent gets updated knowledge
    await this.dataAgentService.syncKnowledgeBase(tenantId).catch(e => console.warn('Knowledge sync warning:', e.message));

    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId); // ensure it exists
    
    await this.prisma.knowledgeBase.deleteMany({
      where: { id, tenantId },
    });

    
    return { success: true };
  }
}
