import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('mock_hash'),
}));

describe('AuthService', () => {
  let service: AuthService;
  const originalEnv = process.env.SECURITY_BYPASS_MODE;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
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

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'secret';
      if (key === 'JWT_REFRESH_SECRET') return 'refresh_secret';
      return defaultValue ?? null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
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
});
