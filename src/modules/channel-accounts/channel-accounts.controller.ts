import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ChannelAccountsService } from './channel-accounts.service';
import { CreateChannelAccountDto } from './dto/create-channel-account.dto';
import { UpdateChannelAccountDto } from './dto/update-channel-account.dto';

@Controller('api/v1/channel-accounts')
export class ChannelAccountsController {
  constructor(private readonly channelAccountsService: ChannelAccountsService) {}

  @Post()
  create(@Body() createChannelAccountDto: CreateChannelAccountDto) {
    return this.channelAccountsService.create(createChannelAccountDto);
  }

  @Get('divisions')
  getDivisions() {
    return this.channelAccountsService.getDivisions();
  }

  @Get()
  findAll(@Query('divisionName') divisionName?: string) {
    return this.channelAccountsService.findAll(divisionName);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.channelAccountsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateChannelAccountDto: UpdateChannelAccountDto) {
    return this.channelAccountsService.update(id, updateChannelAccountDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.channelAccountsService.remove(id);
  }
}
