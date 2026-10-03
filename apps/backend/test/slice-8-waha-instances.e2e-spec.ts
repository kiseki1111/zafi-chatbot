import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { WahaModule } from '../src/modules/waha/waha.module';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { WahaService } from '../src/modules/waha/waha.service';
import { OmnichannelQueueService } from '../src/core/omnichannel/omnichannel-queue.service';
import { CsService } from '../src/features/agent-cs/cs.service';

describe('Slice-8: WAHA Instance Management (Create, Lifecycle, Delete, Security)', () => {
  let context: TestAppContext;
  let app: INestApplication;

  let currentUser: any = {
    sub: 'manager-1',
    email: 'manager@toko.com',
    roles: ['manager'],
    tenantId: 'tenant-wa',
  };

  const mockWaha = {
    startSession: jest.fn(),
    restartSession: jest.fn(),
    stopSession: jest.fn(),
    logoutSession: jest.fn(),
    getSessions: jest.fn(),
    getSession: jest.fn(),
    getQrCode: jest.fn(),
    sendMessage: jest.fn(),
  };

  const mockQueue = { enqueue: jest.fn() };
  const mockCs = { handleMessage: jest.fn() };

  beforeAll(async () => {
    context = await createTestApp(
      { imports: [WahaModule] },
      (b) =>
        b
          .overrideGuard(JwtAuthGuard)
          .useValue({
            canActivate: (ctx: any) => {
              ctx.switchToHttp().getRequest().user = currentUser;
              return true;
            },
          })
          .overrideProvider(WahaService)
          .useValue(mockWaha)
          .overrideProvider(OmnichannelQueueService)
          .useValue(mockQueue)
          .overrideProvider(CsService)
          .useValue(mockCs),
    );
    app = context.app;
  });

  afterAll(async () => { if (app) await app.close(); });
  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = { sub: 'manager-1', email: 'manager@toko.com', roles: ['manager'], tenantId: 'tenant-wa' };
  });

  describe('1. Batas Pembuatan Instance Baru', () => {
    it('Menolak jika nama sesi kosong atau tidak diisi (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/waha/instances')
        .send({ name: '   ' })
        .expect(400);

      expect(res.body.message).toContain('wajib diisi');
    });

    it('Menolak jika nama sesi sudah dipakai tenant lain (400)', async () => {
      context.mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'toko-kopi',
        tenantId: 'tenant-lain',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/waha/instances')
        .send({ name: 'toko-kopi', tenantId: 'tenant-wa' })
        .expect(400);

      expect(res.body.message).toContain('sudah digunakan');
    });

    it('Berhasil membuat sesi baru yang namanya belum ada (201)', async () => {
      context.mockPrisma.whatsappInstance.findUnique.mockResolvedValue(null);
      mockWaha.startSession.mockResolvedValue({
        name: 'toko-baru',
        status: 'STOPPED',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/waha/instances')
        .send({ name: 'toko baru' }) // spasi → akan diubah ke 'toko-baru'
        .expect(201);

      expect(mockWaha.startSession).toHaveBeenCalledWith(
        'toko-baru',
        expect.any(Array),
        undefined,
        'tenant-wa',
      );
    });
  });

  describe('2. Lifecycle Sesi (Restart, Stop, Logout)', () => {
    it('Restart instance memanggil wahaService.restartSession (201)', async () => {
      mockWaha.restartSession.mockResolvedValue({ status: 'WORKING' });

      await request(app.getHttpServer())
        .post('/api/v1/waha/instances/toko-kopi/restart')
        .expect(201);

      expect(mockWaha.restartSession).toHaveBeenCalledWith('toko-kopi');
    });

    it('Stop instance memanggil wahaService.stopSession (201)', async () => {
      mockWaha.stopSession.mockResolvedValue({ status: 'STOPPED' });

      await request(app.getHttpServer())
        .post('/api/v1/waha/instances/toko-kopi/stop')
        .expect(201);

      expect(mockWaha.stopSession).toHaveBeenCalledWith('toko-kopi');
    });

    it('Logout instance memanggil wahaService.logoutSession (201)', async () => {
      mockWaha.logoutSession.mockResolvedValue({ status: 'STOPPED' });

      await request(app.getHttpServer())
        .post('/api/v1/waha/instances/toko-kopi/logout')
        .expect(201);

      expect(mockWaha.logoutSession).toHaveBeenCalledWith('toko-kopi');
    });
  });

  describe('3. Hapus Instance & Keamanan Isolasi Tenant', () => {
    it('Manager dapat menghapus instance milik tenantnya sendiri (200)', async () => {
      context.mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'toko-kopi',
        tenantId: 'tenant-wa',
      });
      mockWaha.logoutSession.mockResolvedValue({});
      context.mockPrisma.whatsappInstance.delete.mockResolvedValue({ instanceName: 'toko-kopi' });

      const res = await request(app.getHttpServer())
        .delete('/api/v1/waha/instances/toko-kopi')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('Menolak hapus instance milik tenant lain (403)', async () => {
      context.mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'toko-lain',
        tenantId: 'tenant-berbeda',
      });

      // role bukan 'superadmin' → pemeriksaan tenant dijalankan
      currentUser = { ...currentUser, role: 'manager' };

      await request(app.getHttpServer())
        .delete('/api/v1/waha/instances/toko-lain')
        .expect(403);
    });
  });

  describe('4. Ambil Daftar Instance (dari DB)', () => {
    it('Manager hanya melihat instance milik tenantnya (200)', async () => {
      context.mockPrisma.whatsappInstance.findMany.mockResolvedValue([
        { instanceName: 'toko-kopi', tenantId: 'tenant-wa', status: 'WORKING' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/waha/instances/db')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].tenantId).toBe('tenant-wa');
    });
  });
});
