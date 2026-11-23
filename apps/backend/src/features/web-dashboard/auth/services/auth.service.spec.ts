import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import axios from 'axios';
import * as bcrypt from 'bcrypt';

jest.mock('axios');

// Lihat juga auth.service.federation.spec.ts untuk kasus Console-as-source-of-truth yang lebih rinci.
describe('AuthService.login (Console adalah satu-satunya sumber kredensial, auto-provisioning ala Google)', () => {
  let service: AuthService;

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
    },
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('jwt_token_sample'),
  };

  const baseConfigGet = (key: string, defaultValue?: string) => {
    const defaults: Record<string, string> = {
      JWT_ACCESS_SECRET: 'secret',
      JWT_REFRESH_SECRET: 'refresh_secret',
      CONSOLE_SSO_KEY: 'k'.repeat(40),
      CONSOLE_API_URL: 'http://console.local',
    };
    return defaults[key] ?? defaultValue ?? null;
  };

  const mockConfigService = {
    get: jest.fn(baseConfigGet),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (axios.post as jest.Mock).mockReset();
    (mockConfigService.get as jest.Mock).mockImplementation(baseConfigGet);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('Console menolak kredensial (valid=false) -> UnauthorizedException, tidak pernah upsert user', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: { valid: false, entitled: false, customerId: null, customerName: null, chatbotTenantId: null },
    });
    mockPrisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.login(
        { email: 'notfound@example.com', passwordPlain: 'password123' },
        '127.0.0.1',
        'jest-agent',
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
  });

  it('Console: valid tapi tidak entitled (belum subscribe) -> ditolak, tidak auto-provisioning apapun', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: { valid: true, entitled: false, customerId: 'cust-1', customerName: 'PT Belum Bayar', chatbotTenantId: null },
    });
    mockPrisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.login(
        { email: 'belum-bayar@example.com', passwordPlain: 'apapun' },
        '127.0.0.1',
        'jest-agent',
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
  });

  it('Console tidak terjangkau (timeout/ECONNREFUSED) -> login gagal, TIDAK ADA fallback lokal', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
    mockPrisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.login(
        { email: 'user@example.com', passwordPlain: 'correctpassword' },
        '127.0.0.1',
        'jest-agent',
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockPrisma.tenant.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
  });

  it('CONSOLE_SSO_KEY tidak diset -> login selalu gagal (fitur federasi mati)', async () => {
    (mockConfigService.get as jest.Mock).mockImplementation((key: string) =>
      key === 'CONSOLE_SSO_KEY' ? null : baseConfigGet(key),
    );
    mockPrisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.login(
        { email: 'user@example.com', passwordPlain: 'apapun' },
        '127.0.0.1',
        'jest-agent',
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('entitled dan sudah pernah tertaut (chatbotTenantId ada): langsung pakai tenant itu, tidak auto-provisioning', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: { valid: true, entitled: true, customerId: 'cust-1', customerName: 'PT Lama', chatbotTenantId: 'tenant-linked' },
    });
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-linked' });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.upsert.mockResolvedValue({
      id: 'u-new',
      email: 'owner@linked.com',
      name: 'owner',
      role: 'manager',
      tenantId: 'tenant-linked',
      tenant: { id: 'tenant-linked', metadata: {} },
    });
    mockPrisma.refreshToken.create.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await service.login(
      { email: 'owner@linked.com', passwordPlain: 'apapun' },
      '127.0.0.1',
      'jest-agent',
    );

    expect(result.user.tenantId).toBe('tenant-linked');
    expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
    // Hanya 1 panggilan axios (verify) -- tidak ada link-tenant karena sudah tertaut sebelumnya.
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it('entitled TAPI belum pernah tertaut (login pertama ala Google): auto-create tenant + lapor ke Console', async () => {
    (axios.post as jest.Mock)
      .mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'cust-baru', customerName: 'PT Baru', chatbotTenantId: null },
      })
      .mockResolvedValueOnce({}); // POST link-tenant

    mockPrisma.tenant.findUnique
      .mockResolvedValueOnce(null) // autoProvisionTenant: belum ada tenant dgn consoleCustomerId ini
      .mockResolvedValueOnce({ id: 'tenant-auto', metadata: {} }); // login(): cek tenant hasil provisioning
    mockPrisma.tenant.create.mockResolvedValue({ id: 'tenant-auto', name: 'PT Baru' });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.upsert.mockResolvedValue({
      id: 'u-baru',
      email: 'owner@baru.com',
      name: 'owner',
      role: 'manager',
      tenantId: 'tenant-auto',
      tenant: { id: 'tenant-auto', metadata: {} },
    });
    mockPrisma.refreshToken.create.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await service.login(
      { email: 'owner@baru.com', passwordPlain: 'apapun' },
      '127.0.0.1',
      'jest-agent',
    );

    expect(result.user.tenantId).toBe('tenant-auto');
    expect(mockPrisma.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'PT Baru', consoleCustomerId: 'cust-baru' } }),
    );
    expect(axios.post).toHaveBeenCalledWith(
      'http://console.local/api/integration/v1/sso/link-tenant',
      { customerId: 'cust-baru', chatbotTenantId: 'tenant-auto' },
      expect.anything(),
    );
  });

  it('entitled, belum tertaut, TAPI tenant sudah pernah dibuat sebelumnya (idempotent, laporan ke Console gagal sebelumnya): dipakai ulang, tidak membuat tenant dobel', async () => {
    (axios.post as jest.Mock)
      .mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'cust-retry', customerName: 'PT Retry', chatbotTenantId: null },
      })
      .mockRejectedValueOnce(new Error('masih gagal lapor')); // link-tenant gagal lagi, tidak boleh membatalkan login

    mockPrisma.tenant.findUnique
      .mockResolvedValueOnce({ id: 'tenant-sudah-ada' }) // autoProvisionTenant: ketemu by consoleCustomerId
      .mockResolvedValueOnce({ id: 'tenant-sudah-ada', metadata: {} });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.upsert.mockResolvedValue({
      id: 'u-retry',
      email: 'owner@retry.com',
      name: 'owner',
      role: 'manager',
      tenantId: 'tenant-sudah-ada',
      tenant: { id: 'tenant-sudah-ada', metadata: {} },
    });
    mockPrisma.refreshToken.create.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await service.login(
      { email: 'owner@retry.com', passwordPlain: 'apapun' },
      '127.0.0.1',
      'jest-agent',
    );

    expect(result.user.tenantId).toBe('tenant-sudah-ada');
    expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
  });

  it('REGRESSI anti-hijack: email sudah dipakai user lokal di tenant LAIN tidak pernah dipindahkan diam-diam', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: { valid: true, entitled: true, customerId: 'cust-2', customerName: 'PT Dua', chatbotTenantId: 'tenant-2' },
    });
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-2' });
    // User ini sudah ada di tenant LAIN (data lama / kebetulan email sama di Console customer lain).
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'victim-1',
      email: 'owner@tokoA.com',
      tenantId: 'tenant-victim-lama',
    });
    mockPrisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.login(
        { email: 'owner@tokoA.com', passwordPlain: 'apapun' },
        '127.0.0.1',
        'jest-agent',
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
  });

  it('REGRESSI (bug ditemukan saat simulasi audit): belum tertaut + email sudah dipakai tenant lain -> ditolak TANPA membuat tenant baru atau lapor ke Console', async () => {
    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: { valid: true, entitled: true, customerId: 'cust-collision', customerName: 'PT Collision', chatbotTenantId: null },
    });
    // Email ini sudah dipakai user lokal di tenant lain (data lama pra-SSO) -- Console BELUM pernah
    // menautkan customer ini (chatbotTenantId null), jadi tanpa fix ini auto-provisioning akan
    // membuat tenant baru + melapor ke Console SEBELUM baru ketahuan harus ditolak.
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'victim-legacy',
      email: 'owner@legacy.com',
      tenantId: 'tenant-legacy-lama',
    });
    mockPrisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.login(
        { email: 'owner@legacy.com', passwordPlain: 'apapun' },
        '127.0.0.1',
        'jest-agent',
      ),
    ).rejects.toThrow(UnauthorizedException);

    // Efek samping yang TIDAK BOLEH terjadi: tidak ada tenant baru dibuat, tidak ada panggilan
    // link-tenant ke Console (hanya 1 panggilan axios -- verify saja), tidak ada upsert user.
    expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
  });

  it('tenant hasil auto-provisioning hilang sebelum dipakai (race/data hilang): ForbiddenException', async () => {
    (axios.post as jest.Mock)
      .mockResolvedValueOnce({
        data: { valid: true, entitled: true, customerId: 'cust-x', customerName: 'PT X', chatbotTenantId: null },
      })
      .mockResolvedValueOnce({});

    mockPrisma.tenant.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null); // seharusnya ada, tapi tidak -- harus gagal aman
    mockPrisma.tenant.create.mockResolvedValue({ id: 'tenant-hilang' });
    mockPrisma.user.findUnique.mockResolvedValue(null); // belum ada user lokal -- bukan ini yang diuji
    mockPrisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.login(
        { email: 'owner@x.com', passwordPlain: 'apapun' },
        '127.0.0.1',
        'jest-agent',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  describe('fallback password lokal (akun pra-SSO yang belum dikenal/ditautkan Console)', () => {
    it('Console tidak mengenali email, tapi hash password lokal cocok -> login berhasil pakai tenant lama, TANPA sentuh Console/tenant SSO', async () => {
      const hash = await bcrypt.hash('passwordLamaSaya', 10);
      (axios.post as jest.Mock).mockResolvedValue({
        data: { valid: false, entitled: false, customerId: null, customerName: null, chatbotTenantId: null },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'legacy-user',
        email: 'lama@tokoA.com',
        name: 'Toko A',
        role: 'manager',
        password: hash,
        tenantId: 'tenant-lama',
        tenant: { id: 'tenant-lama', metadata: {} },
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login(
        { email: 'lama@tokoA.com', passwordPlain: 'passwordLamaSaya' },
        '127.0.0.1',
        'jest-agent',
      );

      expect(result.user.tenantId).toBe('tenant-lama');
      expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
      // issueSession tetap mencatat AUTH_LOGIN_SUCCESS seperti login biasa; yang TIDAK boleh
      // terjadi adalah panggilan ke Console link-tenant (hanya 1 panggilan axios -- verify saja).
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it('Console tidak mengenali email DAN password lokal salah -> tetap ditolak + audit log tercatat', async () => {
      const hash = await bcrypt.hash('passwordLamaSaya', 10);
      (axios.post as jest.Mock).mockResolvedValue({
        data: { valid: false, entitled: false, customerId: null, customerName: null, chatbotTenantId: null },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'legacy-user',
        email: 'lama@tokoA.com',
        name: 'Toko A',
        role: 'manager',
        password: hash,
        tenantId: 'tenant-lama',
        tenant: { id: 'tenant-lama', metadata: {} },
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await expect(
        service.login(
          { email: 'lama@tokoA.com', passwordPlain: 'passwordSALAH' },
          '127.0.0.1',
          'jest-agent',
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('INSIDEN (2026-11-23): skema DB belum sinkron (prisma db push gagal) -> query fallback lempar error, login tetap balas 401 bersih, bukan 500', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { valid: false, entitled: false, customerId: null, customerName: null, chatbotTenantId: null },
      });
      mockPrisma.user.findUnique.mockRejectedValue(
        new Error('The column `(not available)` does not exist in the current database.'),
      );
      mockPrisma.auditLog.create.mockResolvedValue({});

      await expect(
        service.login(
          { email: 'zaftech@gmail.com', passwordPlain: 'apapun' },
          '127.0.0.1',
          'jest-agent',
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('akun murni-SSO (password kosong ") tidak pernah dicoba fallback -- bcrypt.compare tidak dipanggil ke hash kosong', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { valid: false, entitled: false, customerId: null, customerName: null, chatbotTenantId: null },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'sso-user',
        email: 'baru@tokoB.com',
        name: 'Toko B',
        role: 'manager',
        password: '',
        tenantId: 'tenant-baru',
        tenant: { id: 'tenant-baru', metadata: {} },
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await expect(
        service.login(
          { email: 'baru@tokoB.com', passwordPlain: 'apapun' },
          '127.0.0.1',
          'jest-agent',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('fallback lokal tetap menghormati trial 14 hari kedaluwarsa -> ForbiddenException', async () => {
      const hash = await bcrypt.hash('passwordLamaSaya', 10);
      (axios.post as jest.Mock).mockResolvedValue({
        data: { valid: false, entitled: false, customerId: null, customerName: null, chatbotTenantId: null },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'legacy-trial-user',
        email: 'trial@tokoC.com',
        name: 'Toko C',
        role: 'manager',
        password: hash,
        tenantId: 'tenant-trial',
        tenant: {
          id: 'tenant-trial',
          metadata: { isTrial: true, trialExpiresAt: '2020-01-01T00:00:00.000Z' },
        },
      });

      await expect(
        service.login(
          { email: 'trial@tokoC.com', passwordPlain: 'passwordLamaSaya' },
          '127.0.0.1',
          'jest-agent',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
