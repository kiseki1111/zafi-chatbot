import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { KnowledgeModule } from '../src/modules/knowledge/knowledge.module';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { OPENAI_CLIENT } from '../src/core/openai/openai.module';
import { DataAgentService } from '../src/features/knowledge-ingest/data-agent.service';

describe('Potongan 3: Knowledge Base RAG Ingestion (Boundary & Multi-Tenant Isolation Test)', () => {
  let context: TestAppContext;
  let app: INestApplication;

  let currentUser: {
    sub: string;
    email: string;
    roles: string[];
    tenantId?: string | null;
  } = {
    sub: 'user-tenant-a',
    email: 'admin@tenant-a.com',
    roles: ['manager'],
    tenantId: 'tenant-A',
  };

  const mockDataAgent = {
    syncKnowledgeBase: jest.fn().mockResolvedValue({ success: true, count: 1 }),
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
              req.user = currentUser;
              return true;
            },
          })
          .overrideProvider(OPENAI_CLIENT)
          .useValue({
            chat: { completions: { create: jest.fn() } },
            embeddings: { create: jest.fn() },
          })
          .overrideProvider(DataAgentService)
          .useValue(mockDataAgent),
    );

    app = context.app;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = {
      sub: 'user-tenant-a',
      email: 'admin@tenant-a.com',
      roles: ['manager'],
      tenantId: 'tenant-A',
    };
  });

  describe('1. Batas Validasi Input Teks Bebas', () => {
    it('Menolak jika title atau content tidak disertakan (400)', async () => {
      const invalidBodies = [
        { title: 'Hanya Judul' },
        { content: 'Hanya Konten' },
        { title: '', content: '' },
      ];

      for (const body of invalidBodies) {
        await request(app.getHttpServer())
          .post('/api/v1/knowledge/text')
          .send(body)
          .expect(400);
      }
    });

    it('Berhasil menyimpan materi teks valid dan otomatis memicu sync vector DB (201)', async () => {
      context.mockPrisma.knowledgeBase.create.mockResolvedValue({
        id: 'kb-text-1',
        content: 'Toko Buka Senin-Jumat pukul 09.00 - 18.00 WIB',
        metadata: { title: 'Jadwal Buka', type: 'text' },
        tenantId: 'tenant-A',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/knowledge/text')
        .send({
          title: 'Jadwal Buka',
          content: 'Toko Buka Senin-Jumat pukul 09.00 - 18.00 WIB',
        })
        .expect(201);

      expect(res.body.id).toBe('kb-text-1');
      expect(mockDataAgent.syncKnowledgeBase).toHaveBeenCalledWith('tenant-A');
    });
  });

  describe('2. Batas File Upload & Ekstraksi Dokumen', () => {
    it('Menolak request upload file jika tidak ada file yang dilampirkan (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/knowledge/file')
        .expect(400);

      expect(res.body.message).toContain('File is required');
    });

    it('Menolak file dengan format / ekstensi yang tidak diizinkan (.exe) (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/knowledge/file')
        .attach('file', Buffer.from('malicious binary data'), 'program.exe')
        .expect(400);

      expect(res.body.message).toContain('Unsupported file format');
    });

    it('Menolak file teks kosong 0-byte (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/knowledge/file')
        .attach('file', Buffer.from('   '), 'empty.txt')
        .expect(400);

      expect(res.body.message).toContain('Could not extract text');
    });

    it('Berhasil mengekstrak dan menyimpan file teks yang valid (.txt) (201)', async () => {
      context.mockPrisma.knowledgeBase.create.mockResolvedValue({
        id: 'kb-file-1',
        content: 'Daftar Menu: Kopi Susu, Teh Manis',
        metadata: { title: 'menu.txt', type: 'file' },
        tenantId: 'tenant-A',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/knowledge/file')
        .attach('file', Buffer.from('Daftar Menu: Kopi Susu, Teh Manis'), 'menu.txt')
        .expect(201);

      expect(res.body.id).toBe('kb-file-1');
      expect(mockDataAgent.syncKnowledgeBase).toHaveBeenCalledWith('tenant-A');
    });
  });

  describe('3. Batas Keamanan Isolasi Multi-Tenant (IDOR Prevention)', () => {
    it('User tanpa tenantId ditolak saat mengakses knowledge base (403)', async () => {
      currentUser = {
        sub: 'unlinked-user',
        email: 'unlinked@domain.com',
        roles: ['operator'],
        tenantId: null,
      };

      const res = await request(app.getHttpServer())
        .get('/api/v1/knowledge')
        .expect(403);

      expect(res.body.message).toContain('tidak terhubung dengan tenant');
    });

    it('Tenant A DITOLAK saat mencoba menghapus dokumen milik Tenant B (404 / IDOR Guard)', async () => {
      // Mock dokumen tidak ditemukan di bawah naungan tenant-A
      context.mockPrisma.knowledgeBase.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .delete('/api/v1/knowledge/doc-belong-to-tenant-b')
        .expect(404);

      expect(res.body.message).toContain('Knowledge not found');
    });

    it('Superadmin DIIZINKAN mengakses data knowledge tenant manapun via query param (200)', async () => {
      currentUser = {
        sub: 'superadmin-id',
        email: 'superadmin@propertiku.id',
        roles: ['superadmin'],
        tenantId: null,
      };

      context.mockPrisma.knowledgeBase.findMany.mockResolvedValue([
        {
          id: 'kb-tenant-c',
          content: 'Dokumen Tenant C',
          metadata: { title: 'Panduan Tenant C' },
          tenantId: 'tenant-C',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/knowledge?tenantId=tenant-C')
        .expect(200);

      expect(res.body[0].title).toBe('Panduan Tenant C');
      expect(context.mockPrisma.knowledgeBase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-C' },
        }),
      );
    });
  });
});
