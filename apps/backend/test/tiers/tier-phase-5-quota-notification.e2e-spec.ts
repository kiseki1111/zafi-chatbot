import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { TenantModule } from '../../src/features/web-dashboard/tenant/tenant.module';
import { CsService } from '../../src/features/agent-cs/cs.service';
import { createTestApp, TestAppContext } from '../helpers/create-test-app';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { DataAgentService } from '../../src/features/knowledge-ingest/data-agent.service';

describe('Tier Phase 5: Otomasi Notifikasi WhatsApp Kuota', () => {
  let context: TestAppContext;
  let app: INestApplication;

  let currentUser: any = {
    sub: 'manager-1',
    email: 'manager@perusahaan.id',
    roles: ['manager'],
    tenantId: 't-silver',
  };

  const mockCsService = {
    handleMessage: jest.fn().mockResolvedValue({
      text: 'Jawaban bot aktif',
      images: [],
    }),
  };

  const mockDataAgent = {
    syncKnowledgeBase: jest.fn().mockResolvedValue({ ok: true }),
    ingestDocument: jest.fn().mockResolvedValue({ ok: true }),
  };

  beforeAll(async () => {
    context = await createTestApp(
      { imports: [TenantModule] },
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

  describe('1. Evaluasi & Pemicu Notifikasi Kuota WhatsApp (80% & 100%)', () => {
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
});
