import { Module } from '@nestjs/common';
import { AssignmentsService } from './services/assignments.service';
import { AssignmentsController } from './controllers/assignments.controller';

@Module({
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
})
export class AssignmentsModule {}
