import { Module } from '@nestjs/common';
import { ChannelAccountsService } from './channel-accounts.service';
import { ChannelAccountsController } from './channel-accounts.controller';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Module({
  controllers: [ChannelAccountsController],
  providers: [ChannelAccountsService, PrismaService],
})
export class ChannelAccountsModule {}
