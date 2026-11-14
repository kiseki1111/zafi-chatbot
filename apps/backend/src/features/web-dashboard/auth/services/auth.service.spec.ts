import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('mock_hash'),
}));

jest.mock('axios');

describe('AuthService', () => {
  let service: AuthService;
  const originalEnv = process.env.SECURITY_BYPASS_MODE;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
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
    if (key === 'JWT_ACCESS_SECRET') return 'secret';
    if (key === 'JWT_REFRESH_SECRET') return 'refresh_secret';
    return defaultValue ?? null;
  };

  const mockConfigService = {
    get: jest.fn(baseConfigGet),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (axios.post as jest.Mock).mockReset();
    process.env.SECURITY_BYPASS_MODE = 'false';

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

  afterAll(() => {
    process.env.SECURITY_BYPASS_MODE = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await expect(
        service.login(
          { email: 'notfound@example.com', passwordPlain: 'password123' },
          '127.0.0.1',
          'jest-agent',
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'user@example.com',
        password: 'hashed_password',
        role: 'USER',
        deletedAt: null,
      });
      mockPrisma.auditLog.create.mockResolvedValue({});
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login(
          { email: 'user@example.com', passwordPlain: 'wrongpassword' },
          '127.0.0.1',
          'jest-agent',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens and user payload on successful login', async () => {
      const dummyUser = {
        id: 'u1',
        email: 'user@example.com',
        name: 'Test User',
        password: 'hashed_password',
        role: 'ADMIN',
        tenantId: 'tenant-123',
        deletedAt: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(dummyUser);
      mockPrisma.user.update.mockResolvedValue(dummyUser);
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('mock_hash');

      const result = await service.login(
        { email: 'user@example.com', passwordPlain: 'correctpassword' },
        '127.0.0.1',
        'jest-agent',
      );

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('jwt_token_sample');
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.tenantId).toBe('tenant-123');
    });
  });

  describe('login via SSO Console (CONSOLE_SSO_KEY diisi)', () => {
    const SSO_KEY = 'k'.repeat(40);

    beforeEach(() => {
      (mockConfigService.get as jest.Mock).mockImplementation(
        (key: string, defaultValue?: string) => {
          if (key === 'CONSOLE_SSO_KEY') return SSO_KEY;
          if (key === 'CONSOLE_API_URL') return 'http://console.local';
          return baseConfigGet(key, defaultValue);
        },
      );
    });

    afterEach(() => {
      (mockConfigService.get as jest.Mock).mockImplementation(baseConfigGet);
    });

    it('REGRESSI: Console valid tapi pelanggan belum ditautkan (chatbotTenantId null) tidak boleh membajak user lokal dengan email sama di tenant lain', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { valid: true, chatbotTenantId: null },
      });
      // User lokal ini milik tenant lain, dibuat sebelum SSO ada; password Console tidak dikenalnya.
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'victim-1',
        email: 'owner@tokoA.com',
        password: 'hashed_password_asli_victim',
        role: 'manager',
        tenantId: 'tenant-victim',
        deletedAt: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // password attacker != password lokal victim
      mockPrisma.auditLog.create.mockResolvedValue({});

      await expect(
        service.login(
          { email: 'owner@tokoA.com', passwordPlain: 'password-attacker' },
          '127.0.0.1',
          'jest-agent',
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    });

    it('Console valid dan pelanggan sudah ditautkan ke tenant yang ada: login berhasil memakai tenant itu', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { valid: true, chatbotTenantId: 'tenant-linked' },
      });
      mockPrisma.user.findUnique.mockResolvedValue(null); // belum pernah login lewat chatbot ini
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-linked' });
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
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'owner@linked.com' },
        }),
      );
    });

    it('Console tidak terjangkau: jatuh ke pengecekan password lokal seperti biasa', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'user@example.com',
        password: 'hashed_password',
        role: 'manager',
        tenantId: 'tenant-123',
        deletedAt: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.login(
        { email: 'user@example.com', passwordPlain: 'correctpassword' },
        '127.0.0.1',
        'jest-agent',
      );

      expect(result.user.tenantId).toBe('tenant-123');
      expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    });
  });
});
