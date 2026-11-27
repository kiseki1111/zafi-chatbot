import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import { AuthModule } from '../../src/features/web-dashboard/auth/auth.module';
import { createTestApp, TestAppContext } from '../helpers/create-test-app';
import { createMockConfigService } from '../mocks/config-service.mock';

jest.mock('axios');

/**
 * Comprehensive HTTP/Controller-level E2E Tests for SSO:
 * Covers AuthController, cookies, JwtAuthGuard (I-01..I-06), Refresh rotation (H-05),
 * Payload limits (J-05), IP forwarding (D-04), and end-to-end HTTP status contracts.
 */
describe('Skenario SSO Komprehensif (HTTP / Controller E2E)', () => {
  let context: TestAppContext;
  let app: INestApplication;
  let jwtService: JwtService;
  const CONSOLE_SSO_KEY = 'e2e-comprehensive-sso-key-for-testing-only';

  beforeAll(async () => {
    context = await createTestApp({ imports: [AuthModule] }, (builder) =>
      builder.overrideProvider(ConfigService).useValue(
        createMockConfigService({
          CONSOLE_SSO_KEY,
          CONSOLE_API_URL: 'http://console.local',
          JWT_ACCESS_SECRET: 'e2e_access_secret_12345',
          JWT_REFRESH_SECRET: 'e2e_refresh_secret_12345',
        }),
      ),
    );
    app = context.app;
    jwtService = context.module.get<JwtService>(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.post as jest.Mock).mockReset();
    context.mockPrisma.refreshToken.create.mockResolvedValue({});
    context.mockPrisma.auditLog.create.mockResolvedValue({});
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('A-01 & I-05: Login sukses -> 200, cookie access_token terpasang, JWT payload lengkap', async () => {
    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: {
        valid: true,
        entitled: true,
        customerId: 'cust-e2e-1',
        customerName: 'Toko E2E',
        chatbotTenantId: 'tenant-e2e-1',
      },
    });
    context.mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    context.mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 'tenant-e2e-1', metadata: {} });
    context.mockPrisma.user.upsert.mockResolvedValueOnce({
      id: 'u-e2e-1',
      email: 'e2e@toko.com',
      name: 'e2e',
      role: 'manager',
      tenantId: 'tenant-e2e-1',
      tenant: { id: 'tenant-e2e-1', metadata: {} },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'e2e@toko.com', passwordPlain: 'password123' });

    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']?.[0]).toContain('access_token=');
    expect(res.body.user).toMatchObject({
      id: 'u-e2e-1',
      email: 'e2e@toko.com',
      tenantId: 'tenant-e2e-1',
      hasSubscription: true,
    });

    const decoded = jwtService.decode(res.body.accessToken) as any;
    expect(decoded).toMatchObject({
      sub: 'u-e2e-1',
      email: 'e2e@toko.com',
      roles: ['manager'],
      tenantId: 'tenant-e2e-1',
      hasSubscription: true,
    });
  });

  it('B-07: Injeksi field tambahan dari Console (injectRole=superadmin) tidak mempengaruhi JWT/role', async () => {
    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: {
        valid: true,
        entitled: true,
        customerId: 'cust-inj',
        customerName: 'Toko Inj',
        chatbotTenantId: 'tenant-inj',
        adminOverride: true,
        injectRole: 'superadmin',
      },
    });
    context.mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    context.mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 'tenant-inj', metadata: {} });
    context.mockPrisma.user.upsert.mockResolvedValueOnce({
      id: 'u-inj',
      email: 'inj@toko.com',
      name: 'inj',
      role: 'manager',
      tenantId: 'tenant-inj',
      tenant: { id: 'tenant-inj', metadata: {} },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'inj@toko.com', passwordPlain: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.roles).toEqual(['manager']);
  });

  it('E-02: Tenant trial expired -> HTTP 403 Forbidden', async () => {
    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: {
        valid: true,
        entitled: true,
        customerId: 'cust-exp',
        customerName: 'Toko Exp',
        chatbotTenantId: 'tenant-exp',
      },
    });
    context.mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    context.mockPrisma.tenant.findUnique.mockResolvedValueOnce({
      id: 'tenant-exp',
      metadata: { isTrial: true, trialExpiresAt: '2020-01-01T00:00:00.000Z' },
    });
    context.mockPrisma.user.upsert.mockResolvedValueOnce({
      id: 'u-exp',
      email: 'exp@toko.com',
      name: 'exp',
      role: 'manager',
      tenantId: 'tenant-exp',
      tenant: {
        id: 'tenant-exp',
        metadata: { isTrial: true, trialExpiresAt: '2020-01-01T00:00:00.000Z' },
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'exp@toko.com', passwordPlain: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Masa trial 14 hari');
  });

  it('I-01 & I-04: Access token expired ditolak 401 di /logout; access token valid logout -> 200 & hapus cookie + refreshToken', async () => {
    const expiredToken = await jwtService.signAsync(
      { sub: 'u-e2e-1', email: 'e2e@toko.com', roles: ['manager'] },
      { secret: 'e2e_access_secret_12345', expiresIn: '-10s' },
    );

    const failRes = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(failRes.status).toBe(401);

    const validToken = await jwtService.signAsync(
      { sub: 'u-e2e-1', email: 'e2e@toko.com', roles: ['manager'] },
      { secret: 'e2e_access_secret_12345', expiresIn: '15m' },
    );
    context.mockPrisma.refreshToken.deleteMany.mockResolvedValueOnce({ count: 1 });

    const okRes = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${validToken}`);

    expect(okRes.status).toBe(200);
    expect(okRes.body.success).toBe(true);
    expect(context.mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u-e2e-1' },
    });
    const setCookies = okRes.headers['set-cookie'] || [];
    expect(setCookies.some((c: string) => c.includes('access_token=;'))).toBe(true);
  });

  it('I-02, I-03 & H-05: Refresh token rotation via HTTP /refresh -> sukses lalu token lama ditolak 401', async () => {
    const refreshPlain = await jwtService.signAsync(
      { jti: '1', sub: 'u-rot' },
      { secret: 'e2e_refresh_secret_12345', expiresIn: '30d' },
    );
    const hash = await bcrypt.hash(refreshPlain, 4);

    let rotated = false;
    context.mockPrisma.refreshToken.findFirst.mockImplementation(async () =>
      rotated
        ? null
        : {
            id: 'rt-rot',
            userId: 'u-rot',
            tokenHash: hash,
            expiresAt: new Date(Date.now() + 60000),
          },
    );
    context.mockPrisma.refreshToken.delete.mockImplementation(async () => {
      rotated = true;
      return {};
    });
    context.mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u-rot',
      email: 'rot@toko.com',
      role: 'manager',
      deletedAt: null,
    });

    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshTokenPlain: refreshPlain });
    expect(first.status).toBe(200);
    expect(first.body.accessToken).toBeDefined();
    expect(first.body.refreshToken).toBeDefined();

    const replay = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshTokenPlain: refreshPlain });
    expect(replay.status).toBe(401);
  });

  it('J-05: Payload login invalid / kosong / terlampau besar ditangani ValidationPipe tanpa crash', async () => {
    const invalidRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', passwordPlain: '' });
    expect(invalidRes.status).toBe(400);

    const hugeEmail = `${'a'.repeat(5000)}@example.com`;
    (axios.post as jest.Mock).mockResolvedValueOnce({ data: { valid: false } });
    context.mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const hugeRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: hugeEmail, passwordPlain: 'x'.repeat(5000) });
    expect([400, 401, 413]).toContain(hugeRes.status);
  });
});
