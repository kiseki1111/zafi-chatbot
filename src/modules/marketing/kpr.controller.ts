import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { KprService } from './kpr.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('marketing/kpr')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class KprController {
  constructor(private readonly kprService: KprService) {}

  @Get()
  async getKprSubmissions() {
    return this.kprService.getKprSubmissions();
  }

  @Patch(':id/status')
  async updateKprStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.kprService.updateKprStatus(id, status);
  }
}
