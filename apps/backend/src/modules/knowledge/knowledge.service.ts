import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OPENAI_CLIENT } from '../../core/openai/openai.module';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
  ) {}

  async findAll(tenantId: string) {
    // We cannot select 'embedding' through prisma client because it's Unsupported.
    return this.prisma.vectorKnowledge.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        metadata: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string, tenantId: string) {
    const item = await this.prisma.vectorKnowledge.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        title: true,
        content: true,
        metadata: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Knowledge not found');
    }
    return item;
  }

  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new BadRequestException('OpenAI client is not configured');
    }
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error: any) {
      console.error('Error generating embedding:', error?.response?.data || error);
      throw new BadRequestException('Failed to generate embedding: ' + (error.message || 'Unknown error'));
    }
  }

  async createText(tenantId: string, title: string, content: string) {
    const embedding = await this.getEmbedding(content);
    const id = uuidv4();
    const metadataStr = JSON.stringify({ title, type: 'text' });
    const embeddingStr = `[${embedding.join(',')}]`;

    try {
      // 1. Insert into source of truth (knowledge_base)
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "knowledge_base" (id, content, metadata, tenant_id, embedding, created_at, updated_at) 
         VALUES ($1, $2, $3::jsonb, $4, $5::vector, NOW(), NOW())`,
        id, content, metadataStr, tenantId, embeddingStr
      );

      // 2. Insert into search table (vector_knowledge)
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "vector_knowledge" (id, title, content, metadata, tenant_id, embedding, created_at, updated_at) 
         VALUES ($1, $2, $3, $4::jsonb, $5, $6::vector, NOW(), NOW())`,
        id, title, content, metadataStr, tenantId, embeddingStr
      );
    } catch (error: any) {
      console.error('DB Insert Error:', error);
      throw new BadRequestException('Database insert failed: ' + error.message);
    }

    return this.findOne(id, tenantId);
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
    
    const embedding = await this.getEmbedding(content);
    const id = uuidv4();
    const metadataStr = JSON.stringify({ title: finalTitle, type: 'file', filename: file.originalname });
    const embeddingStr = `[${embedding.join(',')}]`;

    try {
      // 1. Insert into source of truth (knowledge_base)
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "knowledge_base" (id, content, metadata, tenant_id, embedding, created_at, updated_at) 
         VALUES ($1, $2, $3::jsonb, $4, $5::vector, NOW(), NOW())`,
        id, content, metadataStr, tenantId, embeddingStr
      );

      // 2. Insert into search table (vector_knowledge)
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "vector_knowledge" (id, title, content, metadata, tenant_id, embedding, created_at, updated_at) 
         VALUES ($1, $2, $3, $4::jsonb, $5, $6::vector, NOW(), NOW())`,
        id, finalTitle, content, metadataStr, tenantId, embeddingStr
      );
    } catch (error: any) {
      console.error('DB Insert Error:', error);
      throw new BadRequestException('Database insert failed: ' + error.message);
    }

    return this.findOne(id, tenantId);
  }

  async update(id: string, tenantId: string, title: string, content: string) {
    const item = await this.findOne(id, tenantId); // ensure it exists

    const embedding = await this.getEmbedding(content);
    const embeddingStr = `[${embedding.join(',')}]`;
    
    // Merge existing metadata with new title
    const existingMetadata = (item.metadata as any) || {};
    const metadataStr = JSON.stringify({ ...existingMetadata, title });

    // 1. Update source of truth
    await this.prisma.$executeRawUnsafe(
      `UPDATE "knowledge_base" 
       SET content = $1, metadata = $2::jsonb, embedding = $3::vector, updated_at = NOW() 
       WHERE id = $4 AND tenant_id = $5`,
      content, metadataStr, embeddingStr, id, tenantId
    );

    // 2. Update search table
    await this.prisma.$executeRawUnsafe(
      `UPDATE "vector_knowledge" 
       SET title = $1, content = $2, metadata = $3::jsonb, embedding = $4::vector, updated_at = NOW() 
       WHERE id = $5 AND tenant_id = $6`,
      title, content, metadataStr, embeddingStr, id, tenantId
    );

    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId); // ensure it exists
    
    await this.prisma.knowledgeBase.deleteMany({
      where: { id, tenantId },
    });
    
    await this.prisma.vectorKnowledge.deleteMany({
      where: { id, tenantId },
    });
    
    return { success: true };
  }
}
