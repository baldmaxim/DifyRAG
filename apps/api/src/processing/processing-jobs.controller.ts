import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { ProcessingJob, ProcessingJobStatus } from '@prisma/client';
import { UserRole } from '@dkp/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { ProcessingJobsService } from './processing-jobs.service';

@ApiTags('processing')
@ApiBearerAuth('jwt')
@Controller('processing/jobs')
export class ProcessingJobsController {
  constructor(private readonly jobs: ProcessingJobsService) {}

  @Get()
  list(
    @Query('status') status?: ProcessingJobStatus,
    @Query('documentId') documentId?: string,
  ): Promise<ProcessingJob[]> {
    return this.jobs.list({ status, documentId });
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<ProcessingJob> {
    return this.jobs.getById(id);
  }

  @Post(':id/retry')
  @Roles(UserRole.Manager, UserRole.Admin, UserRole.SuperAdmin)
  retry(@Param('id') id: string): Promise<ProcessingJob> {
    return this.jobs.retry(id);
  }
}
