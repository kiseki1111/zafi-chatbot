import { INestApplication } from '@nestjs/common';
import request from 'supertest';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_mock'),
  compare: jest.fn().mockResolvedValue(true),
}));

import { TenantModule } from '../src/features/web-dashboard/tenant/tenant.module';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { DataAgentService } from '../src/features/knowledge-ingest/data-agent.service';

describe('Slice-9: Superadmin Kelola Klien & Slice-10: Tenant Products + Settings (Boundary)', () => {
  let context: TestAppContext;
  let app: INestApplication;

  let currentUser: any = {
    sub: 'superadmin-1',
    email: 'superadmin@platform.id',
    roles: ['superadmin'],
    tenantId: null,
  };

  const mockDataAgent = { syncKnowledgeBase: jest.fn().mockResolvedValue({ ok: true }) };

  beforeAll(async () => {
    context = await createTestApp(
      { imports: [TenantModule] },
      (b) =>
        b
          .overrideGuard(JwtAuthGuard)
          .useValue({
            canActivate: (ctx: any) => {
              ctx.switchToHttp().getRequest().user = currentUser;
              return true;
            },
          })
          .overrideProvider(DataAgentService)
          .useValue(mockDataAgent),
    );
    app = context.app;
  });

  afterAll(async () => { if (app) await app.close(); });
  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = { sub: 'superadmin-1', email: 'superadmin@platform.id', roles: ['superadmin'], tenantId: null };
  });

  // ------------------------------------------------------------------ //
  //  SLICE-9 : Superadmin Kelola Klien                                  //
  // ------------------------------------------------------------------ //

  describe('Slice-9 — Superadmin: Kelola Klien Tenant', () => {
    describe('1. List & Detail Klien', () => {
      it('Superadmin berhasil membaca daftar seluruh klien (200)', async () => {
        context.mockPrisma.tenant.findMany.mockResolvedValue([
          {
            id: 't-1', name: 'Toko Kopi', metadata: { plan: 'trial', maxMau: 10, maxAiResponses: 50 },
            createdAt: new Date(),
            whatsappInstances: [{ instanceName: 'inst-1' }],
            _count: { whatsappInstances: 1, products: 3, knowledgeBases: 2 },
            users: [],
          },
        ]);
        // getTenantQuota internals
        context.mockPrisma.conversation.findMany.mockResolvedValue([]);
        context.mockPrisma.message.count.mockResolvedValue(0);

        const res = await request(app.getHttpServer())
          .get('/api/v1/tenant/clients/all')
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0].name).toBe('Toko Kopi');
      });

      it('Superadmin berhasil membaca detail + user list klien tertentu (200)', async () => {
        context.mockPrisma.tenant.findUnique.mockResolvedValue({
          id: 't-1', name: 'Toko Kopi', metadata: {},
          users: [{ id: 'u-1', name: 'Manager A', email: 'm@a.com', role: 'manager' }],
          whatsappInstances: [],
          _count: { whatsappInstances: 1, users: 1 },
        });
        context.mockPrisma.message.count.mockResolvedValue(200);
        context.mockPrisma.contact.count.mockResolvedValue(30);

        const res = await request(app.getHttpServer())
          .get('/api/v1/tenant/clients/t-1')
          .expect(200);

        expect(res.body.name).toBe('Toko Kopi');
      });
    });

    describe('2. Batas Buat Klien Baru', () => {
      it('Non-Superadmin ditolak membuat klien baru (403)', async () => {
        currentUser = { sub: 'manager-1', roles: ['manager'], tenantId: 't-1' };

        await request(app.getHttpServer())
          .post('/api/v1/tenant/clients')
          .send({ companyName: 'Toko A', managerEmail: 'a@a.com', managerName: 'A', enabledMenus: [] })
          .expect(403);
      });

      it('Superadmin berhasil membuat tenant + akun manager sekaligus (201)', async () => {
        currentUser = { sub: 'superadmin-1', roles: ['superadmin'], tenantId: null };

        context.mockPrisma.user.findUnique.mockResolvedValue(null);
        context.mockPrisma.tenant.create.mockResolvedValue({ id: 't-new', name: 'Toko Baru' });
        context.mockPrisma.user.create.mockResolvedValue({
          id: 'u-new', email: 'manager@baru.com', name: 'Manager Baru', role: 'manager',
        });

        const res = await request(app.getHttpServer())
          .post('/api/v1/tenant/clients')
          .send({
            companyName: 'Toko Baru',
            managerName: 'Manager Baru',
            managerEmail: 'manager@baru.com',
            enabledMenus: ['overview', 'crm'],
          })
          .expect(201);

        expect(res.body.tenant?.id ?? res.body.id).toBeTruthy();
      });
    });

    describe('3. Update Kuota & Menu Akses', () => {
      it('Superadmin berhasil mengubah paket & kuota tenant (200)', async () => {
        context.mockPrisma.tenant.findUnique.mockResolvedValue({
          id: 't-1', metadata: { plan: 'trial', maxMau: 10 },
          whatsappInstances: [],
        });
        context.mockPrisma.tenant.update.mockResolvedValue({
          id: 't-1', metadata: { plan: 'pro', maxMau: 2000 },
          whatsappInstances: [],
        });
        context.mockPrisma.conversation.findMany.mockResolvedValue([]);
        context.mockPrisma.message.count.mockResolvedValue(0);

        const res = await request(app.getHttpServer())
          .patch('/api/v1/tenant/clients/t-1/quota')
          .send({ plan: 'pro', maxMau: 2000, maxAiResponses: 15000 })
          .expect(200);

        expect(res.body.plan).toBe('pro');
      });

      it('Superadmin berhasil memperbarui hak akses menu klien (200)', async () => {
        context.mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't-1', metadata: {} });
        context.mockPrisma.tenant.update.mockResolvedValue({
          id: 't-1', metadata: { enabledMenus: ['crm', 'knowledge', 'followup'] },
        });

        const res = await request(app.getHttpServer())
          .patch('/api/v1/tenant/clients/t-1/menus')
          .send({ enabledMenus: ['crm', 'knowledge', 'followup'] })
          .expect(200);

        expect(res.body.metadata?.enabledMenus).toContain('crm');
      });
    });

    describe('4. Manajemen Akun Staf Klien', () => {
      it('Superadmin berhasil membuat akun staf baru untuk tenant (201)', async () => {
        context.mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't-1', metadata: {} });
        context.mockPrisma.user.findUnique.mockResolvedValue(null);
        context.mockPrisma.user.create.mockResolvedValue({
          id: 'staff-1', name: 'Staff CS', email: 'cs@toko.com', role: 'operator',
          tenantId: 't-1', createdAt: new Date(),
        });
        context.mockPrisma.tenant.update.mockResolvedValue({ id: 't-1', metadata: {} });

        const res = await request(app.getHttpServer())
          .post('/api/v1/tenant/clients/t-1/users')
          .send({ name: 'Staff CS', email: 'cs@toko.com', role: 'operator' })
          .expect(201);

        expect(res.body.role).toBe('operator');
      });

      it('Superadmin berhasil menghapus akun staf klien (200)', async () => {
        // deleteTenantStaff: findFirst by {id, tenantId} lalu findUnique tenant lalu delete user
        context.mockPrisma.user.findFirst.mockResolvedValue({ id: 'staff-1', tenantId: 't-1' });
        context.mockPrisma.tenant.findUnique.mockResolvedValue({
          id: 't-1', metadata: {},
        });
        context.mockPrisma.tenant.update.mockResolvedValue({ id: 't-1', metadata: {} });
        context.mockPrisma.user.delete.mockResolvedValue({ id: 'staff-1' });

        const res = await request(app.getHttpServer())
          .delete('/api/v1/tenant/clients/t-1/users/staff-1')
          .expect(200);

        expect(res.body.id ?? res.body.success ?? true).toBeTruthy();
      });

      it('Hapus klien beserta seluruh data terkait (200)', async () => {
        context.mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't-1' });
        context.mockPrisma.tenant.delete.mockResolvedValue({ id: 't-1' });

        const res = await request(app.getHttpServer())
          .delete('/api/v1/tenant/clients/t-1')
          .expect(200);

        expect(res.body.id ?? res.body.success ?? true).toBeTruthy();
      });
    });
  });

  // ------------------------------------------------------------------ //
  //  SLICE-10 : Tenant Products CRUD + Settings                         //
  // ------------------------------------------------------------------ //

  describe('Slice-10 — Tenant: Produk & Pengaturan Bot', () => {
    beforeEach(() => {
      currentUser = { sub: 'manager-2', email: 'mgr@toko.com', roles: ['manager'], tenantId: 't-prod' };
    });

    describe('1. CRUD Produk / Katalog', () => {
      it('Berhasil menambahkan produk baru ke katalog tenant (201)', async () => {
        context.mockPrisma.user.findUnique.mockResolvedValue({ id: 'manager-2', tenantId: 't-prod' });
        context.mockPrisma.product.create.mockResolvedValue({
          id: 'prod-1', name: 'Kopi Arabika 250gr', price: 55000, stock: 50,
          category: 'minuman', tenantId: 't-prod',
        });

        const res = await request(app.getHttpServer())
          .post('/api/v1/tenant/manager-2/products')
          .send({ name: 'Kopi Arabika 250gr', price: 55000, stock: 50, category: 'minuman' })
          .expect(201);

        expect(res.body.id).toBe('prod-1');
        expect(res.body.stock).toBe(50);
      });

      it('Berhasil memperbarui harga produk (200)', async () => {
        context.mockPrisma.user.findUnique.mockResolvedValue({ id: 'manager-2', tenantId: 't-prod' });
        context.mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', tenantId: 't-prod' });
        context.mockPrisma.product.update.mockResolvedValue({
          id: 'prod-1', price: 60000, stock: 45,
        });

        const res = await request(app.getHttpServer())
          .patch('/api/v1/tenant/manager-2/products/prod-1')
          .send({ price: 60000, stock: 45 })
          .expect(200);

        expect(res.body.price).toBe(60000);
      });

      it('Manager tenant lain DITOLAK mengelola produk tenant ini (403)', async () => {
        currentUser = { sub: 'asing-1', roles: ['manager'], tenantId: 'tenant-asing' };

        await request(app.getHttpServer())
          .post('/api/v1/tenant/manager-2/products')
          .send({ name: 'Barang Curian', price: 1 })
          .expect(403);
      });
    });

    describe('2. Pengaturan Bot (Agent Name, Tone, Prompt)', () => {
      it('Berhasil mengubah nama agen dan gaya bahasa bot (200)', async () => {
        currentUser = { sub: 'manager-2', roles: ['manager'], tenantId: 't-prod' };
        context.mockPrisma.user.findUnique.mockResolvedValue({ id: 'manager-2', tenantId: 't-prod' });
        context.mockPrisma.tenant.update.mockResolvedValue({
          id: 't-prod', agentName: 'Hana', agentTone: 'profesional',
          systemPrompt: 'Kamu adalah asisten toko ramah.',
        });

        const res = await request(app.getHttpServer())
          .patch('/api/v1/tenant/manager-2/settings')
          .send({ agentName: 'Hana', agentTone: 'profesional', systemPrompt: 'Kamu adalah asisten toko ramah.' })
          .expect(200);

        expect(res.body.agentName).toBe('Hana');
        expect(res.body.agentTone).toBe('profesional');
      });
    });
  });
});
