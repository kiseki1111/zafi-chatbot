import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HrisService } from './hris.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import axios from 'axios';

jest.mock('axios');

describe('HrisService - resolusi per-tenant lewat SSO Console, fail-closed', () => {
  let service: HrisService;
  let prisma: { tenant: { findUnique: jest.Mock }; auditLog: { findMany: jest.Mock } };

  const CONSOLE_URL = 'http://console.test';
  const SSO_KEY = 'console-sso-key';

  function build(envOverrides: Record<string, string | undefined> = {}) {
    const env: Record<string, string | undefined> = {
      CONSOLE_SSO_KEY: SSO_KEY,
      CONSOLE_API_URL: CONSOLE_URL,
      ...envOverrides,
    };
    const config = { get: (key: string) => env[key] };
    prisma = {
      tenant: { findUnique: jest.fn() },
      auditLog: { findMany: jest.fn() },
    };

    return Test.createTestingModule({
      providers: [
        HrisService,
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .compile()
      .then((m: TestingModule) => m.get<HrisService>(HrisService));
  }

  const mockConsoleAllowed = () => {
    (axios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/sso/hris-access/')) {
        return Promise.resolve({
          data: { allowed: true, hrisUrl: 'http://hris-tenant-a.test', secret: 'secret-tenant-a', message: null },
        });
      }
      return Promise.reject(new Error(`URL tak terduga di test: ${url}`));
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('tenantId null (tidak login / tidak terikat tenant)', () => {
    beforeEach(async () => {
      service = await build();
    });

    it('getHealth() tidak pernah menghubungi Console atau HRIS, balas DISABLED', async () => {
      const result = await service.getHealth(null);
      expect(axios.get).not.toHaveBeenCalled();
      expect(result).toMatchObject({ success: false, status: 'DISABLED' });
    });

    it('getCutiBalance() gagal aman tanpa memanggil siapa pun', async () => {
      const result = await service.getCutiBalance(null, 'NIK001');
      expect(axios.get).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });
  });

  describe('tenant belum ditautkan ke Console (consoleCustomerId null)', () => {
    beforeEach(async () => {
      service = await build();
      prisma.tenant.findUnique.mockResolvedValue({ consoleCustomerId: null });
    });

    it('getEmployeesList() gagal aman tanpa memanggil Console', async () => {
      const result = await service.getEmployeesList('tenant-x');
      expect(axios.get).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, data: [], message: expect.stringContaining('belum dikonfigurasi') });
    });
  });

  describe('CONSOLE_SSO_KEY belum diset', () => {
    beforeEach(async () => {
      service = await build({ CONSOLE_SSO_KEY: undefined });
      prisma.tenant.findUnique.mockResolvedValue({ consoleCustomerId: 'cust-1' });
    });

    it('getSlipGaji() gagal aman, tidak pernah memanggil Console', async () => {
      const result = await service.getSlipGaji('tenant-x', 'NIK001');
      expect(axios.get).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });
  });

  describe('Console membalas tidak diizinkan (langganan HRIS tidak aktif)', () => {
    beforeEach(async () => {
      service = await build();
      prisma.tenant.findUnique.mockResolvedValue({ consoleCustomerId: 'cust-1' });
      (axios.get as jest.Mock).mockResolvedValue({
        data: { allowed: false, hrisUrl: null, secret: null, message: 'tidak aktif' },
      });
    });

    it('getPresensiSummary() gagal aman, tidak pernah mencoba menghubungi HRIS', async () => {
      const result = await service.getPresensiSummary('tenant-x', 'NIK001');
      expect(axios.get).toHaveBeenCalledTimes(1); // hanya ke Console, bukan ke HRIS
      expect(result.success).toBe(false);
    });
  });

  describe('Console mengizinkan: resolusi per-tenant berhasil', () => {
    beforeEach(async () => {
      service = await build();
      prisma.tenant.findUnique.mockResolvedValue({ consoleCustomerId: 'cust-1' });
      mockConsoleAllowed();
    });

    it('bertanya ke Console dengan customerId tenant ini, bukan tenant lain', async () => {
      await service.getHealth('tenant-a');
      expect(axios.get).toHaveBeenCalledWith(
        `${CONSOLE_URL}/api/integration/v1/sso/hris-access/cust-1`,
        expect.objectContaining({ headers: { Authorization: `Bearer ${SSO_KEY}` } }),
      );
    });

    it('getEmployeesList() lalu memanggil HRIS tenant ini dengan secret turunan tenant ini', async () => {
      (axios.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/sso/hris-access/')) {
          return Promise.resolve({
            data: { allowed: true, hrisUrl: 'http://hris-tenant-a.test', secret: 'secret-tenant-a', message: null },
          });
        }
        return Promise.resolve({ data: { success: true, data: [{ nik: 'NIK001' }] } });
      });

      const result = await service.getEmployeesList('tenant-a');

      expect(axios.get).toHaveBeenCalledWith(
        'http://hris-tenant-a.test/api/assistant/karyawan/list',
        expect.objectContaining({ headers: expect.objectContaining({ 'X-Assistant-Key': 'secret-tenant-a' }) }),
      );
      expect(result).toEqual({ success: true, data: [{ nik: 'NIK001' }] });
    });

    it('getDailyAttendance() memanggil jalur /api/integration/v1/assistant, bukan /api/assistant', async () => {
      (axios.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/sso/hris-access/')) {
          return Promise.resolve({
            data: { allowed: true, hrisUrl: 'http://hris-tenant-a.test', secret: 'secret-tenant-a', message: null },
          });
        }
        return Promise.resolve({ data: { ringkasan: { hadir: 10 } } });
      });

      await service.getDailyAttendance('tenant-a', '2026-11-20');

      expect(axios.get).toHaveBeenCalledWith(
        'http://hris-tenant-a.test/api/integration/v1/assistant/attendance/daily',
        expect.objectContaining({ params: { date: '2026-11-20' } }),
      );
    });

    it('resolusi dicache sebentar: dua panggilan berurutan untuk tenant yang sama hanya menghubungi Console sekali', async () => {
      (axios.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/sso/hris-access/')) {
          return Promise.resolve({
            data: { allowed: true, hrisUrl: 'http://hris-tenant-a.test', secret: 'secret-tenant-a', message: null },
          });
        }
        return Promise.resolve({ data: { success: true, data: [] } });
      });

      await service.getEmployeesList('tenant-a');
      await service.getEmployeesList('tenant-a');

      const consoleCalls = (axios.get as jest.Mock).mock.calls.filter(([url]) => url.includes('/sso/hris-access/'));
      expect(consoleCalls).toHaveLength(1);
    });

    it('HRIS down/timeout setelah resolusi berhasil: dibalas gagal aman, bukan exception', async () => {
      (axios.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/sso/hris-access/')) {
          return Promise.resolve({
            data: { allowed: true, hrisUrl: 'http://hris-tenant-a.test', secret: 'secret-tenant-a', message: null },
          });
        }
        return Promise.reject(new Error('ECONNREFUSED'));
      });
      const result = await service.getSlipGaji('tenant-a', 'NIK001');
      expect(result).toEqual({ success: false, message: 'ECONNREFUSED' });
    });
  });

  describe('dua tenant berbeda tidak pernah berbagi resolusi (anti data-leak)', () => {
    beforeEach(async () => {
      service = await build();
    });

    it('tenant-a dan tenant-b dipanggil ke customerId dan baseUrl masing-masing', async () => {
      prisma.tenant.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve({ consoleCustomerId: where.id === 'tenant-a' ? 'cust-a' : 'cust-b' }),
      );
      (axios.get as jest.Mock).mockImplementation((url: string) => {
        if (url.endsWith('/sso/hris-access/cust-a')) {
          return Promise.resolve({ data: { allowed: true, hrisUrl: 'http://hris-a.test', secret: 'secret-a', message: null } });
        }
        if (url.endsWith('/sso/hris-access/cust-b')) {
          return Promise.resolve({ data: { allowed: true, hrisUrl: 'http://hris-b.test', secret: 'secret-b', message: null } });
        }
        return Promise.resolve({ data: { success: true, data: [] } });
      });

      await service.getEmployeesList('tenant-a');
      await service.getEmployeesList('tenant-b');

      const hrisCalls = (axios.get as jest.Mock).mock.calls.filter(([url]) => url.includes('/karyawan/list'));
      expect(hrisCalls[0][0]).toBe('http://hris-a.test/api/assistant/karyawan/list');
      expect(hrisCalls[0][1].headers['X-Assistant-Key']).toBe('secret-a');
      expect(hrisCalls[1][0]).toBe('http://hris-b.test/api/assistant/karyawan/list');
      expect(hrisCalls[1][1].headers['X-Assistant-Key']).toBe('secret-b');
    });
  });

  describe('getRecentAuditLogs() tidak terpengaruh resolusi tenant (query Prisma lokal)', () => {
    beforeEach(async () => {
      service = await build();
    });

    it('tetap mengambil 50 log terbaru (hanya dibatasi akses lewat guard controller, bukan service ini)', async () => {
      prisma.auditLog.findMany.mockResolvedValue([{ id: 'log-1' }]);
      const result = await service.getRecentAuditLogs();
      expect(axios.get).not.toHaveBeenCalled();
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
      expect(result).toEqual({ success: true, data: [{ id: 'log-1' }] });
    });
  });
});
