import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  const mockPrisma = {
    tenant: {
      findUnique: jest.fn(),
    },
    resourceGroup: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    resourceItem: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  it('harus terdefinisi', () => {
    expect(service).toBeDefined();
  });

  describe('getGroups', () => {
    it('harus mengembalikan daftar grup yang difilter berdasarkan tenantId', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
      mockPrisma.resourceGroup.findMany.mockResolvedValue([
        { id: 'g1', name: 'Cluster Mawar', items: [] },
      ]);

      const groups = await service.getGroups('tenant-1');
      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe('Cluster Mawar');
      expect(mockPrisma.resourceGroup.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        include: { items: { orderBy: { code: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createGroup', () => {
    it('harus membuat resourceGroup baru terhubung ke tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
      mockPrisma.resourceGroup.create.mockResolvedValue({
        id: 'g2',
        tenantId: 'tenant-1',
        name: 'Bus VIP',
        category: 'bus',
        items: [],
      });

      const result = await service.createGroup('tenant-1', {
        name: 'Bus VIP',
        category: 'bus',
      });

      expect(result.id).toBe('g2');
      expect(result.category).toBe('bus');
    });
  });

  describe('updateGroup', () => {
    it('harus melempar NotFoundException jika grup tidak ditemukan atau bukan milik tenant', async () => {
      mockPrisma.resourceGroup.findFirst.mockResolvedValue(null);

      await expect(
        service.updateGroup('g-unknown', { name: 'Baru' }, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus berhasil memperbarui grup jika valid', async () => {
      mockPrisma.resourceGroup.findFirst.mockResolvedValue({ id: 'g1', tenantId: 'tenant-1' });
      mockPrisma.resourceGroup.update.mockResolvedValue({
        id: 'g1',
        name: 'Cluster Mawar Updated',
        items: [],
      });

      const updated = await service.updateGroup(
        'g1',
        { name: 'Cluster Mawar Updated' },
        'tenant-1',
      );
      expect(updated.name).toBe('Cluster Mawar Updated');
    });
  });

  describe('addItem', () => {
    it('harus menambahkan kursi atau unit kavling baru ke dalam grup', async () => {
      mockPrisma.resourceGroup.findFirst.mockResolvedValue({ id: 'g1', tenantId: 'tenant-1' });
      mockPrisma.resourceItem.create.mockResolvedValue({
        id: 'item-1',
        groupId: 'g1',
        code: 'A1',
        status: 'AVAILABLE',
      });

      const item = await service.addItem(
        'g1',
        { code: 'A1', status: 'AVAILABLE' },
        'tenant-1',
      );

      expect(item.code).toBe('A1');
      expect(mockPrisma.resourceItem.create).toHaveBeenCalled();
    });
  });

  describe('addBatchItems', () => {
    it('harus membuat beberapa nomor kursi/unit secara berurutan', async () => {
      mockPrisma.resourceGroup.findFirst.mockResolvedValue({ id: 'g1', tenantId: 'tenant-1' });
      mockPrisma.resourceItem.createMany.mockResolvedValue({ count: 3 });

      const result = await service.addBatchItems(
        'g1',
        'Seat-',
        1,
        3,
        'standard',
        150000,
        'tenant-1',
      );

      expect(result.count).toBe(3);
    });
  });
});
