import { Module } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { WahaModule } from '../waha/waha.module';

@Module({
  imports: [WahaModule],
  controllers: [ChatsController],
  providers: [ChatsService, PrismaService],
})
export class ChatsModule {}
