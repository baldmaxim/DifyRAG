import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { ProcessingJob } from '@prisma/client';
import { ProcessingJobType } from '@dkp/shared';
import type { ProcessingConfig } from '../config/configuration';
import { PrismaService } from '../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { DifyDocumentSyncService } from '../integrations/dify/dify-document-sync.service';

/**
 * PostgreSQL-backed processing worker. `processing_jobs` is the durable queue;
 * the worker polls for `queued` jobs and dispatches them to the Dify sync
 * service. Disabled by default (PROCESSING_WORKER_ENABLED=true to run).
 *
 * NOTE: the queue could be swapped for pg-boss (PG_BOSS_SCHEMA) without changing
 * the job semantics — the job table remains the source of truth for the UI.
 */
@Injectable()
export class ProcessingWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProcessingWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly difySync: DifyDocumentSyncService,
    private readonly settings: SettingsService,
  ) {}

  private get cfg(): ProcessingConfig {
    return this.settings.processing();
  }

  onModuleInit(): void {
    if (!this.cfg.workerEnabled) {
      this.logger.log('Processing worker disabled (PROCESSING_WORKER_ENABLED=false)');
      return;
    }
    this.timer = setInterval(() => {
      void this.tick();
    }, this.cfg.pollIntervalMs);
    this.logger.log(`Processing worker started (interval ${this.cfg.pollIntervalMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const job = await this.prisma.processingJob.findFirst({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' },
      });
      if (job) {
        await this.processJob(job);
      }
    } catch (err) {
      this.logger.error(`Worker tick failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /** Process a single job (exposed for tests / manual triggering). */
  async processJob(job: ProcessingJob): Promise<void> {
    await this.prisma.processingJob.update({
      where: { id: job.id },
      data: { status: 'running', startedAt: new Date(), attempts: { increment: 1 } },
    });

    try {
      await this.dispatch(job);
      await this.prisma.processingJob.update({
        where: { id: job.id },
        data: { status: 'success', finishedAt: new Date(), errorMessage: null },
      });
    } catch (err) {
      const message = (err as Error).message;
      this.logger.warn(`Job ${job.id} (${job.jobType}) failed: ${message}`);
      await this.prisma.processingJob.update({
        where: { id: job.id },
        data: { status: 'failed', finishedAt: new Date(), errorMessage: message },
      });
      if (job.documentId && this.isSyncJob(job.jobType)) {
        await this.prisma.document.update({
          where: { id: job.documentId },
          data: { status: 'error' },
        });
      }
    }
  }

  private isSyncJob(jobType: string): boolean {
    return (
      jobType === ProcessingJobType.DifyCreateDocument ||
      jobType === ProcessingJobType.DifyUpdateDocument ||
      jobType === ProcessingJobType.DifyReindexDocument
    );
  }

  private async dispatch(job: ProcessingJob): Promise<void> {
    if (!job.documentId) return;
    switch (job.jobType) {
      case ProcessingJobType.DifyCreateDocument:
      case ProcessingJobType.DifyUpdateDocument:
      case ProcessingJobType.DifyReindexDocument:
        await this.difySync.syncDocument(job.documentId);
        await this.enqueuePoll(job.documentId);
        break;
      case ProcessingJobType.DifyPollIndexingStatus:
        await this.difySync.pollDocument(job.documentId);
        await this.maybeRequeuePoll(job.documentId);
        break;
      case ProcessingJobType.DifyArchiveDocument:
        await this.difySync.archiveDocument(job.documentId);
        break;
      case ProcessingJobType.DifyRestoreDocument:
        await this.difySync.restoreDocument(job.documentId);
        await this.enqueuePoll(job.documentId);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.jobType}`);
    }
  }

  private async enqueuePoll(documentId: string): Promise<void> {
    await this.prisma.processingJob.create({
      data: { documentId, jobType: ProcessingJobType.DifyPollIndexingStatus, status: 'queued' },
    });
  }

  private async maybeRequeuePoll(documentId: string): Promise<void> {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (doc && doc.status !== 'indexed' && doc.status !== 'error' && doc.status !== 'deleted') {
      await this.enqueuePoll(documentId);
    }
  }
}
