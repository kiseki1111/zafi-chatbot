import { Module } from '@nestjs/common';
import { HrisService } from './hris.service';
import { HrisController } from './hris.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HrisController],
  providers: [HrisService],
  exports: [HrisService],
})
export class HrisModule {}
