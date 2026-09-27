import { Module } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { ChatStreamService } from './chat-stream.service';
import { WahaModule } from '../waha/waha.module';

@Module({
  imports: [WahaModule],
  controllers: [ChatsController],
  providers: [ChatsService, PrismaService, ChatStreamService],
  exports: [ChatStreamService],
})
export class ChatsModule {}
