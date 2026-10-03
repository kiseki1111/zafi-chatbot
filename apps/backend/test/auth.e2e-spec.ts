import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../src/features/web-dashboard/auth/auth.module';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('mocked_hash'),
}));

describe('Auth Flow (e2e)', () => {
  let context: TestAppContext;
  let app: INestApplication;

  beforeAll(async () => {
    process.env.SECURITY_BYPASS_MODE = 'false';
    context = await createTestApp({
      imports: [AuthModule],
    });
    app = context.app;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/auth/login', () => {
    it('harus menolak login dengan format payload tidak valid (400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'bukan-email', passwordPlain: '12' });

      expect(response.status).toBe(400);
    });

    it('harus menolak login jika email tidak ditemukan (401)', async () => {
      context.mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'tidakada@example.com', passwordPlain: 'Password123!' });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('keliru');
    });

    it('harus berhasil login dan mengembalikan token serta set cookie (200)', async () => {
      const dummyUser = {
        id: 'user-uuid-1',
        email: 'admin@example.com',
        name: 'Admin Test',
        password: 'hashed_password',
        role: 'superadmin',
        isActive: true,
        tenantId: 'tenant-1',
        tenant: { id: 'tenant-1', name: 'Tenant Test' },
      };

      context.mockPrisma.user.findUnique.mockResolvedValue(dummyUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      context.mockPrisma.user.update.mockResolvedValue(dummyUser);
      context.mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' } as any);
      context.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' } as any);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@example.com', passwordPlain: 'Password123!' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('admin@example.com');
      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('harus mengembalikan 403 Forbidden sesuai closed-door policy', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'baru@example.com',
          passwordPlain: 'Password123!',
          name: 'Pendaftar Baru',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Pendaftaran publik dinonaktifkan');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('harus menolak refresh jika token tidak ditemukan di DB (401)', async () => {
      context.mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          userId: 'user-uuid-1',
          refreshTokenPlain: 'invalid_token',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('harus menolak logout tanpa token otentikasi (401)', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/logout');
      expect(response.status).toBe(401);
    });
  });
});
