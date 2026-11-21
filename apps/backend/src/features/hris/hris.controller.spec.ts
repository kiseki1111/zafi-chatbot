import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { HrisController } from './hris.controller';
import { HrisService } from './hris.service';

describe('HrisController - akses manager/administrator/superadmin, per-tenant', () => {
  let controller: HrisController;
  let service: { [key: string]: jest.Mock };

  const superadminReq = (req: any = {}) => ({ user: { sub: 'u1', roles: ['superadmin'] }, ...req });
  const managerReq = (req: any = {}) => ({ user: { sub: 'u2', roles: ['manager'], tenantId: 'tenant-a' }, ...req });
  const adminReq = (req: any = {}) => ({ user: { sub: 'u4', roles: ['administrator'], tenantId: 'tenant-b' }, ...req });
  const operatorReq = (req: any = {}) => ({ user: { sub: 'u5', roles: ['operator'], tenantId: 'tenant-c' }, ...req });
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
    ['health', () => controller.health(operatorReq())],
    ['karyawan/list', () => controller.getEmployeesList(operatorReq())],
    ['karyawan/lookup', () => controller.lookup(operatorReq(), '0812', undefined)],
    ['karyawan/:nik/cuti', () => controller.getCuti(operatorReq(), 'NIK001')],
    ['karyawan/:nik/presensi', () => controller.getPresensi(operatorReq(), 'NIK001')],
    ['karyawan/:nik/slip-gaji', () => controller.getSlipGaji(operatorReq(), 'NIK001')],
    ['attendance/daily', () => controller.getDailyAttendance(operatorReq(), undefined)],
    ['requests/pending', () => controller.getPendingRequests(operatorReq())],
    ['audit-logs', () => controller.getAuditLogs(operatorReq())],
    ['employees/summary', () => controller.getEmployeesSummary(operatorReq())],
  ])('Rute %s', (_name, callWithOperator) => {
    it('ditolak 403 untuk role operator (bukan manager/administrator/superadmin)', async () => {
      await expect(callWithOperator()).rejects.toThrow(ForbiddenException);
    });
  });

  it('karyawan/list: ditolak 403 jika req.user kosong (seharusnya tidak lolos JwtAuthGuard, tapi pastikan guard internal juga aman)', async () => {
    await expect(controller.getEmployeesList(noUserReq())).rejects.toThrow(ForbiddenException);
  });

  it.each([
    ['manager', () => managerReq(), 'tenant-a'],
    ['administrator', () => adminReq(), 'tenant-b'],
  ])('karyawan/list: diizinkan untuk role %s, meneruskan tenantId-nya sendiri ke service', async (_role, buildReq, tenantId) => {
    const result = await controller.getEmployeesList(buildReq());
    expect(result).toEqual({ success: true, data: [] });
    expect(service.getEmployeesList).toHaveBeenCalledWith(tenantId);
  });

  it('karyawan/list: diizinkan untuk superadmin, tenantId null (tidak terikat satu tenant)', async () => {
    const result = await controller.getEmployeesList(superadminReq());
    expect(result).toEqual({ success: true, data: [] });
    expect(service.getEmployeesList).toHaveBeenCalledWith(null);
  });

  it('audit-logs: ditolak 403 untuk manager (tetap superadmin-only, beda dari data HRIS)', async () => {
    await expect(controller.getAuditLogs(managerReq())).rejects.toThrow(ForbiddenException);
  });

  it('audit-logs: diizinkan untuk superadmin', async () => {
    const result = await controller.getAuditLogs(superadminReq());
    expect(result).toEqual({ success: true, data: [] });
  });

  it('karyawan/:nik/slip-gaji: nik dan tenantId manager diteruskan persis ke service', async () => {
    await controller.getSlipGaji(managerReq(), 'NIK-777');
    expect(service.getSlipGaji).toHaveBeenCalledWith('tenant-a', 'NIK-777');
  });

  it('role dicek case-insensitive & lewat field "role" tunggal (bukan hanya array "roles")', async () => {
    const singleRoleReq = { user: { sub: 'u3', role: 'ADMINISTRATOR', tenantId: 'tenant-z' } };
    const result = await controller.getEmployeesList(singleRoleReq);
    expect(result).toEqual({ success: true, data: [] });
    expect(service.getEmployeesList).toHaveBeenCalledWith('tenant-z');
  });

  it('dua tenant berbeda memanggil service dengan tenantId masing-masing, tidak pernah tercampur', async () => {
    await controller.getCuti(managerReq(), 'NIK-A');
    await controller.getCuti(adminReq(), 'NIK-B');
    expect(service.getCutiBalance).toHaveBeenNthCalledWith(1, 'tenant-a', 'NIK-A');
    expect(service.getCutiBalance).toHaveBeenNthCalledWith(2, 'tenant-b', 'NIK-B');
  });
});
