import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller';
import { AgentAssistantModule } from '../agent-assistant/agent-assistant.module';
import { AgentCsModule } from '../agent-cs/agent-cs.module';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [AgentAssistantModule, AgentCsModule, PrismaModule],
  controllers: [SimulatorController],
})
export class SimulatorModule {}
