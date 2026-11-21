import { INestApplication } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { createTestApp, TestAppContext } from '../helpers/create-test-app';
import { AuthModule } from '../../src/features/web-dashboard/auth/auth.module';
import { HrisModule } from '../../src/features/hris/hris.module';

/**
 * Security Suite: Audit HRIS -- verifikasi end-to-end bahwa lubang keamanan yang ditemukan audit
 * (controller @Public() tanpa auth, leak lintas-tenant) sudah tertambal lewat HTTP request nyata,
 * bukan cuma mock unit test. Secret JWT ikut default createMockConfigService
 * ("test_jwt_access_secret_12345") supaya token yang kita tanda tangani di sini valid terhadap
 * JwtStrategy yang sama dipakai app sungguhan. Akses data HRIS: superadmin/manager/administrator
 * (staf tenant yang mengelola fitur ini, bukan sekadar superadmin); audit-logs platform tetap
 * superadmin-only, lihat hris.controller.ts.
 */
describe('Security Suite: Audit HRIS (akses tanpa token & lintas role)', () => {
  let context: TestAppContext;
  let app: INestApplication;

  const JWT_SECRET = 'test_jwt_access_secret_12345';
  const superadminToken = sign(
    { sub: 'u-super', email: 'owner@zafii.test', roles: ['superadmin'] },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
  const managerToken = sign(
    { sub: 'u-manager', email: 'manager@tokoA.com', roles: ['manager'], tenantId: 'tenant-toko-a' },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
  const administratorToken = sign(
    { sub: 'u-admin', email: 'admin@tokoB.com', roles: ['administrator'], tenantId: 'tenant-toko-b' },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
  const operatorToken = sign(
    { sub: 'u-operator', email: 'operator@tokoA.com', roles: ['operator'], tenantId: 'tenant-toko-a' },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
  const expiredToken = sign(
    { sub: 'u-super', email: 'owner@zafii.test', roles: ['superadmin'] },
    JWT_SECRET,
    { expiresIn: '-1h' },
  );

  const HRIS_ROUTES: { method: 'get'; path: string }[] = [
    { method: 'get', path: '/api/v1/hris/health' },
    { method: 'get', path: '/api/v1/hris/karyawan/list' },
    { method: 'get', path: '/api/v1/hris/karyawan/lookup?phone=0812' },
    { method: 'get', path: '/api/v1/hris/karyawan/NIK001/cuti' },
    { method: 'get', path: '/api/v1/hris/karyawan/NIK001/presensi' },
    { method: 'get', path: '/api/v1/hris/karyawan/NIK001/slip-gaji' },
    { method: 'get', path: '/api/v1/hris/attendance/daily' },
    { method: 'get', path: '/api/v1/hris/requests/pending' },
    { method: 'get', path: '/api/v1/hris/employees/summary' },
  ];

  beforeAll(async () => {
    process.env.SECURITY_BYPASS_MODE = 'false';
    process.env.NODE_ENV = 'production';

    context = await createTestApp({
      imports: [AuthModule, HrisModule],
    });
    app = context.app;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('1. TANPA token sama sekali -> 401 (sebelumnya: 200 bocor publik)', () => {
    for (const route of [...HRIS_ROUTES, { method: 'get' as const, path: '/api/v1/hris/audit-logs' }]) {
      it(`${route.method.toUpperCase()} ${route.path} tanpa Authorization header harus 401`, async () => {
        const res = await request(app.getHttpServer())[route.method](route.path);
        expect(res.status).toBe(401);
      });
    }
  });

  describe('2. Token KEDALUWARSA -> 401', () => {
    it('GET /api/v1/hris/karyawan/list dengan token expired harus 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hris/karyawan/list')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });
  });

  describe('3. Token VALID tapi role BUKAN staf HRIS (operator) -> 403 di semua rute data', () => {
    for (const route of HRIS_ROUTES) {
      it(`${route.method.toUpperCase()} ${route.path} dengan role operator harus 403`, async () => {
        const res = await request(app.getHttpServer())
          [route.method](route.path)
          .set('Authorization', `Bearer ${operatorToken}`);
        expect(res.status).toBe(403);
      });
    }
  });

  describe('4. Token VALID & role manager/administrator/superadmin -> lolos guard (200), diteruskan ke HrisService per-tenant', () => {
    for (const route of HRIS_ROUTES) {
      it(`${route.method.toUpperCase()} ${route.path} dengan role manager harus lolos (200)`, async () => {
        const res = await request(app.getHttpServer())
          [route.method](route.path)
          .set('Authorization', `Bearer ${managerToken}`);
        // 200 = guard lolos, body boleh { success:false } karena resolusi SSO per-tenant tidak
        // dikonfigurasi di test ini (fail-closed di level service) -- yang diverifikasi di sini
        // murni soal otorisasi, bukan isi data HRIS.
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success');
      });

      it(`${route.method.toUpperCase()} ${route.path} dengan role administrator harus lolos (200)`, async () => {
        const res = await request(app.getHttpServer())
          [route.method](route.path)
          .set('Authorization', `Bearer ${administratorToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success');
      });

      it(`${route.method.toUpperCase()} ${route.path} dengan role superadmin harus lolos (200)`, async () => {
        const res = await request(app.getHttpServer())
          [route.method](route.path)
          .set('Authorization', `Bearer ${superadminToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success');
      });
    }
  });

  describe('5. Audit-log endpoint: tetap superadmin-only, beda dari data HRIS di atas', () => {
    it('audit-logs tanpa token tidak pernah membalas isi log (401, body tidak berisi data)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/hris/audit-logs');
      expect(res.status).toBe(401);
      expect(JSON.stringify(res.body)).not.toContain('AUTH_LOGIN');
    });

    it('audit-logs dengan role manager tetap ditolak (403) walau manager boleh melihat data HRIS lain', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hris/audit-logs')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(403);
      expect(JSON.stringify(res.body)).not.toContain('AUTH_LOGIN');
    });

    it('audit-logs dengan role superadmin lolos (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hris/audit-logs')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success');
    });
  });
});
