import { Module } from '@nestjs/common';
import { HrisService } from './hris.service';
import { HrisController } from './hris.controller';

@Module({
  controllers: [HrisController],
  providers: [HrisService],
  exports: [HrisService],
})
export class HrisModule {}
