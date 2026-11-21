import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { HrisController } from './hris.controller';
import { HrisService } from './hris.service';

describe('HrisController - akses dikunci Superadmin', () => {
  let controller: HrisController;
  let service: { [key: string]: jest.Mock };

  const superadminReq = (req: any = {}) => ({ user: { sub: 'u1', roles: ['superadmin'] }, ...req });
  const managerReq = (req: any = {}) => ({ user: { sub: 'u2', roles: ['manager'], tenantId: 'tenant-a' }, ...req });
  const noUserReq = () => ({});

  beforeEach(async () => {
    service = {
      getHealth: jest.fn().mockResolvedValue({ success: true }),
      getEmployeesList: jest.fn().mockResolvedValue({ success: true, data: [] }),
      lookupKaryawan: jest.fn().mockResolvedValue({ success: true }),
      getCutiBalance: jest.fn().mockResolvedValue({ success: true }),
      getPresensiSummary: jest.fn().mockResolvedValue({ success: true }),
      getSlipGaji: jest.fn().mockResolvedValue({ success: true }),
      getDailyAttendance: jest.fn().mockResolvedValue({ success: true }),
      getPendingRequests: jest.fn().mockResolvedValue({ success: true }),
      getRecentAuditLogs: jest.fn().mockResolvedValue({ success: true, data: [] }),
      getEmployeesSummary: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HrisController],
      providers: [{ provide: HrisService, useValue: service }],
    }).compile();

    controller = module.get<HrisController>(HrisController);
  });

  describe.each([
    ['health', () => controller.health(managerReq())],
    ['karyawan/list', () => controller.getEmployeesList(managerReq())],
    ['karyawan/lookup', () => controller.lookup(managerReq(), '0812', undefined)],
    ['karyawan/:nik/cuti', () => controller.getCuti(managerReq(), 'NIK001')],
    ['karyawan/:nik/presensi', () => controller.getPresensi(managerReq(), 'NIK001')],
    ['karyawan/:nik/slip-gaji', () => controller.getSlipGaji(managerReq(), 'NIK001')],
    ['attendance/daily', () => controller.getDailyAttendance(managerReq(), undefined)],
    ['requests/pending', () => controller.getPendingRequests(managerReq())],
    ['audit-logs', () => controller.getAuditLogs(managerReq())],
    ['employees/summary', () => controller.getEmployeesSummary(managerReq())],
  ])('Rute %s', (_name, callWithManager) => {
    it('ditolak 403 untuk role manager (bukan superadmin)', async () => {
      await expect(callWithManager()).rejects.toThrow(ForbiddenException);
    });
  });

  it('karyawan/list: ditolak 403 jika req.user kosong (seharusnya tidak lolos JwtAuthGuard, tapi pastikan guard internal juga aman)', async () => {
    await expect(controller.getEmployeesList(noUserReq())).rejects.toThrow(ForbiddenException);
  });

  it('karyawan/list: diizinkan untuk superadmin, meneruskan ke service', async () => {
    const result = await controller.getEmployeesList(superadminReq());
    expect(result).toEqual({ success: true, data: [] });
    expect(service.getEmployeesList).toHaveBeenCalledTimes(1);
  });

  it('audit-logs: diizinkan untuk superadmin', async () => {
    const result = await controller.getAuditLogs(superadminReq());
    expect(result).toEqual({ success: true, data: [] });
  });

  it('karyawan/:nik/slip-gaji: parameter nik diteruskan persis ke service', async () => {
    await controller.getSlipGaji(superadminReq(), 'NIK-777');
    expect(service.getSlipGaji).toHaveBeenCalledWith('NIK-777');
  });

  it('role dicek case-insensitive & lewat field "role" tunggal (bukan hanya array "roles")', async () => {
    const singleRoleReq = { user: { sub: 'u3', role: 'SUPERADMIN' } };
    const result = await controller.getEmployeesList(singleRoleReq);
    expect(result).toEqual({ success: true, data: [] });
  });
});
