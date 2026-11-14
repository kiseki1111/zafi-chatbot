import { Test, TestingModule } from '@nestjs/testing';
import { ChatsService } from './chats.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WahaService } from '../waha/waha.service';

describe('ChatsService', () => {
  let service: ChatsService;

  const mockPrismaService = {
    conversation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    contact: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockWahaService = {
    sendMessage: jest.fn(),
    getSessionStatus: jest.fn(),
  };

  const mockChatStreamService = {
    emit: jest.fn(),
    subscribe: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WahaService, useValue: mockWahaService },
        {
          provide: require('./chat-stream.service').ChatStreamService,
          useValue: mockChatStreamService,
        },
      ],
    }).compile();

    service = module.get<ChatsService>(ChatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('markAsRead', () => {
    it('menolkan unreadCount percakapan saat dibuka admin', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        unreadCount: 3,
        whatsappInstance: { tenantId: 'tenant-a' },
      });
      mockPrismaService.conversation.update.mockResolvedValue({
        id: 'conv-1',
        unreadCount: 0,
      });

      const result = await service.markAsRead('conv-1', 'tenant-a');

      expect(mockPrismaService.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: { unreadCount: 0 },
      });
      expect(result.unreadCount).toBe(0);
    });

    it('tidak menulis ke DB jika unreadCount sudah 0 (hindari write sia-sia)', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        unreadCount: 0,
        whatsappInstance: { tenantId: 'tenant-a' },
      });

      await service.markAsRead('conv-1', 'tenant-a');

      expect(mockPrismaService.conversation.update).not.toHaveBeenCalled();
    });

    it('menolak akses lintas tenant (SECURITY)', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        unreadCount: 3,
        whatsappInstance: { tenantId: 'tenant-b' },
      });

      await expect(
        service.markAsRead('conv-1', 'tenant-a'),
      ).rejects.toThrow('Akses ditolak');
      expect(mockPrismaService.conversation.update).not.toHaveBeenCalled();
    });

    it('melempar NotFoundException jika percakapan tidak ada', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.markAsRead('conv-missing', 'tenant-a'),
      ).rejects.toThrow('Conversation not found');
    });
  });

  describe('sendMessage — SSE tenantId propagation (SECURITY)', () => {
    it('emit SSE harus menyertakan tenantId dari whatsappInstance percakapan, bukan undefined', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        instanceName: 'wa-tenant-a',
        contact: { phone: '628111' },
        whatsappInstance: { tenantId: 'tenant-a' },
      });
      mockPrismaService.message.create.mockResolvedValue({
        id: 'msg-1',
        content: 'halo dari operator',
      });
      mockPrismaService.conversation.update.mockResolvedValue({});
      mockWahaService.sendMessage.mockResolvedValue({});

      await service.sendMessage('conv-1', undefined, 'halo dari operator', 'tenant-a');

      expect(mockChatStreamService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: 'tenant-a' }),
        }),
      );
    });
  });
});
