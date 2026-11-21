import { Controller, ForbiddenException, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { HrisService } from './hris.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// Proxy ke SATU instance presensi-app eksternal (lihat hris.service.ts) -- belum per-tenant.
// Dikunci superadmin saja supaya data karyawan/gaji/cuti perusahaan itu tidak terbuka ke tenant
// lain atau publik, sampai integrasi HRIS multi-tenant yang benar (lewat Console) tersedia.
@UseGuards(JwtAuthGuard)
@Controller('api/v1/hris')
export class HrisController {
  constructor(private readonly hrisService: HrisService) {}

  private ensureSuperadmin(req: any) {
    const user = req?.user;
    const isSuper =
      user?.roles?.some((r: string) => r?.toLowerCase() === 'superadmin') ||
      user?.role?.toLowerCase() === 'superadmin';
    if (!isSuper) {
      throw new ForbiddenException(
        'Akses ditolak: integrasi HRIS ini hanya untuk Superadmin.',
      );
    }
  }

  @Get('health')
  async health(@Req() req: any) {
    this.ensureSuperadmin(req);
    return this.hrisService.getHealth();
  }

  @Get('karyawan/list')
  async getEmployeesList(@Req() req: any) {
    this.ensureSuperadmin(req);
    return this.hrisService.getEmployeesList();
  }

  @Get('karyawan/lookup')
  async lookup(
    @Req() req: any,
    @Query('phone') phone?: string,
    @Query('nik') nik?: string,
  ) {
    this.ensureSuperadmin(req);
    return this.hrisService.lookupKaryawan(phone, nik);
  }

  @Get('karyawan/:nik/cuti')
  async getCuti(@Req() req: any, @Param('nik') nik: string) {
    this.ensureSuperadmin(req);
    return this.hrisService.getCutiBalance(nik);
  }

  @Get('karyawan/:nik/presensi')
  async getPresensi(@Req() req: any, @Param('nik') nik: string) {
    this.ensureSuperadmin(req);
    return this.hrisService.getPresensiSummary(nik);
  }

  @Get('karyawan/:nik/slip-gaji')
  async getSlipGaji(@Req() req: any, @Param('nik') nik: string) {
    this.ensureSuperadmin(req);
    return this.hrisService.getSlipGaji(nik);
  }

  @Get('attendance/daily')
  async getDailyAttendance(@Req() req: any, @Query('date') date?: string) {
    this.ensureSuperadmin(req);
    return this.hrisService.getDailyAttendance(date);
  }

  @Get('requests/pending')
  async getPendingRequests(@Req() req: any) {
    this.ensureSuperadmin(req);
    return this.hrisService.getPendingRequests();
  }

  @Get('audit-logs')
  async getAuditLogs(@Req() req: any) {
    this.ensureSuperadmin(req);
    return this.hrisService.getRecentAuditLogs();
  }

  @Get('employees/summary')
  async getEmployeesSummary(@Req() req: any) {
    this.ensureSuperadmin(req);
    return this.hrisService.getEmployeesSummary();
  }
}
