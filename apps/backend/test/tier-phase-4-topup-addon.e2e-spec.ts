import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { TenantModule } from '../src/features/web-dashboard/tenant/tenant.module';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { DataAgentService } from '../src/features/knowledge-ingest/data-agent.service';

describe('Tier Phase 4: Modul Manajemen Top-Up, Booster & Add-On', () => {
  let context: TestAppContext;
  let app: INestApplication;

  let currentUser: any = {
    sub: 'superadmin-1',
    email: 'superadmin@platform.id',
    roles: ['superadmin'],
    tenantId: null,
  };

  const mockDataAgent = {
    syncKnowledgeBase: jest.fn().mockResolvedValue({ ok: true }),
    ingestDocument: jest.fn().mockResolvedValue({ ok: true }),
  };

  beforeAll(async () => {
    context = await createTestApp({ imports: [TenantModule] }, (b) =>
      b
        .overrideGuard(JwtAuthGuard)
        .useValue({
          canActivate: (ctx: any) => {
            ctx.switchToHttp().getRequest().user = currentUser;
            return true;
          },
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
      sub: 'superadmin-1',
      email: 'superadmin@platform.id',
      roles: ['superadmin'],
      tenantId: null,
    };
  });

  describe('1. Katalog Top-Up & Add-On', () => {
    it('Semua pengguna terautentikasi dapat membaca katalog paket top-up dan booster (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenant/topup/catalog')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(10);

      const keys = res.body.map((item: any) => item.key);
      expect(keys).toContain('MAU_S');
      expect(keys).toContain('AI_S');
      expect(keys).toContain('BOOSTER_S');
      expect(keys).toContain('ADDON_WA');
      expect(keys).toContain('ADDON_USER');
      expect(keys).toContain('ADDON_PROJECT');
    });
  });

  describe('2. Injeksi Top-Up Kuota & Booster ke Klien', () => {
    it('Superadmin berhasil menambahkan paket Booster M (+1000 MAU, +4000 AI) ke akun klien (201/200)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-bronze-1',
        name: 'Klien Toko Bronze',
        metadata: {
          plan: 'bronze',
          maxMau: 1000,
          maxAiResponses: 4000,
          extraMau: 0,
          extraAiResponses: 0,
        },
        whatsappInstances: [],
      });
      context.mockPrisma.tenant.update.mockImplementation(async ({ data }) => ({
        id: 't-bronze-1',
        name: 'Klien Toko Bronze',
        metadata: data.metadata,
        whatsappInstances: [],
      }));

      const res = await request(app.getHttpServer())
        .post('/api/v1/tenant/clients/t-bronze-1/topup')
        .send({
          itemKey: 'BOOSTER_M',
          notes: 'Pembayaran manual invoice #INV-9901 terverifikasi',
        })
        .expect(201);

      expect(res.body.extraMau).toBe(1000);
      expect(res.body.extraAiResponses).toBe(4000);
      expect(res.body.maxMau).toBe(2000); // 1000 base + 1000 extra
      expect(res.body.maxAiResponses).toBe(8000); // 4000 base + 4000 extra
      expect(res.body.topups).toHaveLength(1);
      expect(res.body.topups[0].itemKey).toBe('BOOSTER_M');
    });

    it('Superadmin berhasil menambahkan add-on kapasitas kustom (201)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-custom-1',
        name: 'Klien Kustom',
        metadata: { plan: 'lite' },
        whatsappInstances: [],
      });
      context.mockPrisma.tenant.update.mockImplementation(async ({ data }) => ({
        id: 't-custom-1',
        name: 'Klien Kustom',
        metadata: data.metadata,
        whatsappInstances: [],
      }));

      const res = await request(app.getHttpServer())
        .post('/api/v1/tenant/clients/t-custom-1/topup')
        .send({
          itemKey: 'CUSTOM',
          mau: 300,
          ai: 1500,
          whatsapp: 1,
          users: 2,
          projects: 1,
          notes: 'Custom add-on deal khusus B2B',
        })
        .expect(201);

      expect(res.body.extraMau).toBe(300);
      expect(res.body.extraAiResponses).toBe(1500);
    });

    it('Non-superadmin (Manager/Operator) DITOLAK saat mencoba menginjeksi top-up (403)', async () => {
      currentUser = {
        sub: 'user-manager-1',
        email: 'manager@tenant.id',
        roles: ['manager'],
        tenantId: 't-tenant-1',
      };

      await request(app.getHttpServer())
        .post('/api/v1/tenant/clients/t-tenant-1/topup')
        .send({ itemKey: 'BOOSTER_S' })
        .expect(403);
    });
  });
});
