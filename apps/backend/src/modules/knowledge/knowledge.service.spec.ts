import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeService } from './knowledge.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OPENAI_CLIENT } from '../../core/openai/openai.module';
import { DataAgentService } from '../../features/knowledge-ingest/data-agent.service';
import { BadRequestException } from '@nestjs/common';
const sharp = require('sharp');

describe('KnowledgeService', () => {
  let service: KnowledgeService;

  const mockPrismaService = {
    knowledgeBase: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockOpenAIClient = {
    embeddings: {
      create: jest.fn(),
    },
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  };

  const mockDataAgentService = {
    ingestDocument: jest.fn(),
    syncKnowledgeBase: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OPENAI_CLIENT, useValue: mockOpenAIClient },
        { provide: DataAgentService, useValue: mockDataAgentService },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processFile with Images', () => {
    it('berhasil mengekstrak teks dari file gambar JPEG (.jpg) menggunakan AI Vision', async () => {
      const imgBuffer = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const mockFile = {
        originalname: 'persyaratan-kpr.jpg',
        buffer: imgBuffer,
      } as Express.Multer.File;

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content:
                '# PT. RINDANG ALAM SEMESTA\nPERSYARATAN KPR:\n1. KTP\n2. KK\n3. NPWP',
            },
          },
        ],
      });

      const result = await service.processFile(mockFile);
      expect(result).toContain('PT. RINDANG ALAM SEMESTA');
      expect(result).toContain('PERSYARATAN KPR:');
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalled();
    });

    it('berhasil mengekstrak teks dari file gambar PNG (.png)', async () => {
      const imgBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const mockFile = {
        originalname: 'brosur.png',
        buffer: imgBuffer,
      } as Express.Multer.File;

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Daftar Harga Rumah & Tenor',
            },
          },
        ],
      });

      const result = await service.processFile(mockFile);
      expect(result).toContain('Daftar Harga Rumah & Tenor');
    });

    it('menolak file dengan format tidak didukung (.exe)', async () => {
      const mockFile = {
        originalname: 'virus.exe',
        buffer: Buffer.from('executable binary'),
      } as Express.Multer.File;

      await expect(service.processFile(mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createFile', () => {
    it('menyimpan dokumen gambar ke knowledge base dan melakukan sync vector', async () => {
      const imgBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 0, b: 255 },
        },
      })
        .jpeg()
        .toBuffer();

      const mockFile = {
        originalname: 'dokumen-kpr.jpeg',
        buffer: imgBuffer,
      } as Express.Multer.File;

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Teks hasil ekstraksi dokumen KPR',
            },
          },
        ],
      });

      mockPrismaService.knowledgeBase.create.mockResolvedValueOnce({
        id: 'kb-img-1',
        content: 'Teks hasil ekstraksi dokumen KPR',
        tenantId: 'tenant-123',
        metadata: {
          title: 'Syarat KPR',
          type: 'file',
          filename: 'dokumen-kpr.jpeg',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.createFile('tenant-123', mockFile, 'Syarat KPR');
      expect(res.id).toBe('kb-img-1');
      expect(res.content).toBe('Teks hasil ekstraksi dokumen KPR');
      expect(mockDataAgentService.syncKnowledgeBase).toHaveBeenCalledWith(
        'tenant-123',
      );
    });
  });
});
