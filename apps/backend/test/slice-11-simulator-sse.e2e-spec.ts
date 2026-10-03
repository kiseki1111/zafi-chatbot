import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SimulatorModule } from '../src/features/simulator/simulator.module';
import { ChatsModule } from '../src/modules/chats/chats.module';
import { ChatStreamService } from '../src/modules/chats/chat-stream.service';
import { CsService } from '../src/features/agent-cs/cs.service';
import { AgentAssistantService } from '../src/features/agent-assistant/agent-assistant.service';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

describe('Slice-11: AI Simulator Sandbox & SSE Chat Stream (Real-Time)', () => {
  let context: TestAppContext;
  let app: INestApplication;
  let chatStreamService: ChatStreamService;

  const mockUser = {
    sub: 'user-manager-sim',
    email: 'manager@sim.com',
    roles: ['manager'],
    tenantId: 'tenant-sim',
  };

  const mockCsService = {
    handleMessage: jest.fn().mockResolvedValue({
      text: 'Halo! Ini respon simulasi CS bot.',
      images: [],
      videos: [],
    }),
  };

  const mockAssistantService = {
    handleAssistantChat: jest.fn().mockResolvedValue({
      text: 'Halo Bos! Ini respon simulasi Asisten.',
    }),
  };

  beforeAll(async () => {
    context = await createTestApp(
      {
        imports: [SimulatorModule, ChatsModule],
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
          .overrideProvider(CsService)
          .useValue(mockCsService)
          .overrideProvider(AgentAssistantService)
          .useValue(mockAssistantService),
    );

    app = context.app;
    chatStreamService = context.module.get<ChatStreamService>(ChatStreamService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. AI Simulator History & Chat Simulation', () => {
    it('Mengambil riwayat percakapan simulator jika kontak ada di database (200)', async () => {
      context.mockPrisma.contact.findUnique.mockResolvedValue({ id: 'contact-sim-1' });
      context.mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-sim-1' });
      context.mockPrisma.message.findMany.mockResolvedValue([
        {
          id: 'msg-1',
          senderType: 'customer',
          content: 'Halo mau tanya produk',
          createdAt: new Date(),
        },
        {
          id: 'msg-2',
          senderType: 'bot',
          content: 'Halo kak, produk kami ready',
          createdAt: new Date(),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/agent/simulator/history/628123456789')
        .expect(200);

      expect(res.body).toHaveProperty('messages');
      expect(res.body.messages).toHaveLength(2);
      expect(res.body.messages[0].sender).toBe('user');
      expect(res.body.messages[1].sender).toBe('bot');
    });

    it('Mengembalikan array kosong jika chatId simulator belum pernah chat (200)', async () => {
      context.mockPrisma.contact.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/v1/agent/simulator/history/nomor-baru')
        .expect(200);

      expect(res.body).toEqual({ messages: [] });
    });

    it('Simulasi chat sebagai customer menghasilkan respon dari CS bot (200/201)', async () => {
      context.mockPrisma.contact.upsert.mockResolvedValue({ id: 'c-sim' });
      context.mockPrisma.conversation.upsert.mockResolvedValue({ id: 'conv-sim' });
      context.mockPrisma.message.create.mockResolvedValue({ id: 'm-sim' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/agent/simulator')
        .send({
          message: 'Halo apakah ada diskon?',
          simulateAs: 'customer',
          tenantId: 'tenant-sim',
          chatId: '628111222333',
        });

      // Endpoint mengembalikan 200/201 dan memanggil CS Service
      expect(res.status).toBeLessThan(400);
      expect(mockCsService.handleMessage).toHaveBeenCalled();
    });
  });

  describe('2. Real-Time Chat Stream (SSE Broadcast Service)', () => {
    it('ChatStreamService berhasil memancarkan dan menerima event pesan real-time', (done) => {
      const testEvent = {
        type: 'message' as const,
        data: {
          conversationId: 'conv-sse-1',
          instanceName: 'session-wa',
          message: { text: 'Pesan real-time masuk' },
        },
      };

      const subscription = chatStreamService
        .subscribe('conv-sse-1')
        .subscribe((event: any) => {
          expect(event.data.data.message.text).toBe('Pesan real-time masuk');
          subscription.unsubscribe();
          done();
        });

      chatStreamService.emit(testEvent);
    });
  });
});
