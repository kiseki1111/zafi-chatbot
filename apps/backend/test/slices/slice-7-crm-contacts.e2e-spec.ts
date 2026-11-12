import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ContactsModule } from '../../src/modules/contacts/contacts.module';
import { createTestApp, TestAppContext } from '../helpers/create-test-app';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';

describe('Slice-7: CRM Contacts (CRUD + Search Filter + Tenant Isolation)', () => {
  let context: TestAppContext;
  let app: INestApplication;

  let currentUser: any = {
    sub: 'op-1',
    email: 'operator@toko.com',
    roles: ['operator'],
    tenantId: 'tenant-crm',
  };

  beforeAll(async () => {
    context = await createTestApp({ imports: [ContactsModule] }, (b) =>
      b.overrideGuard(JwtAuthGuard).useValue({
        canActivate: (ctx: any) => {
          ctx.switchToHttp().getRequest().user = currentUser;
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
      sub: 'op-1',
      email: 'operator@toko.com',
      roles: ['operator'],
      tenantId: 'tenant-crm',
    };
  });

  describe('1. Batas Validasi Buat Kontak', () => {
    it('Menolak jika name atau phone tidak disertakan (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({ email: 'valid@email.com' })
        .expect(400);
    });

    it('Menolak format email yang tidak valid (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({ name: 'Test', phone: '6281234', email: 'bukan-email' })
        .expect(400);
    });

    it('Berhasil membuat kontak baru dengan data minimal (201)', async () => {
      context.mockPrisma.contact.create.mockResolvedValue({
        id: 'contact-new-1',
        name: 'Budi Santoso',
        phone: '628111222333',
        status: 'NEW',
        source: 'MANUAL',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({ name: 'Budi Santoso', phone: '628111222333' })
        .expect(201);

      expect(res.body.id).toBe('contact-new-1');
      expect(res.body.name).toBe('Budi Santoso');
    });
  });

  describe('2. Listing & Filter Pencarian', () => {
    it('Mengembalikan semua kontak tenant dengan filter status (200)', async () => {
      context.mockPrisma.contact.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Andi',
          phone: '62811',
          status: 'QUALIFIED',
          tags: [],
          conversations: [],
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/contacts?status=QUALIFIED')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].status).toBe('QUALIFIED');
    });

    it('Filter pencarian via query `search` menghasilkan kontak yang cocok (200)', async () => {
      context.mockPrisma.contact.findMany.mockResolvedValue([
        {
          id: 'c2',
          name: 'Siti Rahayu',
          phone: '62822',
          status: 'NEW',
          tags: [],
          conversations: [],
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/contacts?search=Siti')
        .expect(200);

      expect(res.body[0].name).toBe('Siti Rahayu');
    });
  });

  describe('3. Update & Batas Status Kontak', () => {
    it('Berhasil mengubah status prospek kontak (200)', async () => {
      context.mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'c1',
        phone: '62811',
      });
      context.mockPrisma.contact.update.mockResolvedValue({
        id: 'c1',
        name: 'Andi',
        phone: '62811',
        status: 'WON',
      });

      const res = await request(app.getHttpServer())
        .patch('/api/v1/contacts/c1')
        .send({ status: 'WON', notes: 'Deal closed via WhatsApp' })
        .expect(200);

      expect(res.body.status).toBe('WON');
    });

    it('Berhasil memperbarui metadata perumahan, tipeUnit, dan status prospek (200)', async () => {
      context.mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'c1',
        phone: '62811',
      });
      context.mockPrisma.contact.update.mockResolvedValue({
        id: 'c1',
        name: 'Andi',
        phone: '62811',
        status: 'Booking',
        metadata: {
          perumahan: 'Griya Amanah 2',
          tipeUnit: 'Tipe 40',
          hargaUnit: 295000000,
        },
      });

      const res = await request(app.getHttpServer())
        .patch('/api/v1/contacts/c1')
        .send({
          status: 'Booking',
          metadata: {
            perumahan: 'Griya Amanah 2',
            tipeUnit: 'Tipe 40',
            hargaUnit: 295000000,
          },
        })
        .expect(200);

      expect(res.body.status).toBe('Booking');
      expect(res.body.metadata.perumahan).toBe('Griya Amanah 2');
      expect(res.body.metadata.hargaUnit).toBe(295000000);
    });

    it('Menolak update jika kontak tidak ada di tenant bersangkutan (404)', async () => {
      context.mockPrisma.contact.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/api/v1/contacts/foreign-contact')
        .send({ status: 'WON' })
        .expect(404);
    });
  });

  describe('4. Hapus Kontak & Isolasi Tenant', () => {
    it('Berhasil menghapus kontak milik tenant sendiri (200)', async () => {
      context.mockPrisma.contact.findFirst.mockResolvedValue({ id: 'c1' });
      context.mockPrisma.contact.delete.mockResolvedValue({ id: 'c1' });

      const res = await request(app.getHttpServer())
        .delete('/api/v1/contacts/c1')
        .expect(200);

      expect(res.body.id).toBe('c1');
    });

    it('Superadmin dapat melihat kontak semua tenant tanpa batas (200)', async () => {
      currentUser = { sub: 'super-1', roles: ['superadmin'], tenantId: null };
      context.mockPrisma.contact.findMany.mockResolvedValue([
        {
          id: 'c-global',
          name: 'Global Contact',
          phone: '62899',
          tags: [],
          conversations: [],
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .expect(200);

      expect(res.body).toHaveLength(1);
    });
  });

  describe('5. Hot Leads (Deteksi Minat Kuat)', () => {
    it('Mengembalikan daftar hot lead milik tenant beserta alasan pemicunya (200)', async () => {
      context.mockPrisma.contact.findMany.mockResolvedValue([
        {
          id: 'hot-1',
          name: 'Hendra Wijaya',
          phone: '628123456789',
          status: 'Survey',
          notes: 'Minta survey Sabtu',
          metadata: {
            leadScore: 'HOT',
            hotTriggerReason: 'Permintaan Survey Lokasi Fisik',
            messageCount: 10,
            hotNotifiedAt: '2026-01-01T00:00:00.000Z',
            hotAcknowledged: false,
          },
          conversations: [{ lastMessageAt: '2026-01-01T01:00:00.000Z' }],
          updatedAt: '2026-01-01T01:00:00.000Z',
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/contacts/hot-leads')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          id: 'hot-1',
          leadScore: 'HOT',
          hotTriggerReason: 'Permintaan Survey Lokasi Fisik',
          messageCount: 10,
          hotAcknowledged: false,
        }),
      );
    });

    it('Filter `unread=true` hanya mengembalikan hot lead yang belum di-acknowledge (200)', async () => {
      context.mockPrisma.contact.findMany.mockResolvedValue([
        {
          id: 'hot-unread',
          name: 'Budi',
          phone: '628111',
          status: 'Survey',
          metadata: { leadScore: 'HOT', hotAcknowledged: false },
          conversations: [],
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'hot-ack',
          name: 'Siti',
          phone: '628222',
          status: 'Booking',
          metadata: { leadScore: 'HOT', hotAcknowledged: true },
          conversations: [],
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/contacts/hot-leads?unread=true')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe('hot-unread');
    });

    it('Menolak akses operator tanpa tenant (403)', async () => {
      currentUser = { sub: 'op-x', roles: ['operator'], tenantId: null };

      await request(app.getHttpServer())
        .get('/api/v1/contacts/hot-leads')
        .expect(403);
    });
  });
});
