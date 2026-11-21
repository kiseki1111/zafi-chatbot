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
 * JwtStrategy yang sama dipakai app sungguhan.
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
    { method: 'get', path: '/api/v1/hris/audit-logs' },
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
    for (const route of HRIS_ROUTES) {
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

  describe('3. Token VALID tapi role BUKAN superadmin -> 403 (anti cross-tenant/staff-leak)', () => {
    for (const route of HRIS_ROUTES) {
      it(`${route.method.toUpperCase()} ${route.path} dengan role manager harus 403`, async () => {
        const res = await request(app.getHttpServer())
          [route.method](route.path)
          .set('Authorization', `Bearer ${managerToken}`);
        expect(res.status).toBe(403);
      });
    }
  });

  describe('4. Token VALID & role superadmin -> lolos guard (200), diteruskan ke HrisService', () => {
    for (const route of HRIS_ROUTES) {
      it(`${route.method.toUpperCase()} ${route.path} dengan role superadmin harus lolos (200)`, async () => {
        const res = await request(app.getHttpServer())
          [route.method](route.path)
          .set('Authorization', `Bearer ${superadminToken}`);
        // 200 = guard lolos, body boleh { success:false } karena HRIS_API_KEY belum diset di test
        // ini (fail-closed di level service) -- yang diverifikasi di sini murni soal otorisasi.
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success');
      });
    }
  });

  describe('5. Audit-log endpoint secara spesifik: tidak lagi bisa diintip tanpa superadmin', () => {
    it('audit-logs tanpa token tidak pernah membalas isi log (401, body tidak berisi data)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/hris/audit-logs');
      expect(res.status).toBe(401);
      expect(JSON.stringify(res.body)).not.toContain('AUTH_LOGIN');
    });

    it('audit-logs dengan role manager tidak bisa mengintip log tenant lain (403, body tidak berisi data)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hris/audit-logs')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(403);
      expect(JSON.stringify(res.body)).not.toContain('AUTH_LOGIN');
    });
  });
});
