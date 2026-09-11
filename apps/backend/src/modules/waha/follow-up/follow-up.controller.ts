import { Controller, Get, Post, Put, Query, Body, Logger } from '@nestjs/common';
import { FollowUpService } from './follow-up.service';

@Controller('api/v1/followup')
export class FollowUpController {
  private readonly logger = new Logger(FollowUpController.name);

  constructor(private readonly followUpService: FollowUpService) {}

  @Get('config')
  async getConfig() {
    return this.followUpService.getConfig();
  }

  @Put('config')
  async updateConfig(@Body() data: {
    isEnabled?: boolean;
    scheduleTime?: string;
    inactivityHours?: number;
    followUpPrompt?: string;
  }) {
    return this.followUpService.updateConfig(data);
  }

  @Get('list')
  async getInactiveContacts(@Query('instanceName') instanceName?: string) {
    return this.followUpService.getInactiveContacts(instanceName);
  }

  @Get('stats')
  async getStats() {
    return this.followUpService.getStats();
  }

  @Get('history')
  async getHistory(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.followUpService.getHistory(
      parseInt(String(skip || 0)),
      parseInt(String(take || 50)),
    );
  }

  @Post('trigger')
  async manualTrigger(@Body('instanceName') instanceName?: string) {
    return this.followUpService.manualTrigger(instanceName);
  }
}