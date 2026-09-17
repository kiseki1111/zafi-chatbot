import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

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

  // Admin takeover conversation
  @Post(':id/takeover')
  @UseGuards(JwtAuthGuard)
  takeover(@Param('id') id: string, @Req() req: any) {
    return this.chatsService.takeoverConversation(id, req.user?.sub);
  }

  // Release back to bot
  @Post(':id/release')
  @UseGuards(JwtAuthGuard)
  release(@Param('id') id: string) {
    return this.chatsService.releaseConversation(id);
  }

  // Admin send text message
  @Post(':id/send')
  @UseGuards(JwtAuthGuard)
  sendMessage(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { text: string },
  ) {
    if (!body.text?.trim()) throw new BadRequestException('text required');
    return this.chatsService.sendMessage(id, req.user?.sub, body.text.trim());
  }

  // Admin send image (base64 or URL)
  @Post(':id/send-image')
  @UseGuards(JwtAuthGuard)
  async sendImage(
    @Param('id') id: string,
    @Req() req: any,
    @Body()
    body: {
      imageUrl?: string;
      base64?: string;
      mimeType?: string;
      caption?: string;
    },
  ) {
    if (body.imageUrl) {
      return this.chatsService.sendImageUrl(
        id,
        req.user?.sub,
        body.imageUrl,
        body.caption,
      );
    }
    if (body.base64 && body.mimeType) {
      return this.chatsService.sendImageBase64(
        id,
        req.user?.sub,
        body.base64,
        body.mimeType,
        body.caption,
      );
    }
    throw new BadRequestException('imageUrl or (base64 + mimeType) required');
  }

  // Simulation: Mock customer sends message or image
  @Post('mock-customer-incoming')
  async mockCustomer(
    @Body()
    body: {
      phone: string;
      name?: string;
      text?: string;
      imageUrl?: string;
      instanceName?: string;
    },
  ) {
    if (!body.phone) throw new BadRequestException('phone required');
    return this.chatsService.mockIncomingMessage(body);
  }

  // Real WAHA Test: Kirim text/image langsung ke WAHA API dan verifikasi responnya
  @Post('test-real-waha')
  async testRealWaha(
    @Body()
    body: {
      sessionName: string;
      chatId: string;
      text?: string;
      imageUrl?: string;
      base64?: string;
      mimeType?: string;
    },
  ) {
    if (!body.sessionName || !body.chatId) {
      throw new BadRequestException('sessionName and chatId required');
    }
    return this.chatsService.testRealWahaSend(body);
  }
}
