jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => {},
  CronExpression: {
    EVERY_DAY_AT_9AM: '0 9 * * *',
    EVERY_MINUTE: '* * * * *',
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
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
    },
    whatsappInstance: {
      findMany: jest.fn(),
    },
    conversation: {
      findMany: jest.fn(),
    },
    tenant: {
      findFirst: jest.fn(),
    },
  };

  const mockWaha = {
    sendTextMessage: jest.fn(),
  };

  const mockAgentShared = {
    generateFollowUpText: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
  });

  describe('getInactiveContacts', () => {
    it('harus mengembalikan array kosong jika follow up tidak aktif (isEnabled=false)', async () => {
      mockPrisma.followUpConfig.findUnique.mockResolvedValue({ isEnabled: false });

      const result = await service.getInactiveContacts(undefined, 'tenant-1');
      expect(result).toEqual([]);
    });

    it('harus memfilter kontak yang belum pernah di-follow-up pada sesi bersangkutan', async () => {
      mockPrisma.followUpConfig.findUnique.mockResolvedValue({
        isEnabled: true,
        inactivityHours: 24,
      });

      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          instanceName: 'session-wa',
          contactId: 'contact-1',
          contact: { id: 'contact-1', phone: '62811111111', name: 'Budi' },
          lastMessageAt: new Date(Date.now() - 30 * 3600 * 1000),
          messages: [{ content: 'Halo kak', createdAt: new Date() }],
        },
      ]);

      mockPrisma.followUp.findMany.mockResolvedValue([]);

      const result = await service.getInactiveContacts(undefined, 'tenant-1');
      expect(result.length).toBe(1);
      expect(result[0].contactPhone).toBe('62811111111');
    });
  });

  describe('getStats', () => {
    it('harus mengembalikan metrik total follow up dan status aktif', async () => {
      mockPrisma.whatsappInstance.findMany.mockResolvedValue([
        { instanceName: 'inst-1' },
      ]);
      mockPrisma.followUp.count.mockResolvedValue(15);
      mockPrisma.followUpConfig.findUnique.mockResolvedValue({ isEnabled: true });
      mockPrisma.conversation.findMany.mockResolvedValue([]);

      const stats = await service.getStats('tenant-1');
      expect(stats.totalFollowedUp).toBe(15);
      expect(stats.isEnabled).toBe(true);
    });
  });
});
