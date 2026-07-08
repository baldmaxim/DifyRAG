import { Module } from '@nestjs/common';
import { DifyModule } from '../integrations/dify/dify.module';
import { ProcessingJobsController } from './processing-jobs.controller';
import { ProcessingJobsService } from './processing-jobs.service';
import { ProcessingWorkerService } from './processing-worker.service';

@Module({
  imports: [DifyModule],
  controllers: [ProcessingJobsController],
  providers: [ProcessingJobsService, ProcessingWorkerService],
  exports: [ProcessingJobsService, ProcessingWorkerService],
})
export class ProcessingModule {}
