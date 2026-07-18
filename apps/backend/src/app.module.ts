import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { ChannelAccountsModule } from './modules/channel-accounts/channel-accounts.module';
import { WahaModule } from './modules/waha/waha.module';
import { ChatsModule } from './modules/chats/chats.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import jwtConfig from './config/jwt.config'; // Pastikan file konfigurasi JWT terdaftar

import { AiModule } from './modules/ai/ai.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { AppController } from './app.controller';
import { OpenAiModule } from './infrastructure/openai/openai.module';

@Module({
  imports: [
    // Mendaftarkan konfigurasi terpusat secara global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig],
    }),
    ThrottlerModule.forRoot([{
      ttl: 900000, // 15 menit dalam satuan milidetik (15 * 60 * 1000)
      limit: 3000,  // maksimal 3000 request
    }]),
    PrismaModule,
    UsersModule,
    AuthModule,
    ChannelAccountsModule,
    WahaModule,
    ChatsModule,
    AiModule,
    KnowledgeModule,
    TelegramModule,
    OpenAiModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }