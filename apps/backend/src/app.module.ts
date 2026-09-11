import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './features/web-dashboard/auth/auth.module';
import { TenantModule } from './features/web-dashboard/tenant/tenant.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { WahaModule } from './modules/waha/waha.module';
import { ChatsModule } from './modules/chats/chats.module';
import { FollowUpModule } from './modules/waha/follow-up/follow-up.module';
import jwtConfig from './config/jwt.config';

import { KnowledgeIngestModule } from './features/knowledge-ingest/knowledge-ingest.module';
import { AppController } from './app.controller';
import { OpenAiModule } from './core/openai/openai.module';
import { OmnichannelModule } from './core/omnichannel/omnichannel.module';
import { AgentAssistantModule } from './features/agent-assistant/agent-assistant.module';
import { SimulatorModule } from './features/simulator/simulator.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { AvailabilityModule } from './modules/availability/availability.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig],
    }),
    ThrottlerModule.forRoot([{
      ttl: 900000,
      limit: 3000,
    }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    TenantModule,
    WahaModule,
    ChatsModule,
    FollowUpModule,
    KnowledgeIngestModule,
    OpenAiModule,
    OmnichannelModule,
    AgentAssistantModule,
    SimulatorModule,
    KnowledgeModule,
    AvailabilityModule,
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