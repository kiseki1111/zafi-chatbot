import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SearchModule } from '../src/modules/search/search.module';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

describe('SearchModule (Omnisearch End-to-End Test)', () => {
  let context: TestAppContext;
  let app: INestApplication;

  let currentUser: any = {
    sub: 'user-manager-1',
    email: 'manager@properti.com',
    roles: ['manager'],
    tenantId: 'tenant-zafi',
  };

  beforeAll(async () => {
    context = await createTestApp(
      { imports: [SearchModule] },
      (b) =>
        b.overrideGuard(JwtAuthGuard).useValue({
          canActivate: (ctx: any) => {
            ctx.switchToHttp().getRequest().user = currentUser;
            return true;
          },
        }),
    );
    app = context.app;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = {
      sub: 'user-manager-1',
      email: 'manager@properti.com',
      roles: ['manager'],
      tenantId: 'tenant-zafi',
    };
  });

  describe('1. Universal REST Search (/api/v1/search)', () => {
    it('Harus mengembalikan array kosong jika query q kosong', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/search?q=')
        .expect(200);

      expect(res.body).toEqual({ results: [] });
    });

    it('Berhasil mencari kontak dan mengelompokkan kategori hasil (200)', async () => {
      context.mockPrisma.contact.findMany.mockResolvedValue([
        {
          id: 'c-1',
          name: 'Budi Santoso',
          phone: '62812345678',
          status: 'Follow-Up',
          company: 'PT Maju',
          conversations: [{ id: 'conv-1', instanceName: 'zafi-bot', lastMessageAt: new Date() }],
        },
      ]);
      context.mockPrisma.message.findMany.mockResolvedValue([]);
      context.mockPrisma.knowledgeBase.findMany.mockResolvedValue([]);
      context.mockPrisma.resourceItem.findMany.mockResolvedValue([]);
      context.mockPrisma.product.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/search?q=Budi')
        .expect(200);

      expect(res.body.q).toBe('Budi');
      expect(Array.isArray(res.body.results)).toBe(true);

      const contactCategory = res.body.results.find((r: any) => r.category === 'contact');
      expect(contactCategory).toBeDefined();
      expect(contactCategory.items[0].title).toBe('Budi Santoso');
      expect(contactCategory.items[0].subtitle).toContain('62812345678');
      expect(contactCategory.items[0].meta.status).toBe('Follow-Up');
    });

    it('Mendukung filter spesifik category=contacts (200)', async () => {
      context.mockPrisma.contact.findMany.mockResolvedValue([
        {
          id: 'c-2',
          name: 'Siti Aminah',
          phone: '62899887766',
          status: 'SLIK',
          company: null,
          conversations: [],
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/search?q=Siti&category=contacts')
        .expect(200);

      expect(res.body.results.length).toBe(1);
      expect(res.body.results[0].category).toBe('contact');
      expect(res.body.results[0].items[0].title).toBe('Siti Aminah');
    });

    it('Mendukung pencarian unit kavling / siteplan (200)', async () => {
      context.mockPrisma.resourceItem.findMany.mockResolvedValue([
        {
          id: 'u-1',
          code: 'Blok A-05',
          name: 'Kavling Hook',
          houseType: '36/72',
          status: 'AVAILABLE',
          price: 182000000,
          group: { id: 'g-1', name: 'Zafi Residence', tenantId: 'tenant-zafi' },
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/search?q=Blok A&category=units')
        .expect(200);

      expect(res.body.results[0].category).toBe('unit');
      expect(res.body.results[0].items[0].title).toBe('Blok A-05 (36/72)');
      expect(res.body.results[0].items[0].subtitle).toContain('Zafi Residence');
    });
  });

  describe('2. Multi-Tenant Isolation Security', () => {
    it('Manager biasa dipaksa memfilter query berdasarkan tenantId miliknya (anti-IDOR)', async () => {
      context.mockPrisma.contact.findMany.mockResolvedValue([]);
      context.mockPrisma.message.findMany.mockResolvedValue([]);
      context.mockPrisma.knowledgeBase.findMany.mockResolvedValue([]);
      context.mockPrisma.resourceItem.findMany.mockResolvedValue([]);
      context.mockPrisma.product.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/api/v1/search?q=kavling')
        .expect(200);

      // Verifikasi query resourceItem menyertakan group.tenantId = 'tenant-zafi'
      const unitQueryArg = context.mockPrisma.resourceItem.findMany.mock.calls[0][0];
      expect(unitQueryArg.where.group).toEqual({ tenantId: 'tenant-zafi' });

      // Verifikasi query knowledgeBase menyertakan tenantId = 'tenant-zafi'
      const kbQueryArg = context.mockPrisma.knowledgeBase.findMany.mock.calls[0][0];
      expect(kbQueryArg.where.tenantId).toBe('tenant-zafi');
    });
  });

  describe('3. Server-Sent Events Progressive Stream (/api/v1/search/stream)', () => {
    it('Harus mengalirkan chunk SSE dan diakhiri dengan event __done__ (200)', async () => {
      context.mockPrisma.contact.findMany.mockResolvedValue([]);
      context.mockPrisma.message.findMany.mockResolvedValue([]);
      context.mockPrisma.knowledgeBase.findMany.mockResolvedValue([]);
      context.mockPrisma.resourceItem.findMany.mockResolvedValue([]);
      context.mockPrisma.product.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/search/stream?q=test')
        .expect(200);

      expect(res.headers['content-type']).toContain('text/event-stream');
      expect(res.text).toContain('__done__');
    });
  });
});
