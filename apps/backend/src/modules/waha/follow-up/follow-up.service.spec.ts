jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => {},
  CronExpression: {
    EVERY_DAY_AT_9AM: '0 9 * * *',
    EVERY_MINUTE: '* * * * *',
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FollowUpService } from './follow-up.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { WahaService } from '../waha.service';
import { AgentSharedService } from '../../../core/agent-shared/agent-shared.service';

describe('FollowUpService', () => {
  let service: FollowUpService;

  const mockPrisma = {
    followUpConfig: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    followUp: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    whatsappInstance: {
      findMany: jest.fn(),
    },
    contact: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    conversation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
    },
    tenant: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockWaha = {
    sendMessage: jest.fn().mockResolvedValue({ id: 'waha-msg-123' }),
    sendTextMessage: jest.fn(),
  };

  const mockAgentShared = {
    getRecentContext: jest.fn().mockResolvedValue([]),
    callLLM: jest
      .fn()
      .mockResolvedValue('Halo Kak, ada yang bisa dibantu kembali?'),
    generateFollowUpText: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.tenant.findUnique.mockResolvedValue(null);
    mockPrisma.tenant.findFirst.mockResolvedValue(null);
    mockPrisma.followUpConfig.findUnique.mockResolvedValue(null);
    mockPrisma.followUpConfig.findFirst.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowUpService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WahaService, useValue: mockWaha },
        { provide: AgentSharedService, useValue: mockAgentShared },
      ],
    }).compile();

    service = module.get<FollowUpService>(FollowUpService);
  });

  it('harus terdefinisi', () => {
    expect(service).toBeDefined();
  });

  describe('getConfig', () => {
    it('harus mengembalikan konfigurasi default jika belum ada di database', async () => {
      mockPrisma.followUpConfig.findUnique.mockResolvedValue(null);
      mockPrisma.followUpConfig.findFirst.mockResolvedValue(null);

      const config = await service.getConfig('tenant-1');
      expect(config.isEnabled).toBe(false);
      expect(config.scheduleTime).toBe('09:00');
      expect(config.inactivityHours).toBe(24);
    });

    it('harus mengembalikan konfigurasi yang tersimpan jika ada', async () => {
      const saved = {
        id: 'cfg-1',
        tenantId: 'tenant-1',
        isEnabled: true,
        scheduleTime: '11:00',
        inactivityHours: 48,
      };
      mockPrisma.followUpConfig.findUnique.mockResolvedValue(saved);

      const config = await service.getConfig('tenant-1');
      expect(config.isEnabled).toBe(true);
      expect(config.scheduleTime).toBe('11:00');
    });
  });

  describe('updateConfig', () => {
    it('harus melakukan upsert konfigurasi follow up tenant', async () => {
      const updateData = { isEnabled: true, scheduleTime: '08:30' };
      mockPrisma.followUpConfig.upsert.mockResolvedValue({
        id: 'cfg-1',
        tenantId: 'tenant-1',
        ...updateData,
      });

      const result = await service.updateConfig(updateData, 'tenant-1');
      expect(mockPrisma.followUpConfig.upsert).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        update: updateData,
        create: { ...updateData, tenantId: 'tenant-1' },
      });
      expect(result.scheduleTime).toBe('08:30');
    });

    it('harus menolak kustom scheduleTime jika tenant berada di paket Lite (400)', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-lite',
        metadata: { plan: 'lite' },
      });

      let error: any = null;
      try {
        await service.updateConfig({ scheduleTime: '14:00' }, 't-lite');
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(BadRequestException);
    });

    it('harus mengizinkan kustom scheduleTime jika tenant berada di paket Silver', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-silver',
        metadata: { plan: 'silver' },
      });
      mockPrisma.followUpConfig.upsert.mockResolvedValue({
        id: 'cfg-silver',
        tenantId: 't-silver',
        scheduleTime: '14:00',
      });

      const res = await service.updateConfig(
        { scheduleTime: '14:00' },
        't-silver',
      );
      expect(res.scheduleTime).toBe('14:00');
    });
  });

  describe('manualTrigger - Feature Gating', () => {
    it('harus menolak manual trigger jika tenant berada di paket Lite (400)', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-lite',
        metadata: { plan: 'lite' },
      });

      let error: any = null;
      try {
        await service.manualTrigger(undefined, 't-lite');
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(BadRequestException);
    });

    it('harus mengizinkan manual trigger jika tenant berada di paket Developer / Silver', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-dev',
        metadata: { plan: 'developer' },
      });
      mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: false,
      });

      const res = await service.manualTrigger(undefined, 't-dev');
      expect(res).toBeDefined();
    });
  });

  describe('getInactiveContacts', () => {
    it('harus mengembalikan array kosong jika follow up tidak aktif (isEnabled=false)', async () => {
      mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: false,
      });

      const result = await service.getInactiveContacts(undefined, 'tenant-1');
      expect(result).toEqual([]);
    });

    it('harus memfilter kontak inaktif dan memblokir nomor yang belum merespons follow-up sebelumnya', async () => {
      mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: true,
        inactivityHours: 24,
      });

      const pastDate = new Date(Date.now() - 30 * 3600 * 1000);
      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          instanceName: 'session-wa',
          contactId: 'contact-1',
          contact: { id: 'contact-1', phone: '62811111111', name: 'Budi' },
          lastMessageAt: pastDate,
          messages: [{ content: 'Halo kak', createdAt: pastDate }],
        },
      ]);

      // Kontak sudah difollow-up dan belum ada chat balasan setelahnya
      mockPrisma.followUp.findMany.mockResolvedValue([
        {
          contactId: 'contact-1',
          instanceName: 'session-wa',
          followedUpAt: new Date(Date.now() - 10 * 3600 * 1000),
        },
      ]);

      const result = await service.getInactiveContacts(undefined, 'tenant-1');
      expect(result.length).toBe(0);
    });

    it('harus mengizinkan re-follow-up jika pelanggan merespons chat setelah follow-up sebelumnya', async () => {
      mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: true,
        inactivityHours: 24,
      });

      const customerReplyDate = new Date(Date.now() - 26 * 3600 * 1000);
      const followUpOldDate = new Date(Date.now() - 50 * 3600 * 1000);

      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          instanceName: 'session-wa',
          contactId: 'contact-rechat',
          contact: { id: 'contact-rechat', phone: '62899999999', name: 'Andi' },
          lastMessageAt: customerReplyDate, // Chat baru customer lebih baru daripada follow-up lama
          messages: [
            { content: 'Mau tanya lagi min', createdAt: customerReplyDate },
          ],
        },
      ]);

      mockPrisma.followUp.findMany.mockResolvedValue([
        {
          contactId: 'contact-rechat',
          instanceName: 'session-wa',
          followedUpAt: followUpOldDate,
        },
      ]);

      const result = await service.getInactiveContacts(undefined, 'tenant-1');
      expect(result.length).toBe(1);
      expect(result[0].contactPhone).toBe('62899999999');
    });
  });

  describe('sendFollowUp', () => {
    it('harus mengirim pesan ke WAHA, mencatat ke tabel messages, conversation, dan riwayat follow-up', async () => {
      const mockContact = { id: 'c-100', phone: '628123456789', name: 'Rina' };
      const mockConv = {
        id: 'conv-100',
        instanceName: 'zafi-property',
        contactId: 'c-100',
      };

      mockPrisma.contact.findUnique.mockResolvedValue(mockContact);
      mockPrisma.contact.findFirst.mockResolvedValue(mockContact);
      mockPrisma.conversation.findFirst.mockResolvedValue(mockConv);
      mockPrisma.conversation.update.mockResolvedValue(mockConv);
      mockPrisma.message.create.mockResolvedValue({ id: 'msg-rec-1' });
      mockPrisma.followUp.create.mockResolvedValue({ id: 'flw-1' });

      const res = await service.sendFollowUp(
        '628123456789',
        'zafi-property',
        'Halo Rina, ada promo baru nih!',
        'c-100',
      );

      expect(res.success).toBe(true);
      expect(mockWaha.sendMessage).toHaveBeenCalledWith(
        'zafi-property',
        '628123456789',
        'Halo Rina, ada promo baru nih!',
      );
      expect(mockPrisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conversationId: 'conv-100',
            senderType: 'bot',
            content: 'Halo Rina, ada promo baru nih!',
            metadata: expect.objectContaining({ isFollowUp: true }),
          }),
        }),
      );
      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'conv-100' } }),
      );
    });
  });

  describe('processFollowUps & anti-spam delay 2 menit', () => {
    it('harus memproses semua kontak inaktif dan memanggil sleep 120000 (2 menit) antar kontak', async () => {
      mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: true,
        inactivityHours: 24,
      });

      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          instanceName: 'session-wa',
          contactId: 'c-1',
          contact: { id: 'c-1', phone: '628111', name: 'User 1' },
          lastMessageAt: new Date(Date.now() - 30 * 3600 * 1000),
          messages: [],
        },
        {
          instanceName: 'session-wa',
          contactId: 'c-2',
          contact: { id: 'c-2', phone: '628222', name: 'User 2' },
          lastMessageAt: new Date(Date.now() - 30 * 3600 * 1000),
          messages: [],
        },
      ]);
      mockPrisma.followUp.findMany.mockResolvedValue([]);
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'c-1',
        phone: '628111',
      });
      mockPrisma.conversation.findFirst.mockResolvedValue({ id: 'conv-1' });

      // Spy sleep method
      const sleepSpy = jest
        .spyOn(service as any, 'sleep')
        .mockResolvedValue(undefined);

      const result = await service.processFollowUps('session-wa', 'tenant-1');

      expect(result.sent).toBe(2);
      expect(sleepSpy).toHaveBeenCalledWith(120000); // delay 2 menit antar kontak
    });
  });

  describe('scheduledFollowUp', () => {
    it('harus mengecek kecocokan waktu WIB Asia/Jakarta dengan scheduleTime tenant', async () => {
      const nowWib = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
        .format(new Date())
        .replace('.', ':');

      mockPrisma.followUpConfig.findMany.mockResolvedValue([
        {
          id: 'cfg-wib',
          tenantId: 'tenant-wib',
          isEnabled: true,
          scheduleTime: nowWib,
        },
      ]);

      const processSpy = jest
        .spyOn(service, 'processFollowUps')
        .mockResolvedValue({ processed: 0, sent: 0, errors: 0 });

      await service.scheduledFollowUp();

      expect(mockPrisma.followUpConfig.findMany).toHaveBeenCalledWith({
        where: { isEnabled: true, scheduleTime: nowWib },
      });
      expect(processSpy).toHaveBeenCalledWith(undefined, 'tenant-wib');
    });
  });

  describe('getStats', () => {
    it('harus mengembalikan metrik total follow up dan status aktif', async () => {
      mockPrisma.whatsappInstance.findMany.mockResolvedValue([
        { instanceName: 'inst-1' },
      ]);
      mockPrisma.followUp.count.mockResolvedValue(15);
      mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: true,
      });
      mockPrisma.conversation.findMany.mockResolvedValue([]);

      const stats = await service.getStats('tenant-1');
      expect(stats.totalFollowedUp).toBe(15);
      expect(stats.isEnabled).toBe(true);
    });
  });
});
