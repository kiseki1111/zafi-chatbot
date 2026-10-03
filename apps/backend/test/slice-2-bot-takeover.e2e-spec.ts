import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ChatsModule } from '../src/modules/chats/chats.module';
import { OmnichannelQueueService } from '../src/core/omnichannel/omnichannel-queue.service';
import { CsService } from '../src/features/agent-cs/cs.service';
import { WahaService } from '../src/modules/waha/waha.service';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

describe('Potongan 2: Bot WhatsApp & Human Takeover (Boundary & Lifecycle Test)', () => {
  let context: TestAppContext;
  let app: INestApplication;
  let queueService: OmnichannelQueueService;

  const mockUser = {
    sub: 'operator-uuid-1',
    email: 'cs@toko.com',
    roles: ['operator'],
    tenantId: 'tenant-1',
  };

  const mockWaha = {
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
    sendTextMessage: jest.fn().mockResolvedValue({ success: true }),
  };

  const mockCsService = {
    handleMessage: jest.fn(),
  };

  beforeAll(async () => {
    context = await createTestApp(
      {
        imports: [ChatsModule],
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
          .overrideProvider(CsService)
          .useValue(mockCsService),
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
  });

  describe('1. Siklus Admin Takeover & Release', () => {
    it('Operator mengambil alih percakapan (Takeover) -> mode di DB berubah jadi human (201/200)', async () => {
      context.mockPrisma.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        mode: 'bot',
        contact: { phone: '628123456789' },
      });
      context.mockPrisma.conversation.update.mockResolvedValue({
        id: 'conv-1',
        mode: 'human',
        assignedToId: 'operator-uuid-1',
      });
      context.mockPrisma.note.create.mockResolvedValue({ id: 'note-1' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/chats/conv-1/takeover')
        .expect(201);

      expect(res.body.mode).toBe('human');
      expect(context.mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-1' },
          data: expect.objectContaining({ mode: 'human' }),
        }),
      );
    });

    it('Batas Input Manual Operator: Menolak kirim pesan kosong atau spasi (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/chats/conv-1/send')
        .send({ text: '   ' })
        .expect(400);
    });

    it('Operator mengembalikan percakapan ke Bot (Release) -> mode di DB kembali bot (201/200)', async () => {
      context.mockPrisma.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        mode: 'human',
      });
      context.mockPrisma.conversation.update.mockResolvedValue({
        id: 'conv-1',
        mode: 'bot',
        assignedToId: null,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/chats/conv-1/release')
        .expect(201);

      expect(res.body.mode).toBe('bot');
      expect(context.mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-1' },
          data: expect.objectContaining({ mode: 'bot' }),
        }),
      );
    });
  });

  describe('2. Batas Omnichannel Queue saat Human Takeover', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('Saat mode human aktif, pesan pelanggan diserap tapi AI 100% BYPASS (0 balasan bot)', async () => {
      // Mock percakapan sedang dalam mode human
      context.mockPrisma.conversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        mode: 'human',
      });

      const replyCallback = jest.fn();

      await queueService.enqueue({
        provider: 'waha',
        senderId: '628123456789@c.us',
        sessionName: 'session-wa',
        text: 'Halo kak, apakah owner sudah ada?',
        replyCallback,
      });

      // Memicu seluruh timer & menuntaskan eksekusi async queue
      await jest.runAllTimersAsync();

      // Memastikan CsService tidak dipanggil dan replyCallback tidak mengirim pesan AI
      expect(mockCsService.handleMessage).not.toHaveBeenCalled();
      expect(replyCallback).not.toHaveBeenCalled();
    });

    it('Saat mode bot aktif kembali, pesan pelanggan diproses oleh AI dan dijawab', async () => {
      // Mock percakapan dalam mode bot
      context.mockPrisma.conversation.findFirst.mockResolvedValue({
        id: 'conv-2',
        mode: 'bot',
      });

      mockCsService.handleMessage.mockResolvedValue({
        text: 'Halo! Ada yang bisa dibantu?',
        images: [],
      });

      const replyCallback = jest.fn();

      await queueService.enqueue({
        provider: 'waha',
        senderId: '628999999999@c.us',
        sessionName: 'session-wa-2',
        text: 'Halo bot',
        replyCallback,
      });

      // Memicu seluruh timer & menuntaskan eksekusi async queue
      await jest.runAllTimersAsync();

      expect(mockCsService.handleMessage).toHaveBeenCalled();
      expect(replyCallback).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Halo! Ada yang bisa dibantu?' }),
      );
    });
  });
});
