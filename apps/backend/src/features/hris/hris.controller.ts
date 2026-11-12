import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { HrisService } from './hris.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('api/v1/hris')
export class HrisController {
  constructor(private readonly hrisService: HrisService) {}

  @Get('health')
  async health() {
    return this.hrisService.getHealth();
  }

  @Get('karyawan/list')
  async getEmployeesList() {
    return this.hrisService.getEmployeesList();
  }

  @Get('karyawan/lookup')
  async lookup(
    @Query('phone') phone?: string,
    @Query('nik') nik?: string,
  ) {
    return this.hrisService.lookupKaryawan(phone, nik);
  }

  @Get('karyawan/:nik/cuti')
  async getCuti(@Param('nik') nik: string) {
    return this.hrisService.getCutiBalance(nik);
  }

  @Get('karyawan/:nik/presensi')
  async getPresensi(@Param('nik') nik: string) {
    return this.hrisService.getPresensiSummary(nik);
  }

  @Get('karyawan/:nik/slip-gaji')
  async getSlipGaji(@Param('nik') nik: string) {
    return this.hrisService.getSlipGaji(nik);
  }

  @Get('attendance/daily')
  async getDailyAttendance(@Query('date') date?: string) {
    return this.hrisService.getDailyAttendance(date);
  }

  @Get('requests/pending')
  async getPendingRequests() {
    return this.hrisService.getPendingRequests();
  }

  @Get('audit-logs')
  async getAuditLogs() {
    return this.hrisService.getRecentAuditLogs();
  }

  @Get('employees/summary')
  async getEmployeesSummary() {
    return this.hrisService.getEmployeesSummary();
  }
}
