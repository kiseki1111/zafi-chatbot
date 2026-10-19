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
      deleteMany: jest.fn(),
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

    it('Berhasil menyimpan file media perusahaan (createMedia) tanpa blocking OCR', async () => {
      const mockMediaFile = {
        originalname: 'brosur-perusahaan-2026.pdf',
        filename: '1700000000-brosur.pdf',
        mimetype: 'application/pdf',
        size: 204800,
        path: '/tmp/1700000000-brosur.pdf',
      } as Express.Multer.File;

      mockPrismaService.knowledgeBase.create.mockResolvedValueOnce({
        id: 'kb-media-1',
        content: `[MEDIA_PERUSAHAAN]\nJudul: Brosur Perusahaan 2026\nTipe: DOKUMEN_PDF\nURL: /uploads/1700000000-brosur.pdf\nKeterangan: Company profile resmi`,
        tenantId: 'tenant-123',
        metadata: {
          type: 'media',
          mediaType: 'pdf',
          title: 'Brosur Perusahaan 2026',
          name: 'Brosur Perusahaan 2026',
          description: 'Company profile resmi',
          url: '/uploads/1700000000-brosur.pdf',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.createMedia(
        'tenant-123',
        mockMediaFile,
        'Brosur Perusahaan 2026',
        'Company profile resmi',
      );

      expect(res.id).toBe('kb-media-1');
      expect(res.title).toBe('Brosur Perusahaan 2026');
      expect(res.metadata.type).toBe('media');
      expect(res.url).toBe('/uploads/1700000000-brosur.pdf');
      expect(mockDataAgentService.syncKnowledgeBase).toHaveBeenCalledWith(
        'tenant-123',
      );
    });
  });

  describe('AI Knowledge Segmentation (Split)', () => {
    it('berhasil membedah dokumen panjang menjadi topik-topik mandiri via AI (split-preview)', async () => {
      mockPrismaService.knowledgeBase.findFirst.mockResolvedValueOnce({
        id: 'kb-big-doc',
        title: 'Buku Panduan Zafi Properti',
        content:
          'Zafi Residence berlokasi di Jl. Ayani 2. Tipe 36 harga 182 juta. Spesifikasi: 2 kamar tidur, 1 kamar mandi, listrik 1300W. Syarat KPR: KTP, KK, NPWP, Slip Gaji 3 bulan.',
        tenantId: 'tenant-123',
        metadata: { title: 'Buku Panduan Zafi Properti' },
      });

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                topics: [
                  {
                    title: 'Pricelist & Tipe Rumah Zafi Residence',
                    content: 'Zafi Residence berlokasi di Jl. Ayani 2. Tipe 36 harga 182 juta.',
                  },
                  {
                    title: 'Spesifikasi Bangunan Tipe 36',
                    content: 'Spesifikasi: 2 kamar tidur, 1 kamar mandi, listrik 1300W.',
                  },
                  {
                    title: 'Persyaratan Berkas KPR',
                    content: 'Syarat KPR: KTP, KK, NPWP, Slip Gaji 3 bulan.',
                  },
                ],
              }),
            },
          },
        ],
      });

      const res = await service.previewSplitKnowledge('kb-big-doc', 'tenant-123');

      expect(res.originalId).toBe('kb-big-doc');
      expect(res.topics.length).toBe(3);
      expect(res.topics[0].title).toBe('Pricelist & Tipe Rumah Zafi Residence');
      expect(res.topics[1].title).toBe('Spesifikasi Bangunan Tipe 36');
      expect(res.topics[2].title).toBe('Persyaratan Berkas KPR');
    });

    it('berhasil menerapkan pemecahan: menyimpan topik baru dan menghapus dokumen asal', async () => {
      mockPrismaService.knowledgeBase.findFirst.mockResolvedValueOnce({
        id: 'kb-big-doc',
        title: 'Buku Panduan Zafi Properti',
        tenantId: 'tenant-123',
      });

      mockPrismaService.knowledgeBase.create
        .mockResolvedValueOnce({
          id: 'kb-part-1',
          content: 'Konten Bagian 1',
          metadata: { title: 'Topik 1', splitFrom: 'kb-big-doc' },
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'kb-part-2',
          content: 'Konten Bagian 2',
          metadata: { title: 'Topik 2', splitFrom: 'kb-big-doc' },
          createdAt: new Date(),
        });

      mockPrismaService.knowledgeBase.deleteMany.mockResolvedValueOnce({ count: 1 });

      const res = await service.applySplitKnowledge(
        'kb-big-doc',
        'tenant-123',
        [
          { title: 'Topik 1', content: 'Konten Bagian 1' },
          { title: 'Topik 2', content: 'Konten Bagian 2' },
        ],
        false, // hapus dokumen lama
      );

      expect(res.success).toBe(true);
      expect(res.count).toBe(2);
      expect(res.deletedOriginal).toBe(true);
      expect(mockPrismaService.knowledgeBase.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.knowledgeBase.deleteMany).toHaveBeenCalledWith({
        where: { id: 'kb-big-doc', tenantId: 'tenant-123' },
      });
      expect(mockDataAgentService.syncKnowledgeBase).toHaveBeenCalledWith('tenant-123');
    });
  });
});
