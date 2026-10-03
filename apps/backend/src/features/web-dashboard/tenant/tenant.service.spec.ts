import { Test, TestingModule } from '@nestjs/testing';
import { TenantService } from './tenant.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DataAgentService } from '../../knowledge-ingest/data-agent.service';
import { NotFoundException } from '@nestjs/common';

describe('TenantService', () => {
  let service: TenantService;

  const mockPrisma = {
    tenant: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    whatsappInstance: {
      findMany: jest.fn(),
    },
    conversation: {
      findMany: jest.fn(),
    },
    message: {
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockDataAgent = {
    syncKnowledgeBase: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DataAgentService, useValue: mockDataAgent },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
  });

  it('harus terdefinisi', () => {
    expect(service).toBeDefined();
  });

  describe('getTenantQuota', () => {
    it('harus mengembalikan kalkulasi kuota paket trial default', async () => {
      const mockTenant = {
        id: 'tenant-1',
        name: 'Toko Kopi',
        metadata: { plan: 'trial' },
        whatsappInstances: [{ instanceName: 'inst-1' }],
      };
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.conversation.findMany.mockResolvedValue([
        { contactId: 'contact-1' },
        { contactId: 'contact-2' },
      ]);
      mockPrisma.message.count.mockResolvedValue(25);

      const quota = await service.getTenantQuota('tenant-1');
      expect(quota.plan).toBe('trial');
      expect(quota.maxMau).toBe(10);
      expect(quota.mauUsed).toBe(2);
      expect(quota.aiResponsesUsed).toBe(25);
      expect(quota.isMauExceeded).toBe(false);
    });

    it('harus melempar NotFoundException jika data tenant tidak ditemukan sama sekali', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findFirst.mockResolvedValue(null);

      await expect(service.getTenantQuota('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTenantProducts', () => {
    it('harus mengembalikan daftar produk milik tenant pengguna', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        tenantId: 'tenant-1',
      });
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Kopi Arabika', price: 50000, stock: 20 },
      ]);

      const products = await service.getTenantProducts('user-1');
      expect(products).toHaveLength(1);
      expect(products[0].name).toBe('Kopi Arabika');
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
