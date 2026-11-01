import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { FollowUpService } from './follow-up.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/followup')
export class FollowUpController {
  private readonly logger = new Logger(FollowUpController.name);

  constructor(private readonly followUpService: FollowUpService) {}

  private resolveTenantId(req: any): string | undefined {
    const isSuper = req?.user?.roles?.includes('superadmin');
    if (isSuper) {
      return req?.query?.tenantId;
    }
    return req?.user?.tenantId;
  }

  @Get('config')
  async getConfig(@Req() req: any) {
    const tenantId = this.resolveTenantId(req);
    return this.followUpService.getConfig(tenantId);
  }

  @Put('config')
  async updateConfig(
    @Body()
    data: {
      isEnabled?: boolean;
      scheduleTime?: string;
      inactivityHours?: number;
      followUpPrompt?: string;
    },
    @Req() req: any,
  ) {
    const tenantId = this.resolveTenantId(req);
    return this.followUpService.updateConfig(data, tenantId);
  }

  @Get('list')
  async getInactiveContacts(
    @Query('instanceName') instanceName?: string,
    @Req() req?: any,
  ) {
    const tenantId = this.resolveTenantId(req);
    return this.followUpService.getInactiveContacts(instanceName, tenantId);
  }

  @Post('queue')
  async addToQueue(
    @Body()
    body: {
      phone: string;
      name?: string;
      instanceName?: string;
    },
    @Req() req?: any,
  ) {
    const tenantId = this.resolveTenantId(req);
    return this.followUpService.addToQueue(body, tenantId);
  }

  @Delete('queue/:contactId/:instanceName')
  async removeFromQueue(
    @Param('contactId') contactId: string,
    @Param('instanceName') instanceName: string,
    @Req() req: any,
  ) {
    const tenantId = this.resolveTenantId(req);
    // SECURITY: superadmin bisa hapus follow-up tenant lain; tenant manager hanya miliknya
    if (!tenantId) {
      // superadmin — no scoping needed
      return this.followUpService.removeFromQueue(contactId, instanceName);
    }
    // Non-superadmin: pastikan instanceName milik tenant ini
    const instance = await this.followUpService['prisma'].whatsappInstance.findUnique({
      where: { instanceName },
    });
    if (!instance || instance.tenantId !== tenantId) {
      throw new ForbiddenException(
        'Akses ditolak: Instance ini bukan milik tenant Anda',
      );
    }
    return this.followUpService.removeFromQueue(contactId, instanceName);
  }

  @Get('stats')
  async getStats(@Req() req?: any) {
    const tenantId = this.resolveTenantId(req);
    return this.followUpService.getStats(tenantId);
  }

  @Get('history')
  async getHistory(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Req() req?: any,
  ) {
    const tenantId = this.resolveTenantId(req);
    return this.followUpService.getHistory(
      parseInt(String(skip || 0)),
      parseInt(String(take || 50)),
      tenantId,
    );
  }

  @Post('trigger')
  async manualTrigger(
    @Body('instanceName') instanceName?: string,
    @Req() req?: any,
  ) {
    const tenantId = this.resolveTenantId(req);
    return this.followUpService.manualTrigger(instanceName, tenantId);
  }

  @Post('clear-pending')
  async clearPendingFollowUps(
    @Body('exceptPhone') exceptPhone?: string,
    @Req() req?: any,
  ) {
    // SECURITY: clear-pending adalah operasi lintas-tenant — hanya superadmin
    const isSuper = req?.user?.roles?.includes('superadmin');
    if (!isSuper) {
      throw new ForbiddenException(
        'Akses ditolak: Hanya superadmin yang bisa membersihkan antrean follow-up global',
      );
    }
    return this.followUpService.clearPendingFollowUps(exceptPhone);
  }
}
