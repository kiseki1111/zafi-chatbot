import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AvailabilityModule } from '../src/modules/availability/availability.module';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

describe('Potongan 4: Modul Vertikal Siteplan Properti & Denah Kursi Bus (Boundary & Lifecycle Test)', () => {
  let context: TestAppContext;
  let app: INestApplication;

  let currentUser: {
    sub: string;
    email: string;
    roles: string[];
    tenantId?: string | null;
  } = {
    sub: 'user-manager-dev',
    email: 'dev@property.id',
    roles: ['manager'],
    tenantId: 'tenant-proper-1',
  };

  beforeAll(async () => {
    context = await createTestApp(
      {
        imports: [AvailabilityModule],
      },
      (builder) =>
        builder.overrideGuard(JwtAuthGuard).useValue({
          canActivate: (ctx: any) => {
            const req = ctx.switchToHttp().getRequest();
            req.user = currentUser;
            return true;
          },
        }),
    );

    app = context.app;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = {
      sub: 'user-manager-dev',
      email: 'dev@property.id',
      roles: ['manager'],
      tenantId: 'tenant-proper-1',
    };
  });

  describe('1. Pembuatan Grup Vertikal (Properti & Armada Bus)', () => {
    it('Berhasil membuat grup kavling perumahan (category: properti) (201)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-proper-1' });
      context.mockPrisma.resourceGroup.create.mockResolvedValue({
        id: 'group-prop-1',
        name: 'Cluster Mawar Hills',
        category: 'properti',
        tenantId: 'tenant-proper-1',
        items: [],
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/availability/groups')
        .send({
          name: 'Cluster Mawar Hills',
          category: 'properti',
          description: 'Kavling siap bangun tipe 36 dan 45',
        })
        .expect(201);

      expect(res.body.id).toBe('group-prop-1');
      expect(res.body.category).toBe('properti');
    });

    it('Berhasil membuat grup armada bus transportasi (category: bus) (201)', async () => {
      context.mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-proper-1' });
      context.mockPrisma.resourceGroup.create.mockResolvedValue({
        id: 'group-bus-1',
        name: 'Bus Scania SHD-01',
        category: 'bus',
        tenantId: 'tenant-proper-1',
        items: [],
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/availability/groups')
        .send({
          name: 'Bus Scania SHD-01',
          category: 'bus',
          description: 'Layout 2-2 kapasitas 32 kursi',
        })
        .expect(201);

      expect(res.body.id).toBe('group-bus-1');
      expect(res.body.category).toBe('bus');
    });
  });

  describe('2. Batas Tambah Unit Satuan & Pembuatan Batch', () => {
    it('Menolak menambah item jika grup target bukan milik tenant bersangkutan (404)', async () => {
      // Grup tidak ditemukan di bawah tenant-proper-1
      context.mockPrisma.resourceGroup.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/availability/groups/foreign-group/items')
        .send({ code: 'A01', houseType: '36/72', price: 450000000 })
        .expect(404);
    });

    it('Berhasil membuat batch kursi bus secara berurutan (Seat-01 s/d Seat-10) (201)', async () => {
      context.mockPrisma.resourceGroup.findFirst.mockResolvedValue({
        id: 'group-bus-1',
        tenantId: 'tenant-proper-1',
      });
      context.mockPrisma.resourceItem.createMany.mockResolvedValue({ count: 10 });

      const res = await request(app.getHttpServer())
        .post('/api/v1/availability/groups/group-bus-1/batch-items')
        .send({
          prefix: 'Seat-',
          startNumber: 1,
          endNumber: 10,
          price: 180000,
        })
        .expect(201);

      expect(res.body.count).toBe(10);
    });

    it('Batas Ekstrem Batch: Rentang terbalik (start > end) menghasilkan 0 unit tanpa crash (201)', async () => {
      context.mockPrisma.resourceGroup.findFirst.mockResolvedValue({
        id: 'group-bus-1',
        tenantId: 'tenant-proper-1',
      });
      context.mockPrisma.resourceItem.createMany.mockResolvedValue({ count: 0 });

      const res = await request(app.getHttpServer())
        .post('/api/v1/availability/groups/group-bus-1/batch-items')
        .send({
          prefix: 'Seat-',
          startNumber: 20,
          endNumber: 5,
        })
        .expect(201);

      expect(res.body.count).toBe(0);
    });
  });

  describe('3. Batas Siklus Status Ketersediaan & Pemesanan (Lifecycle)', () => {
    it('Mengubah status unit dari AVAILABLE menjadi RESERVED dengan data pemesan (200)', async () => {
      context.mockPrisma.resourceItem.findFirst.mockResolvedValue({
        id: 'item-1',
        code: 'A01',
        status: 'AVAILABLE',
      });
      context.mockPrisma.resourceItem.update.mockResolvedValue({
        id: 'item-1',
        code: 'A01',
        status: 'RESERVED',
        customerName: 'Ahmad Santoso',
        customerPhone: '6281234567890',
        notes: 'Booking fee Rp 5.000.000 via transfer',
      });

      const res = await request(app.getHttpServer())
        .put('/api/v1/availability/items/item-1')
        .send({
          status: 'RESERVED',
          customerName: 'Ahmad Santoso',
          customerPhone: '6281234567890',
          notes: 'Booking fee Rp 5.000.000 via transfer',
        })
        .expect(200);

      expect(res.body.status).toBe('RESERVED');
      expect(res.body.customerName).toBe('Ahmad Santoso');
    });

    it('Menolak update item yang tidak terdaftar di database (404)', async () => {
      context.mockPrisma.resourceItem.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put('/api/v1/availability/items/item-not-exist')
        .send({ status: 'SOLD' })
        .expect(404);
    });

    it('Berhasil menghapus item kavling/kursi yang dibatalkan (200)', async () => {
      context.mockPrisma.resourceItem.findFirst.mockResolvedValue({
        id: 'item-1',
      });
      context.mockPrisma.resourceItem.delete.mockResolvedValue({ id: 'item-1' });

      const res = await request(app.getHttpServer())
        .delete('/api/v1/availability/items/item-1')
        .expect(200);

      expect(res.body.id).toBe('item-1');
    });
  });
});
