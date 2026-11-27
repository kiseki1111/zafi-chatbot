import { Body, Controller, ForbiddenException, Get, Optional, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { HrisService } from './hris.service';
import { HrisAssistantService } from './hris-assistant.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/** Staf tenant (dikelola lewat halaman HRIS di dashboard chatbot) yang boleh memakai integrasi ini. */
const HRIS_STAFF_ROLES = ['superadmin', 'manager', 'administrator'];

// Proxy ke instance presensi-app milik tenant yang sedang login (resolusi per-tenant lewat SSO
// Console, lihat HrisService.resolveTenantConfig) -- bukan config global, supaya tenant lain tidak
// bisa melihat data karyawan/gaji/cuti tenant ini.
@UseGuards(JwtAuthGuard)
@Controller('api/v1/hris')
export class HrisController {
  constructor(
    private readonly hrisService: HrisService,
    @Optional() private readonly hrisAssistant?: HrisAssistantService,
  ) {}

  private requireStaff(req: any): string | null {
    const user = req?.user;
    const roles: string[] = user?.roles ?? (user?.role ? [user.role] : []);
    const isStaff = roles.some((r) => HRIS_STAFF_ROLES.includes(r?.toLowerCase()));
    if (!isStaff) {
      throw new ForbiddenException(
        'Akses ditolak: integrasi HRIS hanya untuk manager/administrator perusahaan ini.',
      );
    }
    return user?.tenantId ?? null;
  }

  private ensureSuperadmin(req: any) {
    const user = req?.user;
    const roles: string[] = user?.roles ?? (user?.role ? [user.role] : []);
    const isSuper = roles.some((r) => r?.toLowerCase() === 'superadmin');
    if (!isSuper) {
      throw new ForbiddenException('Akses ditolak: hanya untuk Superadmin.');
    }
  }

  @Get('health')
  async health(@Req() req: any) {
    const tenantId = this.requireStaff(req);
    return this.hrisService.getHealth(tenantId);
  }

  @Get('karyawan/list')
  async getEmployeesList(@Req() req: any) {
    const tenantId = this.requireStaff(req);
    return this.hrisService.getEmployeesList(tenantId);
  }

  @Get('karyawan/lookup')
  async lookup(
    @Req() req: any,
    @Query('phone') phone?: string,
    @Query('nik') nik?: string,
  ) {
    const tenantId = this.requireStaff(req);
    return this.hrisService.lookupKaryawan(tenantId, phone, nik);
  }

  @Get('karyawan/:nik/cuti')
  async getCuti(@Req() req: any, @Param('nik') nik: string) {
    const tenantId = this.requireStaff(req);
    return this.hrisService.getCutiBalance(tenantId, nik);
  }

  @Get('karyawan/:nik/presensi')
  async getPresensi(@Req() req: any, @Param('nik') nik: string) {
    const tenantId = this.requireStaff(req);
    return this.hrisService.getPresensiSummary(tenantId, nik);
  }

  @Get('karyawan/:nik/slip-gaji')
  async getSlipGaji(@Req() req: any, @Param('nik') nik: string) {
    const tenantId = this.requireStaff(req);
    return this.hrisService.getSlipGaji(tenantId, nik);
  }

  @Get('attendance/daily')
  async getDailyAttendance(@Req() req: any, @Query('date') date?: string) {
    const tenantId = this.requireStaff(req);
    return this.hrisService.getDailyAttendance(tenantId, date);
  }

  @Get('requests/pending')
  async getPendingRequests(@Req() req: any) {
    const tenantId = this.requireStaff(req);
    return this.hrisService.getPendingRequests(tenantId);
  }

  // Log audit platform ZAF lintas tenant -- tetap superadmin-only, berbeda dari data HRIS di atas.
  @Get('audit-logs')
  async getAuditLogs(@Req() req: any) {
    this.ensureSuperadmin(req);
    return this.hrisService.getRecentAuditLogs();
  }

  @Get('employees/summary')
  async getEmployeesSummary(@Req() req: any) {
    const tenantId = this.requireStaff(req);
    return this.hrisService.getEmployeesSummary(tenantId);
  }

  @Post('assistant/chat')
  async assistantChat(
    @Req() req: any,
    @Body() body: { phone: string; text: string },
  ) {
    const tenantId = this.requireStaff(req);
    if (!this.hrisAssistant) {
      return { handled: false, reply: 'Layanan Asisten HRD tidak tersedia.' };
    }
    return this.hrisAssistant.handleMessage(tenantId, body?.phone || '', body?.text || '');
  }
}
