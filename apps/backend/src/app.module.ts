import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { UsersModule } from './features/web-dashboard/users/users.module';
import { AuthModule } from './features/web-dashboard/auth/auth.module';
import { TenantModule } from './features/web-dashboard/tenant/tenant.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { ChannelAccountsModule } from './modules/channel-accounts/channel-accounts.module';
import { WahaModule } from './modules/waha/waha.module';
import { ChatsModule } from './modules/chats/chats.module';
import jwtConfig from './config/jwt.config'; // Pastikan file konfigurasi JWT terdaftar


import { KnowledgeIngestModule } from './features/knowledge-ingest/knowledge-ingest.module';
import { AppController } from './app.controller';
import { OpenAiModule } from './core/openai/openai.module';
import { OmnichannelModule } from './core/omnichannel/omnichannel.module';
import { AgentAssistantModule } from './features/agent-assistant/agent-assistant.module';
import { SimulatorModule } from './features/simulator/simulator.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';

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
    TenantModule,
    ChannelAccountsModule,
    WahaModule,
    ChatsModule,
    KnowledgeIngestModule,
    OpenAiModule,
    OmnichannelModule,
    AgentAssistantModule,
    SimulatorModule,
    KnowledgeModule,
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