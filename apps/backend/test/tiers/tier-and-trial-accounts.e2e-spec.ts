import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_mock'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => {},
  CronExpression: {
    EVERY_DAY_AT_9AM: '0 9 * * *',
    EVERY_MINUTE: '* * * * *',
  },
  ScheduleModule: {
    forRoot: () => ({ module: class MockScheduleModule {} }),
  },
}));

import { AuthModule } from '../../src/features/web-dashboard/auth/auth.module';
import { TenantModule } from '../../src/features/web-dashboard/tenant/tenant.module';
import { AvailabilityModule } from '../../src/modules/availability/availability.module';
import { WahaModule } from '../../src/modules/waha/waha.module';
import { KnowledgeModule } from '../../src/modules/knowledge/knowledge.module';
import { createTestApp, TestAppContext } from '../helpers/create-test-app';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { DataAgentService } from '../../src/features/knowledge-ingest/data-agent.service';
import { WahaService } from '../../src/modules/waha/waha.service';
import { OmnichannelQueueService } from '../../src/core/omnichannel/omnichannel-queue.service';
import { CsService } from '../../src/features/agent-cs/cs.service';
import { OPENAI_CLIENT } from '../../src/core/openai/openai.module';

describe('Tier & Trial Accounts E2E Test Suite (All Tiers & 14-Day Trial Lifecycle)', () => {
  let context: TestAppContext;
  let app: INestApplication;

  let currentUser: any = {
    sub: 'user-manager-1',
    email: 'manager@trial.com',
    roles: ['manager'],
    tenantId: 'tenant-trial-1',
  };

  const mockDataAgent = {
    syncKnowledgeBase: jest.fn().mockResolvedValue({ ok: true }),
  };

  const mockWaha = {
    startSession: jest.fn().mockResolvedValue({ name: 'session-wa', status: 'STARTING' }),
  };
  const mockQueue = { enqueue: jest.fn() };
  const mockCs = { handleMessage: jest.fn() };
  const mockOpenAi = {
    chat: { completions: { create: jest.fn() } },
    embeddings: { create: jest.fn() },
  };

  beforeAll(async () => {
    process.env.SECURITY_BYPASS_MODE = 'false';
    context = await createTestApp(
      {
        imports: [
          AuthModule,
          TenantModule,
          AvailabilityModule,
          WahaModule,
          KnowledgeModule,
        ],
      },
      (builder) =>
        builder
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
          .useValue(mockCs)
          .overrideProvider(OPENAI_CLIENT)
          .useValue(mockOpenAi),
    );
    app = context.app;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. PENGUJIAN AKUN TRIAL (14-DAY TRIAL LIFECYCLE)
  // =========================================================================
  describe('1. Siklus Hidup Akun Trial 14 Hari', () => {
    it('Akun Trial Aktif (Hari ke-1 s/d 14) berhasil login (200) & menerima token', async () => {
      const activeTrialTenant = {
        id: 't-trial-active',
        name: 'PT Properti Baru (Trial)',
        metadata: {
          plan: 'lite',
          isTrial: true,
          trialStartedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Hari ke-3
          trialExpiresAt: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(), // Masih 11 hari lagi
          maxMau: 300,
          maxAiResponses: 1000,
        },
      };

      const dummyUser = {
        id: 'user-trial-active',
        email: 'trial.aktif@perusahaan.com',
        password: 'hashed_password_mock',
        role: 'manager',
        isActive: true,
        tenantId: activeTrialTenant.id,
        tenant: activeTrialTenant,
      };

      context.mockPrisma.user.findUnique.mockResolvedValue(dummyUser);
      context.mockPrisma.user.update.mockResolvedValue(dummyUser);
      context.mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' } as any);
      context.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' } as any);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'trial.aktif@perusahaan.com',
          passwordPlain: 'Trial@123',
        })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe('trial.aktif@perusahaan.com');
    });

    it('Akun Trial yang SUDAH LEBIH DARI 14 HARI otomatis DITOLAK login (403 Forbidden)', async () => {
      const expiredTrialTenant = {
        id: 't-trial-expired',
        name: 'CV Kadaluarsa',
        metadata: {
          plan: 'lite',
          isTrial: true,
          trialStartedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(), // 16 hari lalu
          trialExpiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Sudah lewat 2 hari
          maxMau: 300,
          maxAiResponses: 1000,
        },
      };

      const dummyExpiredUser = {
        id: 'user-trial-expired',
        email: 'trial.habis@perusahaan.com',
        password: 'hashed_password_mock',
        role: 'manager',
        isActive: true,
        tenantId: expiredTrialTenant.id,
        tenant: expiredTrialTenant,
      };

      context.mockPrisma.user.findUnique.mockResolvedValue(dummyExpiredUser);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'trial.habis@perusahaan.com',
          passwordPlain: 'Trial@123',
        })
        .expect(403);

      expect(res.body.message).toContain('Masa trial 14 hari akun Anda telah berakhir');
    });

    it('Akun Superadmin tidak pernah terpengaruh pembatasan masa trial (200)', async () => {
      const superadminUser = {
        id: 'admin-platform',
        email: 'superadmin@platform.internal',
        password: 'hashed_password_mock',
        role: 'superadmin',
        isActive: true,
        tenantId: null,
        tenant: null,
      };

      context.mockPrisma.user.findUnique.mockResolvedValue(superadminUser);
      context.mockPrisma.user.update.mockResolvedValue(superadminUser);
      context.mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-adm' } as any);
      context.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-adm' } as any);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'superadmin@platform.internal',
          passwordPlain: 'SuperSecret123!',
        })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
    });
  });

  // =========================================================================
  // 2. PENGUJIAN TIER LITE (UMKM) & BATASANNYA
  // =========================================================================
  describe('2. Pengujian Akun Tier LITE (Maks 1 WA, 1 Proyek, 1 Staf, No Premium Features)', () => {
    beforeEach(() => {
      currentUser = {
        sub: 'manager-lite-1',
        email: 'manager@lite.com',
        roles: ['manager'],
        tenantId: 'tenant-lite-id',
      };
    });

    it('Lite: Menolak pendaftaran nomor WhatsApp ke-2 saat kuota 1 nomor sudah terpakai (400)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-lite-id',
        metadata: { plan: 'lite' },
      });
      // Sudah ada 1 instance aktif
      context.mockPrisma.whatsappInstance.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .post('/api/v1/waha/instances')
        .send({ name: 'wa-nomor-kedua' })
        .expect(400);

      expect(res.body.message).toContain('Batas kuota nomor WhatsApp');
    });

    it('Lite: Menolak pembuatan proyek properti ke-2 saat kuota 1 proyek sudah tercapai (400)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-lite-id',
        metadata: { plan: 'lite' },
      });
      // Sudah ada 1 proyek
      context.mockPrisma.resourceGroup.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .post('/api/v1/availability/groups')
        .send({ name: 'Cluster Kedua Lite', category: 'properti' })
        .expect(400);

      expect(res.body.message).toContain('Batas kuota proyek');
    });

    it('Lite: Menolak penambahan user staf ke-2 saat kuota 1 staf sudah tercapai (400)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-lite-id',
        metadata: { plan: 'lite' },
      });
      // Sudah ada 1 user (manajer)
      context.mockPrisma.user.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .post('/api/v1/tenant/clients/tenant-lite-id/users')
        .send({
          name: 'Staf Tambahan',
          email: 'staf2@lite.com',
          role: 'operator',
        })
        .expect(400);

      expect(res.body.message).toContain('Batas kuota pengguna (1 user)');
    });

    it('Lite (Feature Gating): Menolak upload galeri media video properti (400)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-lite-id',
        metadata: { plan: 'lite' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/availability/upload?purpose=gallery')
        .attach('file', Buffer.from('fake-video-content'), 'tour.mp4')
        .expect(400);

      expect(res.body.message).toContain('Fitur galeri foto & video properti eksklusif untuk paket Silver');
    });
  });

  // =========================================================================
  // 3. PENGUJIAN TIER BRONZE (STARTER) & BATASANNYA
  // =========================================================================
  describe('3. Pengujian Akun Tier BRONZE (Maks 1 WA, 1 Proyek, 3 Staf)', () => {
    beforeEach(() => {
      currentUser = {
        sub: 'manager-bronze-1',
        email: 'manager@bronze.com',
        roles: ['manager'],
        tenantId: 'tenant-bronze-id',
      };
    });

    it('Bronze: Mengizinkan pembuatan staf ke-2 dan ke-3, namun MENOLAK staf ke-4 (400)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-bronze-id',
        metadata: { plan: 'bronze' },
      });

      // Kasus A: User ke-2 diizinkan (201)
      context.mockPrisma.user.count.mockResolvedValueOnce(1);
      context.mockPrisma.user.create.mockResolvedValueOnce({
        id: 'user-bronze-2',
        name: 'Staf Kedua',
        email: 'staf2@bronze.com',
        role: 'operator',
      });

      await request(app.getHttpServer())
        .post('/api/v1/tenant/clients/tenant-bronze-id/users')
        .send({
          name: 'Staf Kedua',
          email: 'staf2@bronze.com',
          role: 'operator',
        })
        .expect(201);

      // Kasus B: User ke-4 ditolak (sudah ada 3 staf) (400)
      context.mockPrisma.user.count.mockResolvedValueOnce(3);

      const resReject = await request(app.getHttpServer())
        .post('/api/v1/tenant/clients/tenant-bronze-id/users')
        .send({
          name: 'Staf Keempat',
          email: 'staf4@bronze.com',
          role: 'operator',
        })
        .expect(400);

      expect(resReject.body.message).toContain('Batas kuota pengguna (3 user)');
    });
  });

  // =========================================================================
  // 4. PENGUJIAN TIER SILVER (PRO) & BENEFITNYA
  // =========================================================================
  describe('4. Pengujian Akun Tier SILVER (Maks 2 WA, 3 Proyek, 6 Staf, Video & OCR Terbuka)', () => {
    beforeEach(() => {
      currentUser = {
        sub: 'manager-silver-1',
        email: 'manager@silver.com',
        roles: ['manager'],
        tenantId: 'tenant-silver-id',
      };
    });

    it('Silver: Mengizinkan hingga 3 proyek kavling perumahan, menolak proyek ke-4 (400)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-silver-id',
        metadata: { plan: 'silver' },
      });

      // Kasus A: Proyek ke-3 berhasil dibuat (201)
      context.mockPrisma.resourceGroup.count.mockResolvedValueOnce(2);
      context.mockPrisma.resourceGroup.create.mockResolvedValueOnce({
        id: 'group-silver-3',
        name: 'Cluster Melati Silver',
        category: 'properti',
      });

      await request(app.getHttpServer())
        .post('/api/v1/availability/groups')
        .send({ name: 'Cluster Melati Silver', category: 'properti' })
        .expect(201);

      // Kasus B: Proyek ke-4 ditolak (kuota 3 tercapai) (400)
      context.mockPrisma.resourceGroup.count.mockResolvedValueOnce(3);

      const resReject = await request(app.getHttpServer())
        .post('/api/v1/availability/groups')
        .send({ name: 'Cluster Keempat Silver', category: 'properti' })
        .expect(400);

      expect(resReject.body.message).toContain('Batas kuota proyek');
    });

    it('Silver: Menolak penambahan nomor WhatsApp ke-3 (kuota 2 nomor tercapai) (400)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-silver-id',
        metadata: { plan: 'silver' },
      });
      // Sudah ada 2 nomor
      context.mockPrisma.whatsappInstance.count.mockResolvedValue(2);

      const res = await request(app.getHttpServer())
        .post('/api/v1/waha/instances')
        .send({ name: 'nomor-ketiga-silver' })
        .expect(400);

      expect(res.body.message).toContain('Batas kuota nomor WhatsApp');
    });

    it('Silver (Feature Gating): Mengizinkan upload galeri media video (201)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-silver-id',
        metadata: { plan: 'silver' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/availability/upload?purpose=gallery')
        .attach('file', Buffer.from('fake-mp4-video-buffer'), 'cluster-tour.mp4')
        .expect(201);

      expect(res.body).toHaveProperty('url');
    });
  });

  // =========================================================================
  // 5. PENGUJIAN TIER GOLD (BUSINESS) & BATASANNYA
  // =========================================================================
  describe('5. Pengujian Akun Tier GOLD (Maks 4 WA, 8 Proyek, 12 Staf)', () => {
    beforeEach(() => {
      currentUser = {
        sub: 'manager-gold-1',
        email: 'manager@gold.com',
        roles: ['manager'],
        tenantId: 'tenant-gold-id',
      };
    });

    it('Gold: Mengizinkan hingga 12 akun staf admin & sales, menolak staf ke-13 (400)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-gold-id',
        metadata: { plan: 'gold' },
      });

      // Sudah ada 12 user
      context.mockPrisma.user.count.mockResolvedValue(12);

      const res = await request(app.getHttpServer())
        .post('/api/v1/tenant/clients/tenant-gold-id/users')
        .send({
          name: 'Staf Tiga Belas',
          email: 'staf13@gold.com',
          role: 'operator',
        })
        .expect(400);

      expect(res.body.message).toContain('Batas kuota pengguna (12 user)');
    });
  });

  // =========================================================================
  // 6. PENGUJIAN TIER DEVELOPER (ROOT INTERNAL)
  // =========================================================================
  describe('6. Pengujian Akun Tier DEVELOPER (Root Unlimited Bypass)', () => {
    beforeEach(() => {
      currentUser = {
        sub: 'root-dev-1',
        email: 'root@developer.internal',
        roles: ['manager'],
        tenantId: 'tenant-dev-mode',
      };
    });

    it('Developer: Tetap diizinkan menambah user staf meski sudah memiliki puluhan user (201)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-dev-mode',
        metadata: { plan: 'developer' },
      });

      // Sudah ada 50 user, tapi Developer mode berkapasitas 999 user
      context.mockPrisma.user.count.mockResolvedValue(50);
      context.mockPrisma.user.create.mockResolvedValue({
        id: 'user-dev-51',
        name: 'Dev Staff 51',
        email: 'staff51@dev.id',
        role: 'operator',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/tenant/clients/tenant-dev-mode/users')
        .send({
          name: 'Dev Staff 51',
          email: 'staff51@dev.id',
          role: 'operator',
        })
        .expect(201);

      expect(res.body.id).toBe('user-dev-51');
    });
  });
});
