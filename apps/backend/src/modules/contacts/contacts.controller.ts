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
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/v1/contacts')
@Public()
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  listContacts(
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.contactsService.listContacts(search, status);
  }

  @Get(':id')
  getContact(@Param('id') id: string) {
    return this.contactsService.getContact(id);
  }

  @Post()
  createContact(@Body() dto: CreateContactDto) {
    return this.contactsService.createContact(dto);
  }

  @Patch(':id')
  updateContact(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.updateContact(id, dto);
  }

  @Delete(':id')
  deleteContact(@Param('id') id: string) {
    return this.contactsService.deleteContact(id);
  }
}
