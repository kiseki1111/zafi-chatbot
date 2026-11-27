import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import axios from 'axios';
import * as bcrypt from 'bcrypt';

jest.mock('axios');

/**
 * Comprehensive SSO Unit Tests covering sso-testing-scenarios.md:
 * Categories A, B, C, D, E, F, H (service concurrency), I (token/session), J (edge/chaos).
 */
describe('AuthService SSO Comprehensive Scenarios (A-J)', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let localPassHash: string;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const baseConfigGet = (key: string, defaultValue?: any) => {
    const defaults: Record<string, any> = {
      JWT_ACCESS_SECRET: 'test-access-secret-12345',
      JWT_REFRESH_SECRET: 'test-refresh-secret-12345',
      JWT_ACCESS_EXPIRES: '15m',
      JWT_REFRESH_EXPIRES: '30d',
      CONSOLE_SSO_KEY: 'k'.repeat(43),
      CONSOLE_API_URL: 'http://console.local',
    };
    return key in defaults ? defaults[key] : (defaultValue ?? null);
  };

  const mockConfigService = {
    get: jest.fn(baseConfigGet),
  };

  beforeAll(async () => {
    localPassHash = await bcrypt.hash('localpass', 4);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    (axios.post as jest.Mock).mockReset();
    (mockConfigService.get as jest.Mock).mockImplementation(baseConfigGet);
    mockPrisma.refreshToken.create.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  // =========================================================================
  // A. Happy Path — Login Berhasil
  // =========================================================================
  describe('A. Happy Path', () => {
    it('A-01: Login pertama kali, Console valid + entitled + chatbotTenantId tertaut', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          valid: true,
          entitled: true,
          customerId: 'cust-001',
          customerName: 'Toko ABC',
          chatbotTenantId: 'tenant-abc',
        },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 'tenant-abc', metadata: {} });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-abc',
        email: 'owner@tokoabc.com',
        name: 'owner',
        role: 'manager',
        tenantId: 'tenant-abc',
        tenant: { id: 'tenant-abc', metadata: {} },
      });

      const res = await service.login(
        { email: 'owner@tokoabc.com', passwordPlain: 'password123' },
        '127.0.0.1',
        'jest-ua',
      );

      expect(res.accessToken).toBeDefined();
      expect(res.refreshToken).toBeDefined();
      expect(res.user.tenantId).toBe('tenant-abc');
      expect(res.user.hasSubscription).toBe(true);
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'owner@tokoabc.com' } }),
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'AUTH_LOGIN_SUCCESS', status: 'SUCCESS' }),
        }),
      );
    });

    it('A-02: Login kedua kali user yang sudah ada (re-login) -> tenant sama, tidak buat tenant baru', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          valid: true,
          entitled: true,
          customerId: 'cust-001',
          customerName: 'Toko ABC',
          chatbotTenantId: 'tenant-abc',
        },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-abc',
        email: 'owner@tokoabc.com',
        tenantId: 'tenant-abc',
        tenant: { id: 'tenant-abc', consoleCustomerId: 'cust-001', metadata: {} },
      });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 'tenant-abc', metadata: {} });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-abc',
        email: 'owner@tokoabc.com',
        name: 'owner',
        role: 'manager',
        tenantId: 'tenant-abc',
        tenant: { id: 'tenant-abc', metadata: {} },
      });

      const res = await service.login(
        { email: 'owner@tokoabc.com', passwordPlain: 'password123' },
        '127.0.0.1',
        'jest-ua',
      );

      expect(res.user.hasSubscription).toBe(true);
      expect(res.user.tenantId).toBe('tenant-abc');
      expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
    });

    it('A-03: Console valid + entitled + chatbotTenantId null -> auto-provision & link-tenant', async () => {
      (axios.post as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            valid: true,
            entitled: true,
            customerId: 'cust-new',
            customerName: 'Toko Baru',
            chatbotTenantId: null,
          },
        })
        .mockResolvedValueOnce({ data: { ok: true } });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'tenant-new-id', name: 'Toko Baru', metadata: {} });
      mockPrisma.tenant.create.mockResolvedValueOnce({
        id: 'tenant-new-id',
        name: 'Toko Baru',
        consoleCustomerId: 'cust-new',
      });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-new',
        email: 'new@tokonew.com',
        name: 'new',
        role: 'manager',
        tenantId: 'tenant-new-id',
        tenant: { id: 'tenant-new-id', metadata: {} },
      });

      const res = await service.login(
        { email: 'new@tokonew.com', passwordPlain: 'pass' },
        '127.0.0.1',
        'jest-ua',
      );

      expect(res.user.hasSubscription).toBe(true);
      expect(res.user.tenantId).toBe('tenant-new-id');
      expect(mockPrisma.tenant.create).toHaveBeenCalledWith({
        data: { name: 'Toko Baru', consoleCustomerId: 'cust-new' },
      });
      expect(axios.post).toHaveBeenNthCalledWith(
        2,
        'http://console.local/api/integration/v1/sso/link-tenant',
        { customerId: 'cust-new', chatbotTenantId: 'tenant-new-id' },
        expect.objectContaining({
          headers: { Authorization: `Bearer ${'k'.repeat(43)}` },
        }),
      );
    });

    it('A-04: Console valid + NOT entitled (unsubscribed) first login -> hasSubscription=false & auto-provision', async () => {
      (axios.post as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            valid: true,
            entitled: false,
            customerId: 'cust-free',
            customerName: 'Toko Coba',
            chatbotTenantId: null,
          },
        })
        .mockResolvedValueOnce({ data: { ok: true } });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'tenant-free', metadata: {} });
      mockPrisma.tenant.create.mockResolvedValueOnce({ id: 'tenant-free', name: 'Toko Coba' });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-free',
        email: 'trial@tokocoba.com',
        name: 'trial',
        role: 'manager',
        tenantId: 'tenant-free',
        tenant: { id: 'tenant-free', metadata: {} },
      });

      const res = await service.login(
        { email: 'trial@tokocoba.com', passwordPlain: 'pass' },
        '127.0.0.1',
        'jest-ua',
      );

      expect(res.user.hasSubscription).toBe(false);
      expect(res.user.tenantId).toBe('tenant-free');
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('A-05: Upgrade subscription (unsubscribed -> entitled) tanpa restart', async () => {
      // Login #1 unsubscribed
      (axios.post as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            valid: true,
            entitled: false,
            customerId: 'cust-prog',
            customerName: 'Toko Prog',
            chatbotTenantId: null,
          },
        })
        .mockResolvedValueOnce({ data: { ok: true } });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'tenant-prog', metadata: {} });
      mockPrisma.tenant.create.mockResolvedValueOnce({ id: 'tenant-prog', name: 'Toko Prog' });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-prog',
        email: 'prog@test.com',
        name: 'prog',
        role: 'manager',
        tenantId: 'tenant-prog',
        tenant: { id: 'tenant-prog', metadata: {} },
      });

      const first = await service.login(
        { email: 'prog@test.com', passwordPlain: 'pass' },
        '127.0.0.1',
        'jest-ua',
      );
      expect(first.user.hasSubscription).toBe(false);

      // Login #2 entitled
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          valid: true,
          entitled: true,
          customerId: 'cust-prog',
          customerName: 'Toko Prog',
          chatbotTenantId: 'tenant-prog',
        },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-prog',
        email: 'prog@test.com',
        tenantId: 'tenant-prog',
        tenant: { id: 'tenant-prog', consoleCustomerId: 'cust-prog', metadata: {} },
      });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 'tenant-prog', metadata: {} });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-prog',
        email: 'prog@test.com',
        name: 'prog',
        role: 'manager',
        tenantId: 'tenant-prog',
        tenant: { id: 'tenant-prog', metadata: {} },
      });

      const second = await service.login(
        { email: 'prog@test.com', passwordPlain: 'pass' },
        '127.0.0.1',
        'jest-ua',
      );
      expect(second.user.hasSubscription).toBe(true);
      expect(second.user.tenantId).toBe('tenant-prog');
      expect(mockPrisma.tenant.create).toHaveBeenCalledTimes(1);
    });

    it('A-06: Login ke-2 unsubscribed dengan consoleCustomerId sama -> reuse tenant lama, tidak panggil link-tenant duplikat', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          valid: true,
          entitled: false,
          customerId: 'cust-free',
          customerName: 'Toko Coba',
          chatbotTenantId: null,
        },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-coba',
        email: 'coba@test.com',
        tenantId: 'tenant-coba',
        tenant: { id: 'tenant-coba', consoleCustomerId: 'cust-free', metadata: {} },
      });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 'tenant-coba', metadata: {} });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-coba',
        email: 'coba@test.com',
        name: 'coba',
        role: 'manager',
        tenantId: 'tenant-coba',
        tenant: { id: 'tenant-coba', metadata: {} },
      });

      const res = await service.login(
        { email: 'coba@test.com', passwordPlain: 'pass' },
        '127.0.0.1',
        'jest-ua',
      );

      expect(res.user.hasSubscription).toBe(false);
      expect(res.user.tenantId).toBe('tenant-coba');
      expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledTimes(1); // Only verify, no duplicate link-tenant
    });

    it('A-07: Superadmin login via akun lokal (tanpa CONSOLE_SSO_KEY) -> berhasil, hasSubscription=true', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, d?: any) =>
        key === 'CONSOLE_SSO_KEY' ? undefined : baseConfigGet(key, d),
      );
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-sa',
        email: 'superadmin@umkm.id',
        name: 'Superadmin',
        role: 'superadmin',
        password: localPassHash,
        tenantId: null,
        tenant: null,
      });

      const res = await service.login(
        { email: 'superadmin@umkm.id', passwordPlain: 'localpass' },
        '127.0.0.1',
        'jest-ua',
      );

      expect(res.accessToken).toBeDefined();
      expect(res.user.hasSubscription).toBe(true);
      expect(res.user.roles).toEqual(['superadmin']);
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // B. Anti-Hijack & Security
  // =========================================================================
  describe('B. Anti-Hijack & Security', () => {
    it('B-01: Email conflict dengan consoleCustomerId berbeda -> 401, tidak upsert/link-tenant, audit log tercatat', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          valid: true,
          entitled: true,
          customerId: 'cust-B-attacker',
          customerName: 'Attacker',
          chatbotTenantId: null,
        },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'victim-1',
        email: 'owner@tokoa.com',
        tenantId: 'tenant-A',
        tenant: { id: 'tenant-A', consoleCustomerId: 'cust-A' },
      });

      await expect(
        service.login({ email: 'owner@tokoa.com', passwordPlain: 'pass' }, '127.0.0.1', 'jest-ua'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'AUTH_LOGIN_FAILED', status: 'FAILED' }),
        }),
      );
    });

    it('B-02: chatbotTenantId menunjuk tenant berbeda dari user lokal -> 401, tidak upsert', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          valid: true,
          entitled: true,
          customerId: 'cust-other',
          customerName: 'Other',
          chatbotTenantId: 'tenant-other',
        },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'victim-2',
        email: 'victim@store.com',
        tenantId: 'tenant-victim',
      });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 'tenant-other', metadata: {} });

      await expect(
        service.login({ email: 'victim@store.com', passwordPlain: 'pass' }, '127.0.0.1', 'jest-ua'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    });

    it('B-03: chatbotTenantId tidak ada di DB chatbot -> 403 ForbiddenException', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          valid: true,
          entitled: true,
          customerId: 'cust-ghost',
          customerName: 'Ghost',
          chatbotTenantId: 'tenant-ghost',
        },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'ghost@test.com', passwordPlain: 'pass' }, '127.0.0.1', 'jest-ua'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    });

    it('B-04: valid=true tapi customerId=null & chatbotTenantId=null -> 403 ForbiddenException', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          valid: true,
          entitled: true,
          customerId: null,
          customerName: null,
          chatbotTenantId: null,
        },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'incomplete@test.com', passwordPlain: 'pass' }, '127.0.0.1', 'jest-ua'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
    });

    it('B-05: Brute force 10x password salah -> semua 401 & 10 audit log', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { valid: false, entitled: false, customerId: null, customerName: null, chatbotTenantId: null },
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      for (let i = 0; i < 10; i++) {
        await expect(
          service.login({ email: 'owner@tokoa.com', passwordPlain: `wrong-${i}` }, '127.0.0.1', 'jest-ua'),
        ).rejects.toThrow(UnauthorizedException);
      }

      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(10);
      expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    });

    it('B-06: Token Bearer salah (Console balas 401) -> fallback lokal jika ada, atau 401 tanpa 500', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce({ response: { status: 401 } });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'any@test.com', passwordPlain: 'pass' }, '127.0.0.1', 'jest-ua'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('B-07: Injeksi field tambahan (adminOverride, injectRole) dari Console diabaikan', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          valid: true,
          entitled: true,
          customerId: 'cust-001',
          customerName: 'Toko',
          chatbotTenantId: 'tenant-001',
          adminOverride: true,
          bypass: true,
          injectRole: 'superadmin',
        },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 'tenant-001', metadata: {} });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-inj',
        email: 'inj@test.com',
        name: 'inj',
        role: 'manager',
        tenantId: 'tenant-001',
        tenant: { id: 'tenant-001', metadata: {} },
      });

      const res = await service.login(
        { email: 'inj@test.com', passwordPlain: 'pass' },
        '127.0.0.1',
        'jest-ua',
      );

      expect(res.user.roles).toEqual(['manager']);
      expect(res.user.roles).not.toContain('superadmin');
    });

    it('B-08: Concurrent login email sama -> kedua request 200, hanya 1 tenant dibuat', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          valid: true,
          entitled: true,
          customerId: 'cust-race',
          customerName: 'Race Toko',
          chatbotTenantId: null,
        },
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      let created = false;
      mockPrisma.tenant.findUnique.mockImplementation(async () =>
        created ? { id: 'tenant-race', metadata: {} } : null,
      );
      mockPrisma.tenant.create.mockImplementation(async () => {
        created = true;
        return { id: 'tenant-race', name: 'Race Toko', consoleCustomerId: 'cust-race' };
      });
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'u-race',
        email: 'race@test.com',
        name: 'race',
        role: 'manager',
        tenantId: 'tenant-race',
        tenant: { id: 'tenant-race', metadata: {} },
      });

      const [r1, r2] = await Promise.all([
        service.login({ email: 'race@test.com', passwordPlain: 'pass' }, '10.0.0.1', 'ua1'),
        service.login({ email: 'race@test.com', passwordPlain: 'pass' }, '10.0.0.2', 'ua2'),
      ]);

      expect(r1.user.tenantId).toBe('tenant-race');
      expect(r2.user.tenantId).toBe('tenant-race');
    });
  });

  // =========================================================================
  // C. Fallback Console Tidak Tersedia
  // =========================================================================
  describe('C. Fallback Console Tidak Tersedia', () => {
    it('C-01: Console ECONNREFUSED + user lokal ada + password cocok -> 200 pakai tenant lama', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-legacy',
        email: 'legacy@toko.com',
        name: 'Legacy',
        role: 'manager',
        password: localPassHash,
        tenantId: 'tenant-local',
        tenant: { id: 'tenant-local', metadata: {} },
      });

      const res = await service.login(
        { email: 'legacy@toko.com', passwordPlain: 'localpass' },
        '127.0.0.1',
        'jest-ua',
      );

      expect(res.user.tenantId).toBe('tenant-local');
      expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    });

    it('C-02: Console ECONNREFUSED + user lokal ada + password SALAH -> 401', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-legacy',
        email: 'legacy@toko.com',
        password: localPassHash,
        tenantId: 'tenant-local',
        tenant: { id: 'tenant-local', metadata: {} },
      });

      await expect(
        service.login({ email: 'legacy@toko.com', passwordPlain: 'wrongpass' }, '127.0.0.1', 'jest-ua'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('C-03: Console ECONNREFUSED + user TIDAK ada di DB -> 401', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'newuser@toko.com', passwordPlain: 'anypass' }, '127.0.0.1', 'jest-ua'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
    });

    it('C-04: Console timeout (3s) -> fallback lokal berhasil', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('timeout of 3000ms exceeded'));
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-timeout',
        email: 'legacy@toko.com',
        name: 'Legacy',
        role: 'manager',
        password: localPassHash,
        tenantId: 'tenant-local',
        tenant: { id: 'tenant-local', metadata: {} },
      });

      const res = await service.login(
        { email: 'legacy@toko.com', passwordPlain: 'localpass' },
        '127.0.0.1',
        'jest-ua',
      );

      expect(res.user.tenantId).toBe('tenant-local');
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ timeout: 3000 }),
      );
    });

    it('C-05: Console mengembalikan body kosong / string HTML -> fallback 401 tanpa crash', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: '<html>error</html>' });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'html@test.com', passwordPlain: 'pass' }, '127.0.0.1', 'jest-ua'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('C-06: Console mengembalikan schema unexpected ({} atau {status:"ok"}) -> fallback 401', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: { status: 'ok' } });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'schema@test.com', passwordPlain: 'pass' }, '127.0.0.1', 'jest-ua'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // D. Konfigurasi & Environment
  // =========================================================================
  describe('D. Konfigurasi & Environment', () => {
    it('D-01: CONSOLE_SSO_KEY undefined -> mode lokal murni, axios tidak dipanggil', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, d?: any) =>
        key === 'CONSOLE_SSO_KEY' ? undefined : baseConfigGet(key, d),
      );
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-loc',
        email: 'admin@local.com',
        name: 'Admin',
        role: 'manager',
        password: localPassHash,
        tenantId: 't-loc',
        tenant: { id: 't-loc', metadata: {} },
      });

      const res = await service.login(
        { email: 'admin@local.com', passwordPlain: 'localpass' },
        '127.0.0.1',
        'jest-ua',
      );

      expect(res.user.tenantId).toBe('t-loc');
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('D-02: CONSOLE_API_URL salah (host tidak ada) -> fallback lokal tanpa 500', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, d?: any) =>
        key === 'CONSOLE_API_URL' ? 'http://nonexistent-host:17342' : baseConfigGet(key, d),
      );
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('ENOTFOUND nonexistent-host'));
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'dns@test.com', passwordPlain: 'pass' }, '127.0.0.1', 'jest-ua'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('D-03: CONSOLE_SSO_KEY empty string "" -> mode lokal murni', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, d?: any) =>
        key === 'CONSOLE_SSO_KEY' ? '' : baseConfigGet(key, d),
      );
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-loc',
        email: 'admin@local.com',
        name: 'Admin',
        role: 'manager',
        password: localPassHash,
        tenantId: 't-loc',
        tenant: { id: 't-loc', metadata: {} },
      });

      const res = await service.login(
        { email: 'admin@local.com', passwordPlain: 'localpass' },
        '127.0.0.1',
        'jest-ua',
      );

      expect(res.accessToken).toBeDefined();
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('D-04: Verify dipanggil dengan header Authorization Bearer & X-Forwarded-For', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: false, entitled: false, customerId: null, customerName: null, chatbotTenantId: null },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'hdr@test.com', passwordPlain: 'pw' }, '10.0.0.1', 'jest-ua'),
      ).rejects.toThrow(UnauthorizedException);

      expect(axios.post).toHaveBeenCalledWith(
        'http://console.local/api/integration/v1/sso/verify',
        { email: 'hdr@test.com', password: 'pw' },
        {
          timeout: 3000,
          headers: {
            Authorization: `Bearer ${'k'.repeat(43)}`,
            'X-Forwarded-For': '10.0.0.1',
          },
        },
      );
    });

    it('D-05: link-tenant dipanggil dengan payload { customerId, chatbotTenantId } dan Bearer key', async () => {
      (axios.post as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            valid: true,
            entitled: true,
            customerId: 'cust-123',
            customerName: 'PT 123',
            chatbotTenantId: null,
          },
        })
        .mockResolvedValueOnce({ data: { ok: true } });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'new-tenant-id', metadata: {} });
      mockPrisma.tenant.create.mockResolvedValueOnce({ id: 'new-tenant-id', name: 'PT 123' });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-123',
        email: 'u@123.com',
        name: 'u',
        role: 'manager',
        tenantId: 'new-tenant-id',
        tenant: { id: 'new-tenant-id', metadata: {} },
      });

      await service.login({ email: 'u@123.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua');

      expect(axios.post).toHaveBeenNthCalledWith(
        2,
        'http://console.local/api/integration/v1/sso/link-tenant',
        { customerId: 'cust-123', chatbotTenantId: 'new-tenant-id' },
        { timeout: 3000, headers: { Authorization: `Bearer ${'k'.repeat(43)}` } },
      );
    });
  });

  // =========================================================================
  // E. Trial & Status Subscription
  // =========================================================================
  describe('E. Trial & Status Subscription', () => {
    it('E-01: Trial aktif (belum expired) -> 200', async () => {
      const future = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'c1', customerName: 'T1', chatbotTenantId: 't1' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        id: 't1',
        metadata: { isTrial: true, trialExpiresAt: future },
      });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u1',
        email: 'trial@t1.com',
        name: 'trial',
        role: 'manager',
        tenantId: 't1',
        tenant: { id: 't1', metadata: { isTrial: true, trialExpiresAt: future } },
      });

      const res = await service.login({ email: 'trial@t1.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua');
      expect(res.user.hasSubscription).toBe(true);
    });

    it('E-02: Trial expired -> 403 ForbiddenException & tidak ada AUTH_LOGIN_SUCCESS', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'c1', customerName: 'T1', chatbotTenantId: 't1' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        id: 't1',
        metadata: { isTrial: true, trialExpiresAt: '2020-01-01T00:00:00Z' },
      });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u1',
        email: 'trial@t1.com',
        name: 'trial',
        role: 'manager',
        tenantId: 't1',
        tenant: { id: 't1', metadata: { isTrial: true, trialExpiresAt: '2020-01-01T00:00:00Z' } },
      });

      await expect(
        service.login({ email: 'trial@t1.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.auditLog.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'AUTH_LOGIN_SUCCESS' }) }),
      );
    });

    it('E-03: Trial expired pada local fallback -> 403 ForbiddenException', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'legacy@t1.com',
        role: 'manager',
        password: localPassHash,
        tenantId: 't1',
        tenant: { id: 't1', metadata: { isTrial: true, trialExpiresAt: '2020-01-01T00:00:00Z' } },
      });

      await expect(
        service.login({ email: 'legacy@t1.com', passwordPlain: 'localpass' }, '127.0.0.1', 'ua'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('E-04: Downgrade subscription (entitled=true -> entitled=false) tanpa restart', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'c1', customerName: 'T1', chatbotTenantId: 't1' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'u@t1.com',
        tenantId: 't1',
        tenant: { id: 't1', consoleCustomerId: 'c1', metadata: {} },
      });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 't1', metadata: {} });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u1',
        email: 'u@t1.com',
        name: 'u',
        role: 'manager',
        tenantId: 't1',
        tenant: { id: 't1', metadata: {} },
      });

      const first = await service.login({ email: 'u@t1.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua');
      expect(first.user.hasSubscription).toBe(true);

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, entitled: false, customerId: 'c1', customerName: 'T1', chatbotTenantId: 't1' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'u@t1.com',
        tenantId: 't1',
        tenant: { id: 't1', consoleCustomerId: 'c1', metadata: {} },
      });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 't1', metadata: {} });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u1',
        email: 'u@t1.com',
        name: 'u',
        role: 'manager',
        tenantId: 't1',
        tenant: { id: 't1', metadata: {} },
      });

      const second = await service.login({ email: 'u@t1.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua');
      expect(second.user.hasSubscription).toBe(false);
    });

    it('E-05: Superadmin bypass pengecekan trial expired', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'c-sa', customerName: 'Platform', chatbotTenantId: 't-sa' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        id: 't-sa',
        metadata: { isTrial: true, trialExpiresAt: '2020-01-01T00:00:00Z' },
      });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-sa',
        email: 'superadmin@platform.id',
        name: 'SA',
        role: 'superadmin',
        tenantId: 't-sa',
        tenant: { id: 't-sa', metadata: { isTrial: true, trialExpiresAt: '2020-01-01T00:00:00Z' } },
      });

      const res = await service.login(
        { email: 'superadmin@platform.id', passwordPlain: 'pw' },
        '127.0.0.1',
        'ua',
      );
      expect(res.accessToken).toBeDefined();
    });

    it('E-06: Tenant tanpa metadata trial (metadata={} atau null) -> 200 normal', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'c1', customerName: 'T1', chatbotTenantId: 't1' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 't1', metadata: null });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u1',
        email: 'u@t1.com',
        name: 'u',
        role: 'manager',
        tenantId: 't1',
        tenant: { id: 't1', metadata: null },
      });

      const res = await service.login({ email: 'u@t1.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua');
      expect(res.user.hasSubscription).toBe(true);
    });

    it('E-07: Boundary condition: trialExpiresAt 1ms yang lalu -> 403', async () => {
      const justExpired = new Date(Date.now() - 1).toISOString();
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'c1', customerName: 'T1', chatbotTenantId: 't1' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        id: 't1',
        metadata: { isTrial: true, trialExpiresAt: justExpired },
      });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u1',
        email: 'u@t1.com',
        name: 'u',
        role: 'manager',
        tenantId: 't1',
        tenant: { id: 't1', metadata: { isTrial: true, trialExpiresAt: justExpired } },
      });

      await expect(
        service.login({ email: 'u@t1.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('E-08 (REGRESSI): Tenant paket developer/unlimited dengan sisa metadata isTrial expired -> tetap 200', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'c-dev', customerName: 'Dev', chatbotTenantId: 't-dev' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        id: 't-dev',
        metadata: { plan: 'developer', isTrial: true, trialExpiresAt: '2020-01-01T00:00:00Z' },
      });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-dev',
        email: 'dev@t1.com',
        name: 'dev',
        role: 'manager',
        tenantId: 't-dev',
        tenant: {
          id: 't-dev',
          metadata: { plan: 'developer', isTrial: true, trialExpiresAt: '2020-01-01T00:00:00Z' },
        },
      });

      const res = await service.login({ email: 'dev@t1.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua');
      expect(res.accessToken).toBeDefined();
      expect(res.user.hasSubscription).toBe(true);
    });
  });

  // =========================================================================
  // F. Auto-Provisioning & Idempotency
  // =========================================================================
  describe('F. Auto-Provisioning & Idempotency', () => {
    it('F-01: Auto-provision idempotent saat tenant consoleCustomerId sudah ada -> tenant.create tidak dipanggil lagi', async () => {
      (axios.post as jest.Mock)
        .mockResolvedValueOnce({
          data: { valid: true, entitled: true, customerId: 'cust-exists', customerName: 'Exists', chatbotTenantId: null },
        })
        .mockResolvedValueOnce({ data: {} });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique
        .mockResolvedValueOnce({ id: 'tenant-exists', consoleCustomerId: 'cust-exists' })
        .mockResolvedValueOnce({ id: 'tenant-exists', metadata: {} });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-ex',
        email: 'ex@test.com',
        name: 'ex',
        role: 'manager',
        tenantId: 'tenant-exists',
        tenant: { id: 'tenant-exists', metadata: {} },
      });

      const res = await service.login({ email: 'ex@test.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua');
      expect(res.user.tenantId).toBe('tenant-exists');
      expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
    });

    it('F-02: link-tenant gagal (ECONNREFUSED) -> login tetap berhasil 200', async () => {
      (axios.post as jest.Mock)
        .mockResolvedValueOnce({
          data: { valid: true, entitled: true, customerId: 'cust-net', customerName: 'Net', chatbotTenantId: null },
        })
        .mockRejectedValueOnce(new Error('ECONNREFUSED'));
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 't-net', metadata: {} });
      mockPrisma.tenant.create.mockResolvedValueOnce({ id: 't-net', name: 'Net' });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-net',
        email: 'net@test.com',
        name: 'net',
        role: 'manager',
        tenantId: 't-net',
        tenant: { id: 't-net', metadata: {} },
      });

      const res = await service.login({ email: 'net@test.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua');
      expect(res.accessToken).toBeDefined();
      expect(res.user.tenantId).toBe('t-net');
    });

    it('F-03: customerName null -> tenant dibuat dengan nama default "Toko Baru"', async () => {
      (axios.post as jest.Mock)
        .mockResolvedValueOnce({
          data: { valid: true, entitled: true, customerId: 'cust-noname', customerName: null, chatbotTenantId: null },
        })
        .mockResolvedValueOnce({ data: {} });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 't-noname', metadata: {} });
      mockPrisma.tenant.create.mockResolvedValueOnce({ id: 't-noname', name: 'Toko Baru' });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-nn',
        email: 'nn@test.com',
        name: 'nn',
        role: 'manager',
        tenantId: 't-noname',
        tenant: { id: 't-noname', metadata: {} },
      });

      await service.login({ email: 'nn@test.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua');
      expect(mockPrisma.tenant.create).toHaveBeenCalledWith({
        data: { name: 'Toko Baru', consoleCustomerId: 'cust-noname' },
      });
    });

    it('F-04: Dua user berbeda dari customerId sama login -> memakai tenant yang sama', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { valid: true, entitled: true, customerId: 'cust-shared', customerName: 'Shared', chatbotTenantId: null },
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      let tenantCreated = false;
      mockPrisma.tenant.findUnique.mockImplementation(async () =>
        tenantCreated ? { id: 't-shared', metadata: {} } : null,
      );
      mockPrisma.tenant.create.mockImplementation(async () => {
        tenantCreated = true;
        return { id: 't-shared', name: 'Shared' };
      });
      mockPrisma.user.upsert
        .mockResolvedValueOnce({
          id: 'u-1',
          email: 'owner@shared.com',
          name: 'owner',
          role: 'manager',
          tenantId: 't-shared',
          tenant: { id: 't-shared', metadata: {} },
        })
        .mockResolvedValueOnce({
          id: 'u-2',
          email: 'mgr@shared.com',
          name: 'mgr',
          role: 'manager',
          tenantId: 't-shared',
          tenant: { id: 't-shared', metadata: {} },
        });

      const r1 = await service.login({ email: 'owner@shared.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua');
      const r2 = await service.login({ email: 'mgr@shared.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua');

      expect(r1.user.tenantId).toBe('t-shared');
      expect(r2.user.tenantId).toBe('t-shared');
    });

    it('F-05: chatbotTenantId valid & user sudah ada di tenant sama -> upsert tidak duplikat', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'c1', customerName: 'ABC', chatbotTenantId: 't-abc' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-abc',
        email: 'owner@abc.com',
        tenantId: 't-abc',
      });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 't-abc', metadata: {} });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-abc',
        email: 'owner@abc.com',
        name: 'owner',
        role: 'manager',
        tenantId: 't-abc',
        tenant: { id: 't-abc', metadata: {} },
      });

      const res = await service.login({ email: 'owner@abc.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua');
      expect(res.user.tenantId).toBe('t-abc');
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'owner@abc.com' },
          update: { tenantId: 't-abc' },
        }),
      );
    });

    it('F-06: Password tidak disimpan di DB untuk user SSO (password="") dan tidak bisa dipakai fallback', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'c1', customerName: 'ABC', chatbotTenantId: 't-abc' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 't-abc', metadata: {} });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-sso',
        email: 'sso@abc.com',
        name: 'sso',
        role: 'manager',
        tenantId: 't-abc',
        tenant: { id: 't-sso', metadata: {} },
      });

      await service.login({ email: 'sso@abc.com', passwordPlain: 'secret' }, '127.0.0.1', 'ua');
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ password: '' }),
        }),
      );

      // Saat Console mati, user dengan password '' tidak boleh lolos fallback
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-sso',
        email: 'sso@abc.com',
        password: '',
        tenantId: 't-abc',
      });
      await expect(
        service.login({ email: 'sso@abc.com', passwordPlain: '' }, '127.0.0.1', 'ua'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // H. Multi-Device & Concurrency (Service Layer)
  // =========================================================================
  describe('H. Multi-Device & Concurrency (Service Layer)', () => {
    it('H-03 & H-04: Login dari 2 IP berbeda -> 2 refresh token & 2 audit log IP masing-masing', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { valid: true, entitled: true, customerId: 'c1', customerName: 'T1', chatbotTenantId: 't1' },
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', metadata: {} });
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'u1',
        email: 'multi@t1.com',
        name: 'multi',
        role: 'manager',
        tenantId: 't1',
        tenant: { id: 't1', metadata: {} },
      });

      await Promise.all([
        service.login({ email: 'multi@t1.com', passwordPlain: 'pw' }, '10.0.0.1', 'Chrome'),
        service.login({ email: 'multi@t1.com', passwordPlain: 'pw' }, '10.0.0.2', 'Edge'),
      ]);

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ipAddress: '10.0.0.1', userAgent: 'Chrome', action: 'AUTH_LOGIN_SUCCESS' }),
        }),
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ipAddress: '10.0.0.2', userAgent: 'Edge', action: 'AUTH_LOGIN_SUCCESS' }),
        }),
      );
    });

    it('H-05: Concurrent token refresh -> rotasi tunggal, pemanggilan kedua gagal 401', async () => {
      const tokenHash = await bcrypt.hash('rt-plain-1', 4);
      let deleted = false;
      mockPrisma.refreshToken.findFirst.mockImplementation(async () =>
        deleted ? null : { id: 'rt-1', userId: 'u1', tokenHash, expiresAt: new Date(Date.now() + 60000) },
      );
      mockPrisma.refreshToken.delete.mockImplementation(async () => {
        deleted = true;
        return {};
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'u1@t1.com',
        role: 'manager',
        deletedAt: null,
      });

      const first = await service.refreshTokens('u1', 'rt-plain-1');
      expect(first.accessToken).toBeDefined();
      expect(first.refreshToken).toBeDefined();

      await expect(service.refreshTokens('u1', 'rt-plain-1')).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // I. Token & Session Management
  // =========================================================================
  describe('I. Token & Session Management', () => {
    it('I-02: Refresh token expired -> 401 & record dihapus dari DB', async () => {
      const tokenHash = await bcrypt.hash('rt-expired', 4);
      mockPrisma.refreshToken.findFirst.mockResolvedValueOnce({
        id: 'rt-exp',
        userId: 'u1',
        tokenHash,
        expiresAt: new Date(Date.now() - 1000),
      });
      mockPrisma.refreshToken.delete.mockResolvedValueOnce({});

      await expect(service.refreshTokens('u1', 'rt-expired')).rejects.toThrow('Sesi telah kedaluwarsa.');
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-exp' } });
    });

    it('I-03: Refresh token tidak ada di DB / tidak cocok -> 401 "Sesi tidak valid."', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValueOnce(null);
      await expect(service.refreshTokens('u1', 'rt-missing')).rejects.toThrow('Sesi tidak valid.');
    });

    it('I-04: Logout menghapus semua refresh token user', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValueOnce({ count: 2 });
      const res = await service.logout('u1');
      expect(res.success).toBe(true);
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    });

    it('I-05 & I-06: JWT payload berisi sub, email, roles, tenantId, hasSubscription & berubah real-time', async () => {
      // Login #1 unsubscribed
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, entitled: false, customerId: 'c1', customerName: 'T1', chatbotTenantId: 't1' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 't1', metadata: {} });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-jwt',
        email: 'jwt@t1.com',
        name: 'jwt',
        role: 'manager',
        tenantId: 't1',
        tenant: { id: 't1', metadata: {} },
      });

      const res1 = await service.login({ email: 'jwt@t1.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua');
      const decoded1 = jwtService.decode(res1.accessToken) as any;
      expect(decoded1).toMatchObject({
        sub: 'u-jwt',
        email: 'jwt@t1.com',
        roles: ['manager'],
        tenantId: 't1',
        hasSubscription: false,
      });

      // Login #2 entitled
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'c1', customerName: 'T1', chatbotTenantId: 't1' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-jwt',
        email: 'jwt@t1.com',
        tenantId: 't1',
        tenant: { id: 't1', consoleCustomerId: 'c1', metadata: {} },
      });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 't1', metadata: {} });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-jwt',
        email: 'jwt@t1.com',
        name: 'jwt',
        role: 'manager',
        tenantId: 't1',
        tenant: { id: 't1', metadata: {} },
      });

      const res2 = await service.login({ email: 'jwt@t1.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua');
      const decoded2 = jwtService.decode(res2.accessToken) as any;
      expect(decoded2.hasSubscription).toBe(true);
    });
  });

  // =========================================================================
  // J. Edge Case & Chaos
  // =========================================================================
  describe('J. Edge Case & Chaos', () => {
    it('J-01: Console mengembalikan HTTP 500 -> fallback lokal tanpa crash 500', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce({ response: { status: 500 } });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'e500@test.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('J-02: Console redirect / network error -> fallback lokal aman', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('ERR_TOO_MANY_REDIRECTS'));
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'redir@test.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('J-03: Email dengan karakter khusus (user+tag@sub.domain.co.id) diteruskan apa adanya', async () => {
      const specialEmail = 'user+tag@sub.domain.co.id';
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'c-sp', customerName: 'SP', chatbotTenantId: 't-sp' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 't-sp', metadata: {} });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-sp',
        email: specialEmail,
        name: 'user+tag',
        role: 'manager',
        tenantId: 't-sp',
        tenant: { id: 't-sp', metadata: {} },
      });

      const res = await service.login({ email: specialEmail, passwordPlain: 'pw' }, '127.0.0.1', 'ua');
      expect(res.user.email).toBe(specialEmail);
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        { email: specialEmail, password: 'pw' },
        expect.anything(),
      );
    });

    it('J-04: Password dengan karakter khusus / Unicode / XSS string diteruskan apa adanya ke Console', async () => {
      const specialPw = 'P@ssw0rd!パスワード<script>alert(1)</script>';
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'c-sp', customerName: 'SP', chatbotTenantId: 't-sp' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 't-sp', metadata: {} });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-sp',
        email: 'sp@test.com',
        name: 'sp',
        role: 'manager',
        tenantId: 't-sp',
        tenant: { id: 't-sp', metadata: {} },
      });

      const res = await service.login({ email: 'sp@test.com', passwordPlain: specialPw }, '127.0.0.1', 'ua');
      expect(res.accessToken).toBeDefined();
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        { email: 'sp@test.com', password: specialPw },
        expect.anything(),
      );
    });

    it('J-06: DB down saat user.findUnique setelah Console verify valid -> error bersih tanpa link-tenant', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'c1', customerName: 'T1', chatbotTenantId: null },
      });
      mockPrisma.user.findUnique.mockRejectedValueOnce(new Error('P1001: Can\'t reach database server'));

      await expect(
        service.login({ email: 'dbdown@test.com', passwordPlain: 'pw' }, '127.0.0.1', 'ua'),
      ).rejects.toThrow('Can\'t reach database server');

      expect(axios.post).toHaveBeenCalledTimes(1); // link-tenant tidak dipanggil
    });

    it('J-07: Audit log lengkap mencatat ipAddress, userAgent, emailAttempt, reason untuk login gagal', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: false, entitled: false, customerId: null, customerName: null, chatbotTenantId: null },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'audit@test.com', passwordPlain: 'wrong' }, '203.0.113.5', 'Mozilla/5.0'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'AUTH_LOGIN_FAILED',
          module: 'AUTHENTICATION',
          endpoint: 'POST /auth/login',
          ipAddress: '203.0.113.5',
          userAgent: 'Mozilla/5.0',
          status: 'FAILED',
          details: expect.objectContaining({
            emailAttempt: 'audit@test.com',
            reason: expect.any(String),
          }),
        }),
      });
    });
  });
});
