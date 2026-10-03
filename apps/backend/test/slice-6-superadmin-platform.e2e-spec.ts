import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PlatformModule } from '../src/modules/platform/platform.module';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

describe('Potongan 6: Superadmin Platform Monitoring & Quota Limits (Boundary Test)', () => {
  let context: TestAppContext;
  let app: INestApplication;

  let currentUser: {
    sub: string;
    email: string;
    roles: string[];
    tenantId?: string | null;
  } = {
    sub: 'superadmin-master',
    email: 'superadmin@propertiku.id',
    roles: ['superadmin'],
    tenantId: null,
  };

  beforeAll(async () => {
    context = await createTestApp(
      {
        imports: [PlatformModule],
      },
      (builder) =>
        builder.overrideGuard(JwtAuthGuard).useValue({
          canActivate: (ctx: any) => {
            const req = ctx.switchToHttp().getRequest();
            req.user = currentUser;
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
      sub: 'superadmin-master',
      email: 'superadmin@propertiku.id',
      roles: ['superadmin'],
      tenantId: null,
    };
  });

  describe('1. Statistik Platform Global & Kesehatan Sesi', () => {
    it('Superadmin berhasil membaca agregasi metrik seluruh platform (200)', async () => {
      context.mockPrisma.tenant.count.mockResolvedValue(8);
      context.mockPrisma.whatsappInstance.count.mockResolvedValue(10);
      context.mockPrisma.whatsappInstance.groupBy.mockResolvedValue([
        { status: 'WORKING', _count: { status: 6 } },
        { status: 'STOPPED', _count: { status: 4 } },
      ]);
      context.mockPrisma.message.count.mockResolvedValue(8500);
      context.mockPrisma.contact.count.mockResolvedValue(1200);

      const res = await request(app.getHttpServer())
        .get('/api/v1/platform/stats')
        .expect(200);

      expect(res.body.totalClients).toBe(8);
      expect(res.body.totalInstances).toBe(10);
      expect(res.body.activeInstances).toBe(6);
      expect(res.body.totalMessages).toBe(8500);
    });
  });

  describe('2. Monitor Kuota Klien & Deteksi Kuota Habis (Boundary)', () => {
    it('Mendeteksi penggunaan kuota normal vs kuota yang terlampaui (100%+) (200)', async () => {
      // Dua klien: Toko A (normal 50%), Toko B (overload 150%)
      context.mockPrisma.tenant.findMany.mockResolvedValue([
        {
          id: 'tenant-normal',
          name: 'Toko Kopi Senja',
          metadata: { plan: 'pro', maxMau: 100, maxAiResponses: 1000 },
          _count: { whatsappInstances: 1 },
        },
        {
          id: 'tenant-overload',
          name: 'Toko Busana Cantik',
          metadata: { plan: 'trial', maxMau: 10, maxAiResponses: 50 },
          _count: { whatsappInstances: 1 },
        },
      ]);

      // Toko Normal: 50 kontak, 400 pesan AI
      // Toko Overload: 15 kontak (melebihi max 10), 80 pesan AI (melebihi max 50)
      context.mockPrisma.contact.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(15);

      context.mockPrisma.message.count
        .mockResolvedValueOnce(400)
        .mockResolvedValueOnce(80);

      const res = await request(app.getHttpServer())
        .get('/api/v1/platform/quota-overview')
        .expect(200);

      expect(res.body).toHaveLength(2);

      // Klien normal
      expect(res.body[0].mauPercent).toBe(50);
      expect(res.body[0].aiPercent).toBe(40);

      // Klien overload (batas terlampaui)
      expect(res.body[1].mauPercent).toBe(150);
      expect(res.body[1].aiPercent).toBe(160);
    });
  });

  describe('3. Konfigurasi Sistem Platform (PlatformConfig Key-Value)', () => {
    it('Superadmin berhasil menyimpan dan memperbarui konfigurasi sistem (200)', async () => {
      const configPayload = {
        trialDays: 14,
        supportPhone: '628123456789',
      };

      context.mockPrisma.platformConfig.upsert.mockResolvedValue({
        key: 'system_settings',
        value: configPayload,
      });

      const res = await request(app.getHttpServer())
        .put('/api/v1/platform/config/system_settings')
        .send({ value: configPayload })
        .expect(200);

      expect(res.body.key).toBe('system_settings');
      expect(res.body.value).toEqual(configPayload);
    });

    it('Superadmin berhasil membaca konfigurasi sistem yang tersimpan (200)', async () => {
      context.mockPrisma.platformConfig.findUnique.mockResolvedValue({
        key: 'pricing',
        value: { pro: 1500000, business: 2500000 },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/platform/config/pricing')
        .expect(200);

      expect(res.body).toEqual({ pro: 1500000, business: 2500000 });
    });
  });

  describe('4. Batas Keamanan RBAC (Non-Superadmin Access Prevention)', () => {
    it('Manager biasa DITOLAK saat mencoba membaca quota overview platform (403)', async () => {
      currentUser = {
        sub: 'manager-user',
        email: 'manager@tenant.com',
        roles: ['manager'],
        tenantId: 'tenant-1',
      };

      const res = await request(app.getHttpServer())
        .get('/api/v1/platform/quota-overview')
        .expect(403);

      expect(res.body.message).toContain('Hanya Superadmin');
    });

    it('Operator biasa DITOLAK saat mencoba mengubah konfigurasi platform (403)', async () => {
      currentUser = {
        sub: 'operator-user',
        email: 'op@tenant.com',
        roles: ['operator'],
        tenantId: 'tenant-1',
      };

      const res = await request(app.getHttpServer())
        .put('/api/v1/platform/config/pricing')
        .send({ value: { pro: 500000 } })
        .expect(403);

      expect(res.body.message).toContain('Hanya Superadmin');
    });
  });
});
