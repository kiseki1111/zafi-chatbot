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
    sendTextMessage: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
  };

  const mockAgentShared = {
    generateFollowUpText: jest.fn().mockResolvedValue('Halo Kak, ada yang bisa dibantu kembali?'),
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
});
