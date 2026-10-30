import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { TenantModule } from '../src/features/web-dashboard/tenant/tenant.module';
import { OmnichannelModule } from '../src/core/omnichannel/omnichannel.module';
import { OmnichannelQueueService } from '../src/core/omnichannel/omnichannel-queue.service';
import { CsService } from '../src/features/agent-cs/cs.service';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { DataAgentService } from '../src/features/knowledge-ingest/data-agent.service';

describe('Tier Phase 5: Otomasi Notifikasi WhatsApp Kuota & Auto Top-Up', () => {
  let context: TestAppContext;
  let app: INestApplication;
  let queueService: OmnichannelQueueService;

  let currentUser: any = {
    sub: 'manager-1',
    email: 'manager@perusahaan.id',
    roles: ['manager'],
    tenantId: 't-silver',
  };

  const mockCsService = {
    handleMessage: jest.fn().mockResolvedValue({
      text: 'Jawaban bot aktif berkat auto top-up',
      images: [],
    }),
  };

  const mockDataAgent = {
    syncKnowledgeBase: jest.fn().mockResolvedValue({ ok: true }),
    ingestDocument: jest.fn().mockResolvedValue({ ok: true }),
  };

  beforeAll(async () => {
    context = await createTestApp(
      { imports: [TenantModule, OmnichannelModule] },
      (b) =>
        b
          .overrideGuard(JwtAuthGuard)
          .useValue({
            canActivate: (ctx: any) => {
              ctx.switchToHttp().getRequest().user = currentUser;
              return true;
            },
          })
          .overrideProvider(CsService)
          .useValue(mockCsService)
          .overrideProvider(DataAgentService)
          .useValue(mockDataAgent),
    );
    app = context.app;
    queueService = context.module.get<OmnichannelQueueService>(
      OmnichannelQueueService,
    );
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = {
      sub: 'manager-1',
      email: 'manager@perusahaan.id',
      roles: ['manager'],
      tenantId: 't-silver',
    };
  });

  describe('1. Pengaturan Auto Top-Up Booster S (Feature Gating)', () => {
    it('Harus menolak toggle Auto Top-Up jika tenant di paket Lite / Bronze (400)', async () => {
      currentUser.tenantId = 't-bronze';
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-bronze',
        metadata: { plan: 'bronze' },
      });

      const res = await request(app.getHttpServer())
        .patch('/api/v1/tenant/clients/t-bronze/auto-topup')
        .send({ autoTopUpEnabled: true })
        .expect(400);

      expect(res.body.message).toContain(
        'Auto Top-Up Booster S eksklusif untuk paket Silver',
      );
    });

    it('Harus mengizinkan toggle Auto Top-Up jika tenant di paket Silver / Gold (200)', async () => {
      currentUser.tenantId = 't-silver';
      const initialTenant = {
        id: 't-silver',
        metadata: { plan: 'silver', autoTopUpEnabled: false },
        whatsappInstances: [],
      };
      context.mockPrisma.tenant.findUnique.mockResolvedValue(initialTenant);
      context.mockPrisma.tenant.update.mockImplementation(async ({ data }) => ({
        ...initialTenant,
        metadata: data.metadata,
      }));

      const res = await request(app.getHttpServer())
        .patch('/api/v1/tenant/clients/t-silver/auto-topup')
        .send({ autoTopUpEnabled: true, autoTopUpMonthlyLimit: 5 })
        .expect(200);

      expect(res.body.autoTopUpEnabled).toBe(true);
      expect(res.body.autoTopUpMonthlyLimit).toBe(5);
    });
  });

  describe('2. Evaluasi & Pemicu Notifikasi Kuota WhatsApp (80% & 100%)', () => {
    it('Harus mencatat alert notifikasi kuota 80% saat pemakaian mendekati batas (201/200)', async () => {
      const tenant80 = {
        id: 't-silver',
        name: 'Zafi Properti Silver',
        phone: '628123456789',
        ownerChatId: '628123456789@c.us',
        metadata: {
          plan: 'silver',
          maxAiResponses: 10000,
          quotaAlerts: [],
        },
        whatsappInstances: [{ instanceName: 'inst-1', status: 'WORKING' }],
      };
      context.mockPrisma.tenant.findUnique.mockResolvedValue(tenant80);
      context.mockPrisma.conversation.findMany.mockResolvedValue([]);
      context.mockPrisma.message.count.mockResolvedValue(8200); // 82% dari 10.000
      context.mockPrisma.tenant.update.mockImplementation(async ({ data }) => ({
        ...tenant80,
        metadata: data.metadata,
      }));

      const res = await request(app.getHttpServer())
        .post('/api/v1/tenant/clients/t-silver/notify-quota')
        .expect(201);

      expect(res.body.quotaAlerts).toBeDefined();
      expect(res.body.quotaAlerts.some((a: any) => a.type === '80%')).toBe(
        true,
      );
    });
  });

  describe('3. Omnichannel Queue Auto Top-Up Execution', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('Saat kuota habis tetapi Auto Top-Up aktif, Booster S otomatis diterapkan dan bot AI tetap membalas pelanggan', async () => {
      context.mockPrisma.conversation.findFirst.mockResolvedValue({
        id: 'conv-auto-topup',
        mode: 'bot',
        whatsappInstance: { tenantId: 't-silver-auto' },
      });

      const currentMonth = new Date().toISOString().slice(0, 7);
      const tenantAuto = {
        id: 't-silver-auto',
        name: 'Auto Top-Up Client',
        metadata: {
          plan: 'silver',
          maxAiResponses: 10000,
          extraAiResponses: 0,
          extraMau: 0,
          autoTopUpEnabled: true,
          autoTopUpMonthlyLimit: 3,
          autoTopUpCount: 0,
          autoTopUpMonth: currentMonth,
        },
        whatsappInstances: [{ instanceName: 'inst-auto', status: 'WORKING' }],
      };
      context.mockPrisma.tenant.findUnique.mockResolvedValue(tenantAuto);

      // AI used 10000 (habis)
      context.mockPrisma.message.count.mockResolvedValue(10000);
      context.mockPrisma.conversation.findMany.mockResolvedValue([]);

      const replyCallback = jest.fn();

      await queueService.enqueue({
        provider: 'waha',
        senderId: '62811999888@c.us',
        sessionName: 'inst-auto',
        text: 'Halo kak, apakah ada diskon?',
        replyCallback,
      });

      await jest.runAllTimersAsync();

      // Memastikan tenant metadata di-update dengan penambahan Booster S (+2000 AI, +500 MAU)
      expect(context.mockPrisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't-silver-auto' },
          data: {
            metadata: expect.objectContaining({
              extraAiResponses: 2000,
              extraMau: 500,
              autoTopUpCount: 1,
            }),
          },
        }),
      );

      // Mode conversation TIDAK diubah jadi human karena auto top-up menyelamatkan bot
      expect(context.mockPrisma.conversation.update).not.toHaveBeenCalled();
      // Bot AI tetap membalas pesan pelanggan
      expect(mockCsService.handleMessage).toHaveBeenCalled();
      expect(replyCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Jawaban bot aktif berkat auto top-up',
        }),
      );
    });
  });
});
