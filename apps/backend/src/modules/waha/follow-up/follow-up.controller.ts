import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Logger,
} from '@nestjs/common';
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
  async updateConfig(
    @Body()
    data: {
      isEnabled?: boolean;
      scheduleTime?: string;
      inactivityHours?: number;
      followUpPrompt?: string;
    },
  ) {
    return this.followUpService.updateConfig(data);
  }

  @Get('list')
  async getInactiveContacts(@Query('instanceName') instanceName?: string) {
    return this.followUpService.getInactiveContacts(instanceName);
  }

  @Post('queue')
  async addToQueue(
    @Body()
    body: {
      phone: string;
      name?: string;
      instanceName?: string;
    },
  ) {
    return this.followUpService.addToQueue(body);
  }

  @Delete('queue/:contactId/:instanceName')
  async removeFromQueue(
    @Param('contactId') contactId: string,
    @Param('instanceName') instanceName: string,
  ) {
    return this.followUpService.removeFromQueue(contactId, instanceName);
  }

  @Get('stats')
  async getStats() {
    return this.followUpService.getStats();
  }

  @Get('history')
  async getHistory(@Query('skip') skip?: number, @Query('take') take?: number) {
    return this.followUpService.getHistory(
      parseInt(String(skip || 0)),
      parseInt(String(take || 50)),
    );
  }

  @Post('trigger')
  async manualTrigger(@Body('instanceName') instanceName?: string) {
    return this.followUpService.manualTrigger(instanceName);
  }

  @Post('clear-pending')
  async clearPendingFollowUps(@Body('exceptPhone') exceptPhone?: string) {
    return this.followUpService.clearPendingFollowUps(exceptPhone);
  }
}
