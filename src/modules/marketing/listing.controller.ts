import { Controller, Get, UseGuards } from '@nestjs/common';
import { ListingService } from './listing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('marketing/listing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Get('projects')
  async getProjects() {
    return this.listingService.getProjects();
  }

  @Get('units')
  async getUnits() {
    return this.listingService.getUnits();
  }
}
