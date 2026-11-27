import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { WahaModule } from '../../src/modules/waha/waha.module';
import { HrisModule } from '../../src/features/hris/hris.module';
import { AuthModule } from '../../src/features/web-dashboard/auth/auth.module';
import { WahaService } from '../../src/modules/waha/waha.service';
import { HrisAssistantService } from '../../src/features/hris/hris-assistant.service';
import { OmnichannelQueueService } from '../../src/core/omnichannel/omnichannel-queue.service';
import { createTestApp, TestAppContext } from '../helpers/create-test-app';

describe('E2E: Per-Tenant WAHA Personal Assistant (asisten-*) & HRIS Chat', () => {
  let context: TestAppContext;
  let app: INestApplication;
  const jwtService = new JwtService();

  const mockWahaService = {
    sendText: jest.fn().mockResolvedValue({ id: 'wamid-1' }),
    sendMedia: jest.fn(),
    sendVideo: jest.fn(),
    startTyping: jest.fn().mockResolvedValue(undefined),
    stopTyping: jest.fn().mockResolvedValue(undefined),
    syncInstances: jest.fn().mockResolvedValue([]),
  };

  const mockHrisAssistant = {
    handleMessage: jest.fn(),
  };

  const mockQueue = {
    enqueue: jest.fn(),
  };

  beforeAll(async () => {
    context = await createTestApp(
      { imports: [AuthModule, WahaModule, HrisModule] },
      (builder) =>
        builder
          .overrideProvider(WahaService)
          .useValue(mockWahaService)
          .overrideProvider(HrisAssistantService)
          .useValue(mockHrisAssistant)
          .overrideProvider(OmnichannelQueueService)
          .useValue(mockQueue),
    );
    app = context.app;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    context.mockPrisma.webhookLog.create = jest.fn().mockResolvedValue({});
    context.mockPrisma.contact.findFirst.mockResolvedValue(null);
    context.mockPrisma.contact.create.mockResolvedValue({
      id: 'contact-1',
      phone: '628123456789',
      name: 'Alam',
    });
    context.mockPrisma.conversation.findFirst.mockResolvedValue(null);
    context.mockPrisma.conversation.create.mockResolvedValue({
      id: 'conv-1',
      isAiEnabled: true,
    });
    context.mockPrisma.message.create.mockResolvedValue({ id: 'msg-1' });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('Webhook session "asisten-tenantA" me-route ke HrisAssistantService per-tenant & kirim balasan via WAHA (bukan CS queue)', async () => {
    context.mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
      id: 'inst-asisten-a',
      instanceName: 'asisten-tenanta',
      tenantId: 'tenant-A',
    });
    mockHrisAssistant.handleMessage.mockResolvedValueOnce({
      handled: true,
      reply: 'Halo Alam, sisa cuti Anda 12 hari.',
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/waha/webhook')
      .send({
        event: 'message',
        session: 'asisten-tenanta',
        payload: {
          id: 'msg-waha-1',
          from: '628123456789@c.us',
          body: 'sisa cuti saya berapa?',
          fromMe: false,
        },
      });

    expect([200, 201]).toContain(res.status);
    expect(mockHrisAssistant.handleMessage).toHaveBeenCalledWith(
      'tenant-A',
      '628123456789@c.us',
      'sisa cuti saya berapa?',
    );
    expect(mockWahaService.sendText).toHaveBeenCalledWith(
      'asisten-tenanta',
      '628123456789@c.us',
      'Halo Alam, sisa cuti Anda 12 hari.',
    );
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  it('Webhook session "asisten-tanpa-tenant" (tenantId null) diabaikan aman tanpa masuk CS queue', async () => {
    context.mockPrisma.whatsappInstance.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/api/v1/waha/webhook')
      .send({
        event: 'message',
        session: 'asisten-tanpa-tenant',
        payload: {
          id: 'msg-waha-2',
          from: '628123456789@c.us',
          body: 'halo',
          fromMe: false,
        },
      });

    expect([200, 201]).toContain(res.status);
    expect(mockHrisAssistant.handleMessage).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  it('Webhook session CS normal ("toko-alam") tetap masuk omnichannelQueue, bukan HrisAssistantService', async () => {
    context.mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
      id: 'inst-cs-a',
      instanceName: 'toko-alam',
      tenantId: 'tenant-A',
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/waha/webhook')
      .send({
        event: 'message',
        session: 'toko-alam',
        payload: {
          id: 'msg-waha-3',
          from: '628123456789@c.us',
          body: 'harga produk berapa kak?',
          fromMe: false,
        },
      });

    expect([200, 201]).toContain(res.status);
    expect(mockHrisAssistant.handleMessage).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).toHaveBeenCalled();
  });

  it('POST /api/v1/hris/assistant/chat menjaga auth & RBAC per-tenant', async () => {
    const unauth = await request(app.getHttpServer())
      .post('/api/v1/hris/assistant/chat')
      .send({ phone: '628123', text: 'cek cuti' });
    expect(unauth.status).toBe(401);

    const operatorToken = await jwtService.signAsync(
      { sub: 'u-op', email: 'op@a.com', roles: ['operator'], tenantId: 'tenant-A' },
      { secret: 'test_jwt_access_secret_12345' },
    );
    const forbidden = await request(app.getHttpServer())
      .post('/api/v1/hris/assistant/chat')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ phone: '628123', text: 'cek cuti' });
    expect(forbidden.status).toBe(403);

    const managerToken = await jwtService.signAsync(
      { sub: 'u-mgr', email: 'mgr@a.com', roles: ['manager'], tenantId: 'tenant-A' },
      { secret: 'test_jwt_access_secret_12345' },
    );
    mockHrisAssistant.handleMessage.mockResolvedValueOnce({
      handled: true,
      reply: 'Sisa cuti Anda 10 hari.',
    });

    const ok = await request(app.getHttpServer())
      .post('/api/v1/hris/assistant/chat')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ phone: '628123', text: 'cek cuti' });
    expect(ok.status).toBe(201);
    expect(mockHrisAssistant.handleMessage).toHaveBeenCalledWith('tenant-A', '628123', 'cek cuti');
  });
});
