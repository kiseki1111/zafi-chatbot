import {
  Controller,
  Get,
  Body,
  Param,
  Put,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PlatformService } from './platform.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('api/v1/platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  private ensureSuperadmin(req: any) {
    if (!req?.user?.roles?.includes('superadmin')) {
      throw new ForbiddenException(
        'Akses ditolak: Hanya Superadmin yang berhak mengakses fungsi platform.',
      );
    }
  }

  @Get('stats')
  async stats(@Req() req: any) {
    this.ensureSuperadmin(req);
    return this.platformService.getStats();
  }

  @Get('quota-overview')
  async quotaOverview(@Req() req: any) {
    this.ensureSuperadmin(req);
    return this.platformService.getQuotaOverview();
  }

  @Get('config/:key')
  async getConfig(@Param('key') key: string, @Req() req: any) {
    this.ensureSuperadmin(req);
    return this.platformService.getConfig(key);
  }

  @Put('config/:key')
  async setConfig(
    @Param('key') key: string,
    @Body() body: { value: any },
    @Req() req: any,
  ) {
    this.ensureSuperadmin(req);
    return this.platformService.setConfig(key, body.value);
  }

  @Get('webhook-logs')
  async webhookLogs(@Req() req: any) {
    this.ensureSuperadmin(req);
    return this.platformService.webhookLogs();
  }
}