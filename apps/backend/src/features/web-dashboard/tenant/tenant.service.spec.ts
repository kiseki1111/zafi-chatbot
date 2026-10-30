import { Test, TestingModule } from '@nestjs/testing';
import { TenantService } from './tenant.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DataAgentService } from '../../knowledge-ingest/data-agent.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

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
      count: jest.fn(),
      create: jest.fn(),
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

    it('harus menangani tenant dengan paket null dengan aman', async () => {
      const mockTenant = {
        id: 'tenant-null',
        name: 'Tanpa Paket',
        metadata: { plan: null },
        whatsappInstances: [],
      };
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const quota = await service.getTenantQuota('tenant-null');
      expect(quota.plan).toBeNull();
      expect(quota.planName).toBe('Belum Ada Paket');
      expect(quota.maxMau).toBe(0);
      expect(quota.maxAiResponses).toBe(0);
      expect(quota.isMauExceeded).toBe(false);
    });

    it('harus mengembalikan kalkulasi kuota paket Lite UMKM', async () => {
      const mockTenant = {
        id: 'tenant-lite',
        name: 'UMKM Toko',
        metadata: { plan: 'lite' },
        whatsappInstances: [],
      };
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const quota = await service.getTenantQuota('tenant-lite');
      expect(quota.plan).toBe('lite');
      expect(quota.planName).toBe('Lite - UMKM');
      expect(quota.maxMau).toBe(300);
      expect(quota.maxAiResponses).toBe(1000);
      expect(quota.planPrice).toBe(249000);
    });

    it('harus mengembalikan status tidak terbatas untuk Developer Mode', async () => {
      const mockTenant = {
        id: 'tenant-dev',
        name: 'Internal Owner',
        metadata: { plan: 'developer' },
        whatsappInstances: [],
      };
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const quota = await service.getTenantQuota('tenant-dev');
      expect(quota.plan).toBe('developer');
      expect(quota.isMauExceeded).toBe(false);
      expect(quota.isAiResponsesExceeded).toBe(false);
      expect(quota.mauPercent).toBe(0);
      expect(quota.maxMau).toBe(999999999);
    });

    it('harus menerapkan soft limit 110% MAU (grace period)', async () => {
      // Paket Lite: maxMau 300, softLimitMau 330
      const mockTenant = {
        id: 't-lite',
        metadata: { plan: 'lite' },
        whatsappInstances: [{ instanceName: 'inst-1' }],
      };
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.message.count.mockResolvedValue(10);

      // Kasus 1: MAU = 315 (> 300 tapi <= 330) -> Grace Period aktif, isMauExceeded false
      mockPrisma.conversation.findMany.mockResolvedValue(
        Array.from({ length: 315 }, (_, i) => ({ contactId: `c-${i}` })),
      );
      const resGrace = await service.getTenantQuota('t-lite');
      expect(resGrace.isGracePeriod).toBe(true);
      expect(resGrace.isMauExceeded).toBe(false);
      expect(resGrace.softLimitMau).toBe(330);

      // Kasus 2: MAU = 335 (> 330) -> Melampaui batas tenggang 110%, isMauExceeded true
      mockPrisma.conversation.findMany.mockResolvedValue(
        Array.from({ length: 335 }, (_, i) => ({ contactId: `c-${i}` })),
      );
      const resExceeded = await service.getTenantQuota('t-lite');
      expect(resExceeded.isGracePeriod).toBe(false);
      expect(resExceeded.isMauExceeded).toBe(true);
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

  describe('createTenantStaff - validasi kuota kapasitas', () => {
    it('harus menolak pembuatan staf jika paket Lite sudah mencapai batas maksimal 1 user', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-lite',
        name: 'UMKM Toko',
        metadata: { plan: 'lite' },
      });
      mockPrisma.user.count.mockResolvedValue(1); // sudah ada 1 user

      await expect(
        service.createTenantStaff('t-lite', {
          name: 'Staf 2',
          email: 'staf2@toko.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus mengizinkan pembuatan staf jika kuota belum penuh', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-bronze',
        name: 'Bronze Toko',
        metadata: { plan: 'bronze' }, // max 3 user
      });
      mockPrisma.user.count.mockResolvedValue(1); // baru ada 1 user
      mockPrisma.user.create.mockResolvedValue({
        id: 'u-2',
        name: 'Staf Baru',
        email: 'staf2@bronze.com',
        role: 'administrator',
        tenantId: 't-bronze',
        createdAt: new Date(),
      });

      const res = await service.createTenantStaff('t-bronze', {
        name: 'Staf Baru',
        email: 'staf2@bronze.com',
      });
      expect(res.id).toBe('u-2');
    });

    it('harus mengizinkan pembuatan staf untuk Lite jika memiliki add-on user ekstra', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-lite-extra',
        name: 'Lite Toko Extra',
        metadata: { plan: 'lite', extraUsers: 1 }, // 1 user dasar + 1 ekstra = 2 user
      });
      mockPrisma.user.count.mockResolvedValue(1); // sudah 1 user, masih boleh 1 lagi
      mockPrisma.user.create.mockResolvedValue({
        id: 'u-lite-2',
        name: 'Staf Tambahan',
        email: 'staf2@toko.com',
        role: 'administrator',
        tenantId: 't-lite-extra',
        createdAt: new Date(),
      });

      const res = await service.createTenantStaff('t-lite-extra', {
        name: 'Staf Tambahan',
        email: 'staf2@toko.com',
      });
      expect(res.id).toBe('u-lite-2');
    });
  });

  describe('Top-Up & Add-On Management (Phase 4)', () => {
    it('harus mengembalikan katalog paket top-up dan add-on', () => {
      const catalog = service.getTopUpCatalog();
      expect(catalog.length).toBeGreaterThanOrEqual(10);
      expect(catalog.some((c) => c.key === 'BOOSTER_S')).toBe(true);
      expect(catalog.some((c) => c.key === 'MAU_S')).toBe(true);
      expect(catalog.some((c) => c.key === 'AI_S')).toBe(true);
      expect(catalog.some((c) => c.key === 'ADDON_WA')).toBe(true);
    });

    it('harus berhasil menambahkan paket Booster S (+500 MAU, +2000 AI) ke metadata tenant', async () => {
      const initialTenant = {
        id: 't-client-1',
        metadata: { plan: 'bronze', extraMau: 0, extraAiResponses: 0 },
        whatsappInstances: [],
      };
      mockPrisma.tenant.findUnique.mockResolvedValue(initialTenant);
      mockPrisma.tenant.update.mockImplementation(async ({ data }) => ({
        ...initialTenant,
        metadata: data.metadata,
      }));

      const updatedQuota = await service.applyTenantTopUp('t-client-1', {
        itemKey: 'BOOSTER_S',
        notes: 'Bukti transfer BCA valid',
      });

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't-client-1' },
          data: {
            metadata: expect.objectContaining({
              extraMau: 500,
              extraAiResponses: 2000,
            }),
          },
        }),
      );
      expect(updatedQuota.extraMau).toBe(500);
      expect(updatedQuota.extraAiResponses).toBe(2000);
      expect(updatedQuota.topups).toHaveLength(1);
      expect(updatedQuota.topups[0].itemKey).toBe('BOOSTER_S');
    });

    it('harus melempar BadRequestException jika itemKey top-up tidak dikenal', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-client-1',
        metadata: {},
      });

      await expect(
        service.applyTenantTopUp('t-client-1', { itemKey: 'PAKET_GHAIB' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Auto Top-Up & Quota Notifications (Phase 5)', () => {
    it('harus menolak toggle Auto Top-Up jika tenant berada di paket Lite / Bronze (400)', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-bronze',
        metadata: { plan: 'bronze' },
      });

      await expect(
        service.updateAutoTopUpSettings('t-bronze', { autoTopUpEnabled: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus mengizinkan toggle Auto Top-Up jika tenant berada di paket Silver', async () => {
      const initialTenant = {
        id: 't-silver',
        metadata: { plan: 'silver', autoTopUpEnabled: false },
        whatsappInstances: [],
      };
      mockPrisma.tenant.findUnique.mockResolvedValue(initialTenant);
      mockPrisma.tenant.update.mockImplementation(async ({ data }) => ({
        ...initialTenant,
        metadata: data.metadata,
      }));

      const res = await service.updateAutoTopUpSettings('t-silver', {
        autoTopUpEnabled: true,
        autoTopUpMonthlyLimit: 5,
      });

      expect(res.autoTopUpEnabled).toBe(true);
      expect(res.autoTopUpMonthlyLimit).toBe(5);
    });

    it('harus mencatat notifikasi peringatan kuota 80% saat penggunaan menyentuh 80%', async () => {
      const tenant80 = {
        id: 't-silver-80',
        name: 'Silver 80%',
        metadata: { plan: 'silver', maxAiResponses: 10000, quotaAlerts: [] },
        whatsappInstances: [{ instanceName: 'inst-1', status: 'WORKING' }],
      };
      mockPrisma.tenant.findUnique.mockResolvedValue(tenant80);
      mockPrisma.conversation.findMany.mockResolvedValue([]);
      mockPrisma.message.count.mockResolvedValue(8500); // 85% dari 10.000
      mockPrisma.tenant.update.mockImplementation(async ({ data }) => ({
        ...tenant80,
        metadata: data.metadata,
      }));

      const res = await service.checkAndNotifyQuota('t-silver-80');
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't-silver-80' },
          data: {
            metadata: expect.objectContaining({
              quotaAlerts: expect.arrayContaining([
                expect.objectContaining({ type: '80%' }),
              ]),
            }),
          },
        }),
      );
    });
  });
});
