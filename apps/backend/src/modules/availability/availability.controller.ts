import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/v1/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /**
   * READ: Publik agar bisa dibaca oleh Chatbot AI & guest/tampilan denah
   */
  @Public()
  @Get('groups')
  async getGroups(@Query('tenantId') tenantId: string) {
    return this.availabilityService.getGroups(tenantId);
  }

  /**
   * CUD (Create, Update, Delete): Dilindungi otentikasi JWT Guard
   * Hanya user berwenang (owner/admin/operator) yang bisa mengubah data
   */
  @Post('groups')
  async createGroup(
    @Query('tenantId') tenantId: string,
    @Body()
    body: {
      name: string;
      category?: string;
      description?: string;
      siteplanImage?: string;
    },
  ) {
    return this.availabilityService.createGroup(tenantId, body);
  }

  @Put('groups/:id')
  async updateGroup(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      category?: string;
      description?: string;
      siteplanImage?: string;
    },
  ) {
    return this.availabilityService.updateGroup(id, body);
  }

  @Delete('groups/:id')
  async deleteGroup(@Param('id') id: string) {
    return this.availabilityService.deleteGroup(id);
  }

  @Post('groups/:groupId/items')
  async addItem(
    @Param('groupId') groupId: string,
    @Body()
    body: {
      code: string;
      name?: string;
      houseType?: string;
      status?: string;
      price?: number;
      capacity?: number;
      notes?: string;
      customerName?: string;
      customerPhone?: string;
    },
  ) {
    return this.availabilityService.addItem(groupId, body);
  }

  @Post('groups/:groupId/batch-items')
  async addBatchItems(
    @Param('groupId') groupId: string,
    @Body()
    body: {
      prefix: string;
      startNumber: number;
      endNumber: number;
      houseType?: string;
      price?: number;
    },
  ) {
    return this.availabilityService.addBatchItems(
      groupId,
      body.prefix,
      body.startNumber,
      body.endNumber,
      body.houseType,
      body.price,
    );
  }

  @Put('items/:id')
  async updateItem(
    @Param('id') id: string,
    @Body()
    body: {
      code?: string;
      name?: string;
      houseType?: string;
      status?: string;
      price?: number;
      capacity?: number;
      notes?: string;
      customerName?: string;
      customerPhone?: string;
    },
  ) {
    return this.availabilityService.updateItem(id, body);
  }

  @Delete('items/:id')
  async deleteItem(@Param('id') id: string) {
    return this.availabilityService.deleteItem(id);
  }
}
