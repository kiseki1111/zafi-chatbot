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
  };

  const mockPrismaService = {
    whatsappInstance: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn().mockResolvedValue({}),
    },
    contact: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
  });
});
