import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HrisService } from './hris.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import axios from 'axios';

jest.mock('axios');

describe('HrisService - fail-closed tanpa hardcoded secret', () => {
  let service: HrisService;
  let prisma: { auditLog: { findMany: jest.Mock } };

  function build(envOverrides: Record<string, string | undefined> = {}) {
    const env: Record<string, string | undefined> = {
      HRIS_API_URL: 'http://presensi.test/api/assistant',
      HRIS_API_KEY: 'secret-asli-dari-env',
      ...envOverrides,
    };
    const config = { get: (key: string) => env[key] };
    prisma = { auditLog: { findMany: jest.fn() } };

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HRIS_API_KEY tidak diset (tanpa fallback hardcoded)', () => {
    beforeEach(async () => {
      service = await build({ HRIS_API_KEY: undefined });
    });

    it('getHealth() tidak pernah memanggil axios, balas DISABLED', async () => {
      const result = await service.getHealth();
      expect(axios.get).not.toHaveBeenCalled();
      expect(result).toMatchObject({ success: false, status: 'DISABLED' });
    });

    it('getEmployeesList() gagal aman tanpa memanggil HRIS', async () => {
      const result = await service.getEmployeesList();
      expect(axios.get).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, data: [], message: 'Integrasi HRIS belum dikonfigurasi.' });
    });

    it('lookupKaryawan() gagal aman tanpa memanggil HRIS', async () => {
      const result = await service.lookupKaryawan('0812', undefined);
      expect(axios.get).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, message: 'Integrasi HRIS belum dikonfigurasi.' });
    });

    it('getCutiBalance() gagal aman tanpa memanggil HRIS', async () => {
      const result = await service.getCutiBalance('NIK001');
      expect(axios.get).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, message: 'Integrasi HRIS belum dikonfigurasi.' });
    });

    it('getPresensiSummary() gagal aman tanpa memanggil HRIS', async () => {
      const result = await service.getPresensiSummary('NIK001');
      expect(axios.get).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, message: 'Integrasi HRIS belum dikonfigurasi.' });
    });

    it('getSlipGaji() gagal aman tanpa memanggil HRIS', async () => {
      const result = await service.getSlipGaji('NIK001');
      expect(axios.get).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, message: 'Integrasi HRIS belum dikonfigurasi.' });
    });

    it('getDailyAttendance() gagal aman tanpa memanggil HRIS', async () => {
      const result = await service.getDailyAttendance();
      expect(axios.get).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, message: 'Integrasi HRIS belum dikonfigurasi.' });
    });

    it('getPendingRequests() gagal aman tanpa memanggil HRIS', async () => {
      const result = await service.getPendingRequests();
      expect(axios.get).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, message: 'Integrasi HRIS belum dikonfigurasi.' });
    });

    it('getEmployeesSummary() gagal aman tanpa memanggil HRIS', async () => {
      const result = await service.getEmployeesSummary();
      expect(axios.get).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, message: 'Integrasi HRIS belum dikonfigurasi.' });
    });
  });

  describe('HRIS_API_KEY diset dari env (bukan fallback)', () => {
    beforeEach(async () => {
      service = await build();
    });

    it('getEmployeesList() memanggil HRIS dengan header X-Assistant-Key dari env, BUKAN hris_bot_sec_live_948f2a', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: { success: true, data: [] } });

      await service.getEmployeesList();

      expect(axios.get).toHaveBeenCalledWith(
        'http://presensi.test/api/assistant/karyawan/list',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Assistant-Key': 'secret-asli-dari-env' }),
        }),
      );
      const sentHeaders = (axios.get as jest.Mock).mock.calls[0][1].headers;
      expect(sentHeaders['X-Assistant-Key']).not.toBe('hris_bot_sec_live_948f2a');
    });

    it('getCutiBalance() memanggil endpoint NIK yang benar', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: { success: true, data: { sisa_cuti: 10 } } });
      const result = await service.getCutiBalance('NIK999');
      expect(axios.get).toHaveBeenCalledWith(
        'http://presensi.test/api/assistant/karyawan/NIK999/cuti',
        expect.anything(),
      );
      expect(result).toEqual({ success: true, data: { sisa_cuti: 10 } });
    });

    it('HRIS down/timeout: dibalas gagal aman, bukan exception', async () => {
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const result = await service.getSlipGaji('NIK001');
      expect(result).toEqual({ success: false, message: 'ECONNREFUSED' });
    });
  });

  describe('getRecentAuditLogs() tidak terpengaruh status HRIS_API_KEY (query Prisma lokal)', () => {
    beforeEach(async () => {
      service = await build({ HRIS_API_KEY: undefined });
    });

    it('tetap mengambil 50 log terbaru (hanya dibatasi akses lewat guard controller, bukan service ini)', async () => {
      prisma.auditLog.findMany.mockResolvedValue([{ id: 'log-1' }]);
      const result = await service.getRecentAuditLogs();
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
      expect(result).toEqual({ success: true, data: [{ id: 'log-1' }] });
    });
  });
});
