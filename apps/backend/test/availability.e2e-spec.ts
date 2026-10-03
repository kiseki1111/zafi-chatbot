import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AvailabilityModule } from '../src/modules/availability/availability.module';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

describe('Availability & Resource Flow (e2e)', () => {
  let context: TestAppContext;
  let app: INestApplication;

  const mockUser = {
    sub: 'user-manager-1',
    email: 'manager@tenant.com',
    roles: ['manager'],
    tenantId: 'tenant-123',
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
            req.user = mockUser;
            return true;
          },
        }),
    );
    app = context.app;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/availability/groups', () => {
    it('harus dapat mengambil daftar denah/grup ketersediaan secara publik (200)', async () => {
      const dummyGroups = [
        {
          id: 'group-1',
          name: 'Cluster Anggrek',
          category: 'properti',
          tenantId: 'tenant-123',
          items: [],
        },
      ];
      context.mockPrisma.resourceGroup.findMany.mockResolvedValue(dummyGroups);

      const response = await request(app.getHttpServer())
        .get('/api/v1/availability/groups?tenantId=tenant-123')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].name).toBe('Cluster Anggrek');
    });
  });

  describe('POST /api/v1/availability/groups', () => {
    it('harus berhasil membuat grup ketersediaan baru (201)', async () => {
      const newGroup = {
        id: 'group-new-1',
        name: 'Bus Eksekutif 01',
        category: 'bus',
        tenantId: 'tenant-123',
      };
      context.mockPrisma.resourceGroup.create.mockResolvedValue(newGroup);

      const response = await request(app.getHttpServer())
        .post('/api/v1/availability/groups')
        .send({
          name: 'Bus Eksekutif 01',
          category: 'bus',
          description: 'Armada Bus Jakarta-Bandung',
        })
        .expect(201);

      expect(response.body.id).toBe('group-new-1');
      expect(response.body.name).toBe('Bus Eksekutif 01');
    });
  });

  describe('POST /api/v1/availability/groups/:groupId/items', () => {
    it('harus berhasil menambahkan item/kursi/kavling ke dalam grup (201)', async () => {
      context.mockPrisma.resourceGroup.findFirst.mockResolvedValue({
        id: 'group-new-1',
        tenantId: 'tenant-123',
      });
      const newItem = {
        id: 'item-1',
        groupId: 'group-new-1',
        code: '1A',
        name: 'Kursi 1A Depan',
        status: 'AVAILABLE',
        capacity: 1,
      };
      context.mockPrisma.resourceItem.create.mockResolvedValue(newItem);

      const response = await request(app.getHttpServer())
        .post('/api/v1/availability/groups/group-new-1/items')
        .send({
          code: '1A',
          name: 'Kursi 1A Depan',
          status: 'AVAILABLE',
          capacity: 1,
        })
        .expect(201);

      expect(response.body.code).toBe('1A');
      expect(response.body.status).toBe('AVAILABLE');
    });
  });

  describe('DELETE /api/v1/availability/groups/:id', () => {
    it('harus berhasil menghapus grup ketersediaan (200)', async () => {
      context.mockPrisma.resourceGroup.findFirst.mockResolvedValue({
        id: 'group-1',
        tenantId: 'tenant-123',
      });
      context.mockPrisma.resourceGroup.delete.mockResolvedValue({ id: 'group-1' });

      const response = await request(app.getHttpServer())
        .delete('/api/v1/availability/groups/group-1')
        .expect(200);

      expect(response.body).toEqual({ id: 'group-1' });
    });
  });
});
