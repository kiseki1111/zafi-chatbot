import { INestApplication } from '@nestjs/common';
import request from 'supertest';

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

import { FollowUpModule } from '../src/modules/waha/follow-up/follow-up.module';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { WahaService } from '../src/modules/waha/waha.service';
import { AgentSharedService } from '../src/core/agent-shared/agent-shared.service';
import { OPENAI_CLIENT } from '../src/core/openai/openai.module';

describe('Follow-Up Automation Flow (e2e)', () => {
  let context: TestAppContext;
  let app: INestApplication;

  const mockUser = {
    sub: 'user-manager-1',
    email: 'manager@tenant.com',
    roles: ['manager'],
    tenantId: 'tenant-followup-1',
  };

  const mockWaha = {
    sendMessage: jest
      .fn()
      .mockResolvedValue({ success: true, messageId: 'msg-flw-1' }),
    sendTextMessage: jest
      .fn()
      .mockResolvedValue({ success: true, messageId: 'msg-1' }),
  };

  const mockAgentShared = {
    getRecentContext: jest.fn().mockResolvedValue([]),
    callLLM: jest
      .fn()
      .mockResolvedValue('Halo Kak, ada yang bisa dibantu kembali?'),
    generateFollowUpText: jest
      .fn()
      .mockResolvedValue('Halo Kak, ada yang bisa dibantu kembali?'),
  };

  beforeAll(async () => {
    context = await createTestApp(
      {
        imports: [FollowUpModule],
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
          .overrideProvider(WahaService)
          .useValue(mockWaha)
          .overrideProvider(AgentSharedService)
          .useValue(mockAgentShared)
          .overrideProvider(OPENAI_CLIENT)
          .useValue({}),
    );
    app = context.app;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/followup/config', () => {
    it('harus mengembalikan konfigurasi default jika belum pernah diset (200)', async () => {
      context.mockPrisma.followUpConfig.findUnique.mockResolvedValue(null);
      context.mockPrisma.followUpConfig.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/followup/config')
        .expect(200);

      expect(response.body).toHaveProperty('isEnabled', false);
      expect(response.body).toHaveProperty('scheduleTime', '09:00');
      expect(response.body).toHaveProperty('inactivityHours', 24);
    });
  });

  describe('PUT /api/v1/followup/config', () => {
    it('harus berhasil memperbarui konfigurasi follow-up tenant (200)', async () => {
      const updatedConfig = {
        id: 'cfg-1',
        tenantId: 'tenant-followup-1',
        isEnabled: true,
        scheduleTime: '10:00',
        inactivityHours: 12,
        followUpPrompt: 'Tanyakan apakah ingin konsultasi lebih lanjut',
      };
      context.mockPrisma.followUpConfig.upsert.mockResolvedValue(updatedConfig);

      const response = await request(app.getHttpServer())
        .put('/api/v1/followup/config')
        .send({
          isEnabled: true,
          scheduleTime: '10:00',
          inactivityHours: 12,
        })
        .expect(200);

      expect(response.body.isEnabled).toBe(true);
      expect(response.body.scheduleTime).toBe('10:00');
    });
  });

  describe('GET /api/v1/followup/stats', () => {
    it('harus mengembalikan statistik follow-up tenant (200)', async () => {
      context.mockPrisma.whatsappInstance.findMany.mockResolvedValue([
        { instanceName: 'inst-1' },
      ]);
      context.mockPrisma.followUp.count.mockResolvedValue(42);
      context.mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: false,
      });
      context.mockPrisma.conversation.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/followup/stats')
        .expect(200);

      expect(response.body).toHaveProperty('totalFollowedUp', 42);
      expect(response.body).toHaveProperty('pendingCount', 0);
      expect(response.body).toHaveProperty('isEnabled', false);
    });
  });

  describe('GET /api/v1/followup/list', () => {
    it('harus mengembalikan daftar kontak inaktif yang belum di-follow-up (200)', async () => {
      context.mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: true,
        inactivityHours: 24,
      });

      const pastDate = new Date(Date.now() - 36 * 3600 * 1000);
      context.mockPrisma.conversation.findMany.mockResolvedValue([
        {
          contactId: 'c-inactive-1',
          instanceName: 'zafi-property',
          contact: { id: 'c-inactive-1', phone: '62812345678', name: 'Dewi' },
          lastMessageAt: pastDate,
        },
      ]);
      context.mockPrisma.followUp.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/followup/list')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].contactId).toBe('c-inactive-1');
      expect(response.body[0].contactPhone).toBe('62812345678');
    });

    it('harus mengabaikan kontak yang sudah pernah di-follow-up jika belum ada balasan (200)', async () => {
      context.mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: true,
        inactivityHours: 24,
      });

      const pastDate = new Date(Date.now() - 36 * 3600 * 1000);
      context.mockPrisma.conversation.findMany.mockResolvedValue([
        {
          contactId: 'c-already-followed',
          instanceName: 'zafi-property',
          contact: {
            id: 'c-already-followed',
            phone: '62812345678',
            name: 'Dewi',
          },
          lastMessageAt: pastDate,
        },
      ]);
      context.mockPrisma.followUp.findMany.mockResolvedValue([
        {
          contactId: 'c-already-followed',
          instanceName: 'zafi-property',
          followedUpAt: new Date(Date.now() - 12 * 3600 * 1000),
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/followup/list')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe('POST /api/v1/followup/trigger', () => {
    it('harus mengeksekusi pengiriman follow-up dan mencatat ke database (201)', async () => {
      context.mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: true,
        inactivityHours: 24,
      });

      context.mockPrisma.conversation.findMany.mockResolvedValue([
        {
          contactId: 'c-trigger-1',
          instanceName: 'zafi-property',
          contact: {
            id: 'c-trigger-1',
            phone: '628199988877',
            name: 'Bambang',
          },
          lastMessageAt: new Date(Date.now() - 40 * 3600 * 1000),
        },
      ]);
      context.mockPrisma.followUp.findMany.mockResolvedValue([]);
      context.mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'c-trigger-1',
        phone: '628199988877',
        name: 'Bambang',
      });
      context.mockPrisma.conversation.findFirst.mockResolvedValue({
        id: 'conv-trigger-1',
        instanceName: 'zafi-property',
        contactId: 'c-trigger-1',
      });
      context.mockPrisma.message.create.mockResolvedValue({
        id: 'msg-created-1',
      });
      context.mockPrisma.followUp.create.mockResolvedValue({
        id: 'flw-created-1',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/followup/trigger')
        .expect(201);

      expect(response.body.sent).toBe(1);
      expect(response.body.processed).toBe(1);
      expect(mockWaha.sendMessage).toHaveBeenCalledWith(
        'zafi-property',
        '628199988877',
        expect.stringContaining('Halo'),
      );
    });
  });

  describe('GET /api/v1/followup/history', () => {
    it('harus mengembalikan riwayat pesan follow-up (200)', async () => {
      context.mockPrisma.whatsappInstance.findMany.mockResolvedValue([
        { instanceName: 'zafi-property' },
      ]);
      context.mockPrisma.followUp.findMany.mockResolvedValue([
        {
          id: 'hist-1',
          instanceName: 'zafi-property',
          contactId: 'c-1',
          followedUpAt: new Date(),
          contact: { phone: '62812345678', name: 'Budi' },
        },
      ]);
      context.mockPrisma.followUp.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/api/v1/followup/history?take=10')
        .expect(200);

      expect(response.body).toHaveProperty('total', 1);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].contactPhone).toBe('62812345678');
    });
  });
});
