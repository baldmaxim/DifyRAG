import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { DifyHealthService } from './dify/dify-health.service';
import type { HealthResult } from './health.types';
import { LmStudioHealthService } from './lmstudio/lmstudio-health.service';
import { QdrantHealthService } from './qdrant/qdrant-health.service';
import { S3HealthService } from './s3-health.service';

@Injectable()
export class IntegrationsHealthService {
  private readonly logger = new Logger(IntegrationsHealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dify: DifyHealthService,
    private readonly lmStudio: LmStudioHealthService,
    private readonly qdrant: QdrantHealthService,
    private readonly s3: S3HealthService,
  ) {}

  private async persist(result: HealthResult): Promise<void> {
    try {
      await this.prisma.integrationHealthCheck.create({
        data: {
          provider: result.provider,
          status: result.status,
          latencyMs: result.latencyMs ?? null,
          details: result.details as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to persist ${result.provider} health: ${(err as Error).message}`);
    }
  }

  async checkOne(provider: 'dify' | 'lmstudio' | 'qdrant' | 's3'): Promise<HealthResult> {
    const result = await this.runProvider(provider);
    await this.persist(result);
    return result;
  }

  async checkAll(): Promise<HealthResult[]> {
    const results = await Promise.all([
      this.dify.check(),
      this.lmStudio.check(),
      this.qdrant.check(),
      this.s3.check(),
    ]);
    await Promise.all(results.map((r) => this.persist(r)));
    return results;
  }

  private runProvider(provider: 'dify' | 'lmstudio' | 'qdrant' | 's3'): Promise<HealthResult> {
    switch (provider) {
      case 'dify':
        return this.dify.check();
      case 'lmstudio':
        return this.lmStudio.check();
      case 'qdrant':
        return this.qdrant.check();
      case 's3':
        return this.s3.check();
    }
  }
}
