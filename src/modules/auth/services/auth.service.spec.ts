import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
      if (key === 'JWT_ACCESS_EXPIRES') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES') return '30d';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('login()', () => {
    it('Harus mengembalikan accessToken dan refreshToken jika kredensial valid', async () => {
      console.log('--- Menjalankan Test: login() Sukses ---');
      const dto = { email: 'test@example.com', passwordPlain: 'password123' };
      const ipAddress = '127.0.0.1';
      const userAgent = 'Jest-Test';

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        userRoles: [{ role: { name: 'USER' } }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
      mockJwtService.signAsync.mockResolvedValueOnce('mock-access-token');
      mockJwtService.signAsync.mockResolvedValueOnce('mock-refresh-token');

      const result = await authService.login(dto, ipAddress, userAgent);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: { id: mockUser.id, email: mockUser.email, name: mockUser.name },
      });

      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          tokenHash: 'hashed-refresh-token',
        }),
      });

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'SUCCESS' }),
      });
      console.log('✅ Berhasil: Return token dan catat status SUCCESS di AuditLog.');
    });

    it('Harus melempar error UnauthorizedException jika kredensial salah', async () => {
      console.log('--- Menjalankan Test: login() Gagal (Kredensial Salah) ---');
      const dto = { email: 'test@example.com', passwordPlain: 'wrongpassword' };
      
      mockPrismaService.user.findUnique.mockResolvedValue({ password: 'hashedpassword' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(dto, '127.0.0.1', 'Jest-Test')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'FAILED' }),
      });
      console.log('✅ Berhasil: Melempar error dan catat status FAILED di AuditLog.');
    });
  });

  describe('refreshTokens()', () => {
    it('Harus mengembalikan token baru jika refresh token valid', async () => {
      console.log('--- Menjalankan Test: refreshTokens() Sukses (Rotasi Tunggal) ---');
      
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        userRoles: [{ role: { name: 'USER' } }],
      };

      mockPrismaService.refreshToken.findFirst.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hashed-refresh-token',
      });
      
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-refresh-token');
      
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValueOnce('new-access-token');
      mockJwtService.signAsync.mockResolvedValueOnce('new-refresh-token');

      const result = await authService.refreshTokens('user-1', 'plain-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-1' },
      });

      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          tokenHash: 'new-hashed-refresh-token',
        }),
      });
      console.log('✅ Berhasil: Hapus token lama dan buat token baru (Rotasi Berhasil).');
    });
  });

  describe('logout()', () => {
    it('Harus menghapus semua refresh token milik user', async () => {
      console.log('--- Menjalankan Test: logout() Sukses ---');
      
      const result = await authService.logout('user-1');

      expect(result).toEqual({ success: true, message: 'Anda telah berhasil keluar dari sistem.' });
      
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      console.log('✅ Berhasil: Menghapus data sesi (refresh token) milik user di database.');
    });
  });
});
