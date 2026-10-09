import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { KnowledgeModule } from '../src/modules/knowledge/knowledge.module';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { OPENAI_CLIENT } from '../src/core/openai/openai.module';
import { DataAgentService } from '../src/features/knowledge-ingest/data-agent.service';
const sharp = require('sharp');

describe('Knowledge Base Flow (e2e)', () => {
  let context: TestAppContext;
  let app: INestApplication;

  const mockUser = {
    sub: 'user-manager-1',
    email: 'manager@tenant.com',
    roles: ['manager'],
    tenantId: 'tenant-knowledge-1',
  };

  const mockDataAgent = {
    syncKnowledgeBase: jest.fn().mockResolvedValue({ success: true, count: 1 }),
  };

  const mockOpenAI = {
    chat: { completions: { create: jest.fn() } },
    embeddings: { create: jest.fn() },
  };

  beforeAll(async () => {
    context = await createTestApp(
      {
        imports: [KnowledgeModule],
      },
      (builder) =>
        builder
          .overrideGuard(JwtAuthGuard)
          .useValue({
            canActivate: (ctx: any) => {
              const req = ctx.switchToHttp().getRequest();
              req.user = mockUser;
              return true;
            },
          })
          .overrideProvider(OPENAI_CLIENT)
          .useValue(mockOpenAI)
          .overrideProvider(DataAgentService)
          .useValue(mockDataAgent),
    );
    app = context.app;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/knowledge', () => {
    it('harus mengembalikan daftar knowledge base milik tenant (200)', async () => {
      const dummyKnowledge = [
        {
          id: 'kb-1',
          content: 'Jam operasional kami adalah 08:00 - 21:00 WIB',
          metadata: { title: 'Jam Buka' },
          tenantId: 'tenant-knowledge-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      context.mockPrisma.knowledgeBase.findMany.mockResolvedValue(dummyKnowledge);

      const response = await request(app.getHttpServer())
        .get('/api/v1/knowledge')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].title).toBe('Jam Buka');
      expect(response.body[0].content).toContain('Jam operasional');
    });
  });

  describe('POST /api/v1/knowledge/text', () => {
    it('harus menolak request tanpa title atau content (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/knowledge/text')
        .send({ title: '' })
        .expect(400);
    });

    it('harus berhasil menambahkan dokumen teks knowledge baru (201)', async () => {
      const createdItem = {
        id: 'kb-2',
        content: 'Kebijakan retur berlaku 2x24 jam setelah barang tiba',
        metadata: { title: 'Kebijakan Retur', type: 'text' },
        tenantId: 'tenant-knowledge-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      context.mockPrisma.knowledgeBase.create.mockResolvedValue(createdItem);

      const response = await request(app.getHttpServer())
        .post('/api/v1/knowledge/text')
        .send({
          title: 'Kebijakan Retur',
          content: 'Kebijakan retur berlaku 2x24 jam setelah barang tiba',
        })
        .expect(201);

      expect(response.body.title).toBe('Kebijakan Retur');
      expect(response.body.id).toBe('kb-2');
      expect(mockDataAgent.syncKnowledgeBase).toHaveBeenCalledWith('tenant-knowledge-1');
    });
  });

  describe('PUT /api/v1/knowledge/:id', () => {
    it('harus berhasil memperbarui isi knowledge base (200)', async () => {
      const existing = {
        id: 'kb-2',
        content: 'Lama',
        metadata: { title: 'Judul Lama' },
        tenantId: 'tenant-knowledge-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated = {
        id: 'kb-2',
        content: 'Konten Baru Diperbarui',
        metadata: { title: 'Judul Baru', type: 'text' },
        tenantId: 'tenant-knowledge-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      // findFirst dipanggil dua kali: sebelum update untuk verifikasi, dan saat findOne di akhir return
      context.mockPrisma.knowledgeBase.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updated);

      const response = await request(app.getHttpServer())
        .put('/api/v1/knowledge/kb-2')
        .send({
          title: 'Judul Baru',
          content: 'Konten Baru Diperbarui',
        })
        .expect(200);

      expect(response.body.title).toBe('Judul Baru');
      expect(response.body.content).toBe('Konten Baru Diperbarui');
    });
  });

  describe('DELETE /api/v1/knowledge/:id', () => {
    it('harus berhasil menghapus knowledge base (200)', async () => {
      context.mockPrisma.knowledgeBase.findFirst.mockResolvedValue({
        id: 'kb-2',
        tenantId: 'tenant-knowledge-1',
      });
      context.mockPrisma.knowledgeBase.deleteMany.mockResolvedValue({ count: 1 });

      const response = await request(app.getHttpServer())
        .delete('/api/v1/knowledge/kb-2')
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('POST /api/v1/knowledge/file', () => {
    it('harus berhasil mengunggah file gambar (JPEG) dan mengekstrak teks via Vision AI (201)', async () => {
      const imgBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '# PT. RINDANG ALAM SEMESTA\nPERSYARATAN KPR: 1. KTP',
            },
          },
        ],
      });

      context.mockPrisma.knowledgeBase.create.mockResolvedValueOnce({
        id: 'kb-img-1',
        content: '# PT. RINDANG ALAM SEMESTA\nPERSYARATAN KPR: 1. KTP',
        metadata: { title: 'Syarat KPR', type: 'file', filename: 'kpr.jpg' },
        tenantId: 'tenant-knowledge-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/knowledge/file')
        .field('title', 'Syarat KPR')
        .attach('file', imgBuffer, 'kpr.jpg')
        .expect(201);

      expect(response.body.title).toBe('Syarat KPR');
      expect(response.body.content).toContain('PT. RINDANG ALAM SEMESTA');
    });
  });
});
