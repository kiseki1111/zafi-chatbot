import { Module } from '@nestjs/common';
import { HrisService } from './hris.service';
import { HrisAssistantService } from './hris-assistant.service';
import { HrisController } from './hris.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HrisController],
  providers: [HrisService, HrisAssistantService],
  exports: [HrisService, HrisAssistantService],
})
export class HrisModule {}
