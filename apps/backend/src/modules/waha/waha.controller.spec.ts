import { Test, TestingModule } from '@nestjs/testing';
import { WahaController } from './waha.controller';
import { WahaService } from './waha.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OmnichannelQueueService } from '../../core/omnichannel/omnichannel-queue.service';

describe('WahaController - Unit Tests (Feature 6 Call Reject & Webhooks)', () => {
  let controller: WahaController;

  const mockWahaService = {
    getInstances: jest.fn(),
    createInstance: jest.fn(),
    startSession: jest.fn(),
    stopSession: jest.fn(),
    getQrCode: jest.fn(),
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
    sendSeen: jest.fn().mockResolvedValue(undefined),
    sendTypingPresence: jest.fn().mockResolvedValue(undefined),
    rejectCall: jest.fn().mockResolvedValue({ status: 'rejected' }),
    downloadAndStoreMedia: jest.fn().mockResolvedValue('/uploads/incoming/voice.ogg'),
  };

  const mockPrismaService = {
    whatsappInstance: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn().mockResolvedValue({}),
    },
    contact: {
      findFirst: jest.fn().mockResolvedValue({ id: 'contact-01', phone: '628999888777' }),
      create: jest.fn().mockResolvedValue({ id: 'contact-01' }),
      update: jest.fn().mockResolvedValue({ id: 'contact-01' }),
    },
    conversation: {
      findFirst: jest.fn(),
      upsert: jest.fn().mockResolvedValue({ id: 'conv-123' }),
    },
    message: {
      create: jest.fn().mockResolvedValue({ id: 'msg-call' }),
      upsert: jest.fn().mockResolvedValue({ id: 'msg-upsert' }),
      updateMany: jest.fn(),
    },
    webhookLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };

  const mockOmnichannelQueue = {
    addMessage: jest.fn(),
    enqueue: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WahaController],
      providers: [
        { provide: WahaService, useValue: mockWahaService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OmnichannelQueueService, useValue: mockOmnichannelQueue },
      ],
    }).compile();

    controller = module.get<WahaController>(WahaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Feature 6: Event call.received webhook', () => {
    it('harus memanggil rejectCall dan menyimpan notifikasi panggilan masuk ke database', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValueOnce({
        id: 'contact-01',
        phone: '628999888777',
      });

      const payload = {
        session: 'zafi-cs',
        event: 'call.received',
        payload: {
          id: 'call-unique-123',
          from: '628999888777@c.us',
          caller: '628999888777@c.us',
        },
      };

      await controller.handleWebhook(payload);

      // 1. Verifikasi WAHA rejectCall terpanggil
      expect(mockWahaService.rejectCall).toHaveBeenCalledWith(
        'zafi-cs',
        'call-unique-123',
      );

      // 2. Verifikasi pesan sistem dicatat di percakapan
      expect(mockPrismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conversationId: 'conv-123',
            senderType: 'system',
            messageType: 'CALL',
            content: expect.stringContaining('Panggilan WhatsApp masuk (Otomatis ditolak)'),
          }),
        }),
      );

      // 3. Verifikasi bot membalas ramah ke penelpon
      expect(mockWahaService.sendMessage).toHaveBeenCalledWith(
        'zafi-cs',
        '628999888777@c.us',
        expect.stringContaining('tidak dapat menerima panggilan'),
      );
    });

    it('harus mengenali input voice note (ptt) dengan messageType audio', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValueOnce({
        id: 'contact-02',
        phone: '628111222333',
      });

      const payload = {
        session: 'zafi-cs',
        event: 'message',
        payload: {
          id: 'msg-ptt-123',
          from: '628111222333@c.us',
          type: 'ptt',
          hasMedia: true,
          media: {
            url: 'http://waha:3000/api/files/voice.ogg',
            mimetype: 'audio/ogg; codecs=opus',
          },
        },
      };

      await controller.handleWebhook(payload);

      expect(mockPrismaService.message.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            messageType: 'audio',
            content: 'Mengirim pesan suara',
          }),
        }),
      );
    });

    it('harus menolak request dengan ForbiddenException jika webhook secret salah', async () => {
      const payload = { session: 'zafi-cs', event: 'message' };
      const req = { ip: '192.168.1.100', query: {} };

      await expect(
        controller.handleWebhook(payload, 'wrong-secret', req),
      ).rejects.toThrow('Invalid or missing webhook secret');
    });
  });
});
