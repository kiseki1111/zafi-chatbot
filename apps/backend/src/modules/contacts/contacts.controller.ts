import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  private resolveTenantId(req: any): string | undefined {
    const isSuper = req?.user?.roles?.includes('superadmin');
    if (isSuper) {
      return req?.query?.tenantId;
    }
    return req?.user?.tenantId;
  }

  @Get()
  listContacts(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Req() req?: any,
  ) {
    const tenantId = this.resolveTenantId(req);
    return this.contactsService.listContacts(search, status, tenantId);
  }

  @Get(':id')
  getContact(@Param('id') id: string, @Req() req?: any) {
    const tenantId = this.resolveTenantId(req);
    return this.contactsService.getContact(id, tenantId);
  }

  @Post()
  createContact(@Body() dto: CreateContactDto, @Req() req?: any) {
    const tenantId = this.resolveTenantId(req);
    return this.contactsService.createContact(dto, tenantId);
  }

  @Patch(':id')
  updateContact(
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
    @Req() req?: any,
  ) {
    const tenantId = this.resolveTenantId(req);
    return this.contactsService.updateContact(id, dto, tenantId);
  }

  @Delete(':id')
  deleteContact(@Param('id') id: string, @Req() req?: any) {
    const tenantId = this.resolveTenantId(req);
    return this.contactsService.deleteContact(id, tenantId);
  }
}
