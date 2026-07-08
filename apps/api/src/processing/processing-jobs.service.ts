import { Injectable, NotFoundException } from '@nestjs/common';
import type { ProcessingJob, ProcessingJobStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ProcessingJobsService {
  constructor(private readonly prisma: PrismaService) {}

  list(filter: { status?: ProcessingJobStatus; documentId?: string }): Promise<ProcessingJob[]> {
    return this.prisma.processingJob.findMany({
      where: { status: filter.status, documentId: filter.documentId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getById(id: string): Promise<ProcessingJob> {
    const job = await this.prisma.processingJob.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException('Processing job not found');
    }
    return job;
  }

  /** Requeue a failed job for another attempt. */
  async retry(id: string): Promise<ProcessingJob> {
    await this.getById(id);
    return this.prisma.processingJob.update({
      where: { id },
      data: { status: 'queued', errorMessage: null, startedAt: null, finishedAt: null },
    });
  }
}
