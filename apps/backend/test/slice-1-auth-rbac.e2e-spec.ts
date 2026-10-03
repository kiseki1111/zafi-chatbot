import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../src/features/web-dashboard/auth/auth.module';
import { PlatformModule } from '../src/modules/platform/platform.module';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('mock_hashed_pw'),
}));

describe('Potongan 1: Batas Limit Autentikasi & Keamanan RBAC (Boundary Test)', () => {
  let context: TestAppContext;
  let app: INestApplication;
  let jwtService: JwtService;

  const JWT_SECRET = 'test_jwt_access_secret_12345';

  beforeAll(async () => {
    process.env.SECURITY_BYPASS_MODE = 'false';
    context = await createTestApp({
      imports: [AuthModule, PlatformModule],
    });
    app = context.app;
    jwtService = new JwtService({ secret: JWT_SECRET });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('1. Batas Input & Validasi Payload Login', () => {
    it('Harus menolak format email sampah atau injection pattern (400)', async () => {
      const payloads = [
        { email: 'admin\' OR \'1\'=\'1', passwordPlain: 'Pass123!' },
        { email: 'notanemail', passwordPlain: 'Pass123!' },
        { email: '', passwordPlain: 'Pass123!' },
      ];

      for (const payload of payloads) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(payload)
          .expect(400);
      }
    });

    it('Harus menolak jika kolom password kosong (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'user@example.com' })
        .expect(400);
    });
  });

  describe('2. Batas Kredensial & Status Akun', () => {
    it('Harus menolak login jika email tidak ada di database (401)', async () => {
      context.mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'tidakada@example.com', passwordPlain: 'Pass123!' })
        .expect(401);

      expect(res.body.message).toContain('keliru');
    });

    it('Harus menolak login jika password salah (401)', async () => {
      context.mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'user@example.com',
        password: 'hashed_pw',
        isActive: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'user@example.com', passwordPlain: 'WrongPassword!' })
        .expect(401);

      expect(res.body.message).toContain('keliru');
    });
  });

  describe('3. Batas Closed-Door Registration Policy', () => {
    it('Pendaftaran akun mandiri dari publik wajib diblokir tanpa kecuali (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'hacker@blackhat.com',
          passwordPlain: 'Attack123!',
          name: 'Hacker',
        })
        .expect(403);

      expect(res.body.message).toContain('Pendaftaran publik dinonaktifkan');
    });
  });

  describe('4. Batas Token Tampering & Kedaluwarsa', () => {
    it('Menolak request tanpa token otentikasi pada rute tertutup (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/platform/stats')
        .expect(401);
    });

    it('Menolak token dengan signature yang telah diubah / dipalsukan (401)', async () => {
      const fakeToken = jwtService.sign(
        { sub: 'hacker-1', email: 'hacker@dark.net', roles: ['superadmin'] },
        { secret: 'wrong_secret_signature' },
      );

      await request(app.getHttpServer())
        .get('/api/v1/platform/stats')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);
    });
  });

  describe('5. Batas Role-Based Access Control (Privilege Escalation Check)', () => {
    it('Operator atau Manajer DITOLAK saat mencoba mengakses fungsi Superadmin (403)', async () => {
      const operatorToken = jwtService.sign(
        { sub: 'operator-1', email: 'op@toko.com', roles: ['operator'], tenantId: 'tenant-1' },
        { secret: JWT_SECRET },
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/platform/stats')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);

      expect(res.body.message).toContain('Hanya Superadmin');
    });

    it('Superadmin DIIZINKAN mengakses statistik platform (200)', async () => {
      const superadminToken = jwtService.sign(
        { sub: 'superadmin-1', email: 'owner@platform.com', roles: ['superadmin'] },
        { secret: JWT_SECRET },
      );

      context.mockPrisma.tenant.count.mockResolvedValue(10);
      context.mockPrisma.whatsappInstance.count.mockResolvedValue(12);
      context.mockPrisma.message.count.mockResolvedValue(15000);
      context.mockPrisma.contact.count.mockResolvedValue(250);

      const res = await request(app.getHttpServer())
        .get('/api/v1/platform/stats')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('totalClients', 10);
      expect(res.body).toHaveProperty('totalInstances', 12);
      expect(res.body).toHaveProperty('totalMessages', 15000);
    });
  });

  describe('6. Siklus Hidup Refresh Token & Logout', () => {
    it('Menolak token refresh yang tidak valid atau telah dicabut (401)', async () => {
      context.mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ userId: 'u1', refreshTokenPlain: 'invalid_refresh_token' })
        .expect(401);
    });

    it('Logout berhasil membersihkan sesi pengguna (200)', async () => {
      const userToken = jwtService.sign(
        { sub: 'u1', email: 'user@toko.com', roles: ['manager'] },
        { secret: JWT_SECRET },
      );
      context.mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.headers['set-cookie']).toBeDefined();
    });
  });
});
