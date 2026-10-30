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
import { AvailabilityModule } from '../src/modules/availability/availability.module';
import { KnowledgeModule } from '../src/modules/knowledge/knowledge.module';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { WahaService } from '../src/modules/waha/waha.service';
import { AgentSharedService } from '../src/core/agent-shared/agent-shared.service';
import { DataAgentService } from '../src/features/knowledge-ingest/data-agent.service';
import { OPENAI_CLIENT } from '../src/core/openai/openai.module';

describe('Tier Phase 2: Feature Gating Modul (Lite & Bronze Restrictions)', () => {
  let context: TestAppContext;
  let app: INestApplication;

  let currentUser: any = {
    sub: 'manager-1',
    email: 'manager@perusahaan.id',
    roles: ['manager'],
    tenantId: 't-lite',
  };

  const mockWaha = {
    sendMessage: jest.fn().mockResolvedValue({ id: 'msg-waha-1' }),
    sendTextMessage: jest.fn(),
  };

  const mockAgentShared = {
    getRecentContext: jest.fn().mockResolvedValue([]),
    callLLM: jest.fn().mockResolvedValue('Halo prospek, properti masih ready'),
  };

  const mockDataAgent = {
    syncKnowledgeBase: jest.fn().mockResolvedValue({ ok: true }),
    ingestDocument: jest.fn().mockResolvedValue({ ok: true }),
  };

  const mockOpenAI = {
    embeddings: {
      create: jest.fn().mockResolvedValue({ data: [{ embedding: [] }] }),
    },
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'OCR text' } }],
        }),
      },
    },
  };

  beforeAll(async () => {
    context = await createTestApp(
      { imports: [FollowUpModule, AvailabilityModule, KnowledgeModule] },
      (b) =>
        b
          .overrideGuard(JwtAuthGuard)
          .useValue({
            canActivate: (ctx: any) => {
              ctx.switchToHttp().getRequest().user = currentUser;
              return true;
            },
          })
          .overrideProvider(WahaService)
          .useValue(mockWaha)
          .overrideProvider(AgentSharedService)
          .useValue(mockAgentShared)
          .overrideProvider(DataAgentService)
          .useValue(mockDataAgent)
          .overrideProvider(OPENAI_CLIENT)
          .useValue(mockOpenAI),
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
      tenantId: 't-lite',
    };
  });

  describe('1. Feature Gating Follow-Up (Kustom Jam & Manual Trigger)', () => {
    it('Harus menolak kustom scheduleTime (jam kirim) jika tenant di paket Lite (400)', async () => {
      currentUser.tenantId = 't-lite';
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-lite',
        metadata: { plan: 'lite' },
      });

      const res = await request(app.getHttpServer())
        .put('/api/v1/followup/config')
        .send({ isEnabled: true, scheduleTime: '15:30' })
        .expect(400);

      expect(res.body.message).toContain(
        'kustom jam kirim follow-up eksklusif',
      );
    });

    it('Harus mengizinkan kustom scheduleTime jika tenant berada di paket Silver (200)', async () => {
      currentUser.tenantId = 't-silver';
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-silver',
        metadata: { plan: 'silver' },
      });
      context.mockPrisma.followUpConfig.upsert.mockResolvedValue({
        id: 'cfg-silver',
        tenantId: 't-silver',
        scheduleTime: '15:30',
        isEnabled: true,
      });

      const res = await request(app.getHttpServer())
        .put('/api/v1/followup/config')
        .send({ isEnabled: true, scheduleTime: '15:30' })
        .expect(200);

      expect(res.body.scheduleTime).toBe('15:30');
    });

    it('Harus menolak antrean manual / trigger sekarang jika tenant di paket Bronze (400)', async () => {
      currentUser.tenantId = 't-bronze';
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-bronze',
        metadata: { plan: 'bronze' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/followup/trigger')
        .send({})
        .expect(400);

      expect(res.body.message).toContain(
        'antrean follow-up manual & trigger sekarang',
      );
    });

    it('Harus mengizinkan manual trigger jika tenant di paket Gold / Developer (201)', async () => {
      currentUser.tenantId = 't-gold';
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-gold',
        metadata: { plan: 'gold' },
      });
      context.mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: false,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/followup/trigger')
        .send({})
        .expect(201);

      expect(res.body).toBeDefined();
    });
  });

  describe('2. Feature Gating Ekstraksi OCR Gambar / Dokumen (Knowledge)', () => {
    it('Harus menolak ekstraksi OCR file gambar jika tenant di paket Bronze (400)', async () => {
      currentUser.tenantId = 't-bronze';
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-bronze',
        metadata: { plan: 'bronze' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/knowledge/file')
        .attach(
          'file',
          Buffer.from('fake-image-content'),
          'pricelist-cluster.jpg',
        )
        .field('title', 'Pricelist Cluster')
        .expect(400);

      expect(res.body.message).toContain(
        'ekstraksi OCR dokumen & gambar dengan AI eksklusif',
      );
    });
  });

  describe('3. Feature Gating Galeri Video Properti (Availability)', () => {
    it('Harus menolak unggah video galeri jika tenant berada di paket Lite (400)', async () => {
      currentUser.tenantId = 't-lite';
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-lite',
        metadata: { plan: 'lite' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/availability/upload')
        .attach('file', Buffer.from('fake-mp4-data'), 'show-unit-tour.mp4')
        .expect(400);

      expect(res.body.message).toContain(
        'galeri foto & video properti eksklusif',
      );
    });

    it('Harus mengizinkan unggah media visual jika tenant berada di paket Silver (201)', async () => {
      currentUser.tenantId = 't-silver';
      context.mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-silver',
        metadata: { plan: 'silver' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/availability/upload')
        .attach('file', Buffer.from('fake-mp4-data'), 'cluster-tour.mp4')
        .expect(201);

      expect(res.body.mediaType).toBe('video');
    });
  });
});
