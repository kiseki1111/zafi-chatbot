import { INestApplication } from '@nestjs/common';
import request from 'supertest';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_mock'),
  compare: jest.fn().mockResolvedValue(true),
}));

import { TenantModule } from '../src/features/web-dashboard/tenant/tenant.module';
import { AvailabilityModule } from '../src/modules/availability/availability.module';
import { WahaModule } from '../src/modules/waha/waha.module';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { DataAgentService } from '../src/features/knowledge-ingest/data-agent.service';
import { WahaService } from '../src/modules/waha/waha.service';
import { OmnichannelQueueService } from '../src/core/omnichannel/omnichannel-queue.service';
import { CsService } from '../src/features/agent-cs/cs.service';

describe('Tier Phase 1: Validasi Kapasitas Riil & Soft-Limit 110%', () => {
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
  };

  const mockWaha = {
    startSession: jest.fn().mockResolvedValue({ name: 'session-2', status: 'STARTING' }),
  };
  const mockQueue = { enqueue: jest.fn() };
  const mockCs = { handleMessage: jest.fn() };

  beforeAll(async () => {
    context = await createTestApp(
      { imports: [TenantModule, AvailabilityModule, WahaModule] },
      (b) =>
        b
          .overrideGuard(JwtAuthGuard)
          .useValue({
            canActivate: (ctx: any) => {
              ctx.switchToHttp().getRequest().user = currentUser;
              return true;
            },
          })
          .overrideProvider(DataAgentService)
          .useValue(mockDataAgent)
          .overrideProvider(WahaService)
          .useValue(mockWaha)
          .overrideProvider(OmnichannelQueueService)
          .useValue(mockQueue)
          .overrideProvider(CsService)
          .useValue(mockCs),
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

  describe('1. Validasi Batas Pengguna Staf (Admin / Sales)', () => {
    it('Harus menolak pembuatan staf jika tenant paket Lite telah mencapai batas 1 user (400)', async () => {
      // Setup mock tenant paket Lite dengan 1 user sudah ada
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-lite',
        name: 'Toko Lite',
        metadata: { plan: 'lite' }, // max 1 user
      });
      context.mockPrisma.user.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .post('/api/v1/tenant/clients/t-lite/users')
        .send({
          name: 'Staf Tambahan',
          email: 'staf2@lite.com',
          role: 'administrator',
        })
        .expect(400);

      expect(res.body.message).toContain('Batas kuota pengguna (1 user)');
    });

    it('Harus mengizinkan pembuatan staf untuk tenant Bronze jika kuota (3 user) belum habis (201)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-bronze',
        name: 'Bisnis Bronze',
        metadata: { plan: 'bronze' }, // max 3 user
      });
      context.mockPrisma.user.count.mockResolvedValue(1); // baru 1 user
      context.mockPrisma.user.create.mockResolvedValue({
        id: 'u-bronze-2',
        name: 'Staf 2',
        email: 'staf2@bronze.com',
        role: 'administrator',
        tenantId: 't-bronze',
        createdAt: new Date(),
      });
      context.mockPrisma.tenant.update.mockResolvedValue({ id: 't-bronze' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/tenant/clients/t-bronze/users')
        .send({
          name: 'Staf 2',
          email: 'staf2@bronze.com',
          role: 'administrator',
        })
        .expect(201);

      expect(res.body.id).toBe('u-bronze-2');
    });

    it('Harus mengizinkan pembuatan staf tanpa batas untuk Developer Mode (201)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-dev',
        name: 'Perusahaan SaaS Owner',
        metadata: { plan: 'developer' }, // unlimited
      });
      context.mockPrisma.user.count.mockResolvedValue(50);
      context.mockPrisma.user.create.mockResolvedValue({
        id: 'u-dev-51',
        name: 'Developer Staff 51',
        email: 'staff51@owner.id',
        role: 'administrator',
        tenantId: 't-dev',
        createdAt: new Date(),
      });
      context.mockPrisma.tenant.update.mockResolvedValue({ id: 't-dev' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/tenant/clients/t-dev/users')
        .send({
          name: 'Developer Staff 51',
          email: 'staff51@owner.id',
          role: 'administrator',
        })
        .expect(201);

      expect(res.body.id).toBe('u-dev-51');
    });
  });

  describe('2. Validasi Batas Proyek Perumahan (Siteplan)', () => {
    it('Harus menolak pembuatan proyek baru jika tenant paket Lite telah mencapai batas 1 proyek (400)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-lite',
        name: 'Developer Properti Lite',
        metadata: { plan: 'lite' }, // max 1 proyek
      });
      context.mockPrisma.resourceGroup.count.mockResolvedValue(1); // sudah ada 1 proyek

      const res = await request(app.getHttpServer())
        .post('/api/v1/availability/groups')
        .send({
          name: 'Perumahan Kedua',
          category: 'properti',
          tenantId: 't-lite',
        })
        .expect(400);

      expect(res.body.message).toContain('Batas kuota proyek (1 proyek)');
    });

    it('Harus mengizinkan pembuatan proyek jika kuota paket Silver (3 proyek) belum penuh (201)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-silver',
        name: 'Developer Silver',
        metadata: { plan: 'silver' }, // max 3 proyek
      });
      context.mockPrisma.resourceGroup.count.mockResolvedValue(2); // sudah ada 2 proyek
      context.mockPrisma.resourceGroup.create.mockResolvedValue({
        id: 'g-silver-3',
        name: 'Cluster Melati 3',
        category: 'properti',
        tenantId: 't-silver',
        items: [],
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/availability/groups')
        .send({
          name: 'Cluster Melati 3',
          category: 'properti',
          tenantId: 't-silver',
        })
        .expect(201);

      expect(res.body.id).toBe('g-silver-3');
    });
  });

  describe('3. Validasi Batas Nomor WhatsApp (Instances)', () => {
    it('Harus menolak pembuatan sesi WA baru jika tenant paket Lite telah mencapai batas 1 nomor (400)', async () => {
      currentUser.tenantId = 't-lite';
      context.mockPrisma.whatsappInstance.findUnique.mockResolvedValue(null);
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-lite',
        name: 'Lite Bisnis',
        metadata: { plan: 'lite' }, // max 1 nomor WA
      });
      context.mockPrisma.whatsappInstance.count.mockResolvedValue(1); // sudah 1 sesi

      const res = await request(app.getHttpServer())
        .post('/api/v1/waha/instances')
        .send({ name: 'sesi-wa-kedua' })
        .expect(400);

      expect(res.body.message).toContain('Batas kuota nomor WhatsApp (1 nomor)');
    });

    it('Harus mengizinkan pembuatan sesi WA kedua jika tenant berada di paket Silver (max 2 nomor) (201)', async () => {
      currentUser.tenantId = 't-silver';
      context.mockPrisma.whatsappInstance.findUnique.mockResolvedValue(null);
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-silver',
        name: 'Silver Bisnis',
        metadata: { plan: 'silver' }, // max 2 nomor WA
      });
      context.mockPrisma.whatsappInstance.count.mockResolvedValue(1); // baru 1 sesi
      context.mockPrisma.whatsappInstance.create.mockResolvedValue({
        id: 'inst-silver-2',
        instanceName: 'sesi-wa-silver-2',
        tenantId: 't-silver',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/waha/instances')
        .send({ name: 'sesi-wa-silver-2' })
        .expect(201);

      expect(mockWaha.startSession).toHaveBeenCalledWith(
        'sesi-wa-silver-2',
        expect.any(Array),
        undefined,
        't-silver',
      );
      expect(res.body.status).toBe('STARTING');
    });
  });

  describe('4. Mekanisme Soft-Limit 110% MAU (Grace Period)', () => {
    it('Harus mengaktifkan status Grace Period (isGracePeriod=true, isMauExceeded=false) saat MAU antara 100% dan 110%', async () => {
      // Paket Lite: maxMau 300, softLimitMau 330
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-lite',
        name: 'Klien Lite',
        metadata: { plan: 'lite' },
        whatsappInstances: [{ instanceName: 'inst-1' }],
      });
      // 315 kontak unik (105% dari 300)
      context.mockPrisma.conversation.findMany.mockResolvedValue(
        Array.from({ length: 315 }, (_, i) => ({ contactId: `c-${i}` })),
      );
      context.mockPrisma.message.count.mockResolvedValue(500);

      const res = await request(app.getHttpServer())
        .get('/api/v1/tenant/clients/t-lite/quota')
        .expect(200);

      expect(res.body.plan).toBe('lite');
      expect(res.body.maxMau).toBe(300);
      expect(res.body.softLimitMau).toBe(330);
      expect(res.body.mauUsed).toBe(315);
      expect(res.body.isGracePeriod).toBe(true);
      expect(res.body.isMauExceeded).toBe(false);
    });

    it('Harus menandai isMauExceeded=true saat MAU melampaui 110% (>330)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-lite',
        name: 'Klien Lite Over',
        metadata: { plan: 'lite' },
        whatsappInstances: [{ instanceName: 'inst-1' }],
      });
      // 340 kontak unik (> 330)
      context.mockPrisma.conversation.findMany.mockResolvedValue(
        Array.from({ length: 340 }, (_, i) => ({ contactId: `c-${i}` })),
      );
      context.mockPrisma.message.count.mockResolvedValue(600);

      const res = await request(app.getHttpServer())
        .get('/api/v1/tenant/clients/t-lite/quota')
        .expect(200);

      expect(res.body.isGracePeriod).toBe(false);
      expect(res.body.isMauExceeded).toBe(true);
    });
  });
});
