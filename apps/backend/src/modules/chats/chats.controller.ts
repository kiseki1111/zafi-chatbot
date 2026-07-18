import { Controller, Get, Query, Param, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ChatsService } from './chats.service';

@Controller('api/v1/chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  getConversations(@Query('instanceName') instanceName?: string) {
    return this.chatsService.getConversations(instanceName);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
  ) {
    return this.chatsService.getMessages(id, skip, take);
  }
}
