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

describe('Potongan 5: Automated Follow-Up Engine (Boundary & Anti-Duplicate Test)', () => {
  let context: TestAppContext;
  let app: INestApplication;

  const mockUser = {
    sub: 'manager-followup',
    email: 'manager@tenant.com',
    roles: ['manager'],
    tenantId: 'tenant-flw-1',
  };

  const mockWaha = {
    sendMessage: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-flw-1' }),
    sendTextMessage: jest.fn().mockResolvedValue({ success: true }),
  };

  const mockAgentShared = {
    getRecentContext: jest.fn().mockResolvedValue([]),
    callLLM: jest.fn().mockResolvedValue('Halo Kak, apakah ada yang bisa dibantu lagi hari ini? 😊'),
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
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Batas Konfigurasi & Parameter Jadwal', () => {
    it('Berhasil memperbarui parameter jam dan durasi inaktivitas (200)', async () => {
      const configData = {
        id: 'cfg-1',
        tenantId: 'tenant-flw-1',
        isEnabled: true,
        scheduleTime: '08:30',
        inactivityHours: 12,
        followUpPrompt: 'Tawarkan diskon ongkir hari ini',
      };
      context.mockPrisma.followUpConfig.upsert.mockResolvedValue(configData);

      const res = await request(app.getHttpServer())
        .put('/api/v1/followup/config')
        .send({
          isEnabled: true,
          scheduleTime: '08:30',
          inactivityHours: 12,
          followUpPrompt: 'Tawarkan diskon ongkir hari ini',
        })
        .expect(200);

      expect(res.body.scheduleTime).toBe('08:30');
      expect(res.body.inactivityHours).toBe(12);
      expect(res.body.isEnabled).toBe(true);
    });
  });

  describe('2. Batas Anti-Duplicate & Filter Kontak Inaktif', () => {
    it('Jika follow-up non-aktif (isEnabled: false), daftar inaktif kosong (200)', async () => {
      context.mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: false,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/followup/list')
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('Kontak yang SUDAH pernah di-follow-up di sesi bersangkutan otomatis DIBLOKIR/DIKELUARKAN (200)', async () => {
      context.mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: true,
        inactivityHours: 24,
      });

      // Dua kontak sama-sama inaktif > 24 jam
      context.mockPrisma.conversation.findMany.mockResolvedValue([
        {
          contactId: 'contact-sudah-pernah',
          instanceName: 'session-wa',
          contact: { id: 'contact-sudah-pernah', phone: '6281111111', name: 'Budi' },
          lastMessageAt: new Date(Date.now() - 48 * 3600 * 1000),
        },
        {
          contactId: 'contact-baru-inaktif',
          instanceName: 'session-wa',
          contact: { id: 'contact-baru-inaktif', phone: '6282222222', name: 'Siti' },
          lastMessageAt: new Date(Date.now() - 30 * 3600 * 1000),
        },
      ]);

      // Database menyatakan Budi sudah pernah difollow-up
      context.mockPrisma.followUp.findMany.mockResolvedValue([
        { contactId: 'contact-sudah-pernah', instanceName: 'session-wa' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/followup/list')
        .expect(200);

      // Hanya Siti yang boleh masuk, Budi wajib di-filter keluar!
      expect(res.body).toHaveLength(1);
      expect(res.body[0].contactId).toBe('contact-baru-inaktif');
      expect(res.body[0].contactPhone).toBe('6282222222');
    });
  });

  describe('3. Batas Eksekusi Trigger & Ketahanan Jaringan WAHA', () => {
    it('Trigger saat konfigurasi mati menghasilkan processed: 0 tanpa mengirim chat (201)', async () => {
      context.mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: false,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/followup/trigger')
        .expect(201);

      expect(res.body.processed).toBe(0);
      expect(mockWaha.sendMessage).not.toHaveBeenCalled();
    });

    it('Trigger sukses mengirim follow-up dan mencatat riwayat transaksi ke database (201)', async () => {
      context.mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: true,
        inactivityHours: 24,
      });

      // Ada 1 kontak inaktif yang belum pernah difollow-up
      context.mockPrisma.conversation.findMany.mockResolvedValue([
        {
          contactId: 'contact-1',
          instanceName: 'session-wa',
          contact: { id: 'contact-1', phone: '62855555555', name: 'Andi' },
          lastMessageAt: new Date(Date.now() - 35 * 3600 * 1000),
        },
      ]);
      context.mockPrisma.followUp.findMany.mockResolvedValue([]);
      context.mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'contact-1',
        phone: '62855555555',
      });
      context.mockPrisma.followUp.create.mockResolvedValue({ id: 'flw-rec-1' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/followup/trigger')
        .expect(201);

      expect(res.body.sent).toBe(1);
      expect(mockWaha.sendMessage).toHaveBeenCalledWith(
        'session-wa',
        '62855555555',
        expect.stringContaining('Halo'),
      );
      expect(context.mockPrisma.followUp.create).toHaveBeenCalledWith({
        data: {
          contactId: 'contact-1',
          instanceName: 'session-wa',
        },
      });
    });

    it('Ketahanan jika pengiriman WAHA gagal: Server mencatat error tanpa melempar HTTP 500 (201)', async () => {
      context.mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: true,
        inactivityHours: 24,
      });
      context.mockPrisma.conversation.findMany.mockResolvedValue([
        {
          contactId: 'contact-offline',
          instanceName: 'session-wa',
          contact: { id: 'contact-offline', phone: '62866666666' },
          lastMessageAt: new Date(Date.now() - 40 * 3600 * 1000),
        },
      ]);
      context.mockPrisma.followUp.findMany.mockResolvedValue([]);

      // Simulasi WAHA service error / network down
      mockWaha.sendMessage.mockRejectedValue(new Error('WAHA Instance Disconnected'));

      const res = await request(app.getHttpServer())
        .post('/api/v1/followup/trigger')
        .expect(201);

      expect(res.body.sent).toBe(0);
      expect(res.body.errors).toBe(1);
    });
  });
});
