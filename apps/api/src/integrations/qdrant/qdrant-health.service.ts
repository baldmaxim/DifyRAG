import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { QdrantConfig } from '../../config/configuration';
import type { HealthResult } from '../health.types';
import { QdrantReadonlyClient } from './qdrant-readonly.client';

@Injectable()
export class QdrantHealthService {
  private readonly cfg: QdrantConfig;

  constructor(
    private readonly client: QdrantReadonlyClient,
    config: ConfigService,
  ) {
    this.cfg = config.getOrThrow<QdrantConfig>('qdrant');
  }

  async check(): Promise<HealthResult> {
    if (!this.cfg.healthcheckEnabled) {
      return { provider: 'qdrant', status: 'setup_required', details: { reason: 'healthcheck disabled' } };
    }
    const start = Date.now();
    try {
      const ok = await this.client.health();
      const collections = ok ? await this.client.listCollections() : [];
      return {
        provider: 'qdrant',
        status: ok ? 'ok' : 'down',
        latencyMs: Date.now() - start,
        details: {
          managedBy: 'dify',
          note: 'Qdrant is managed by Dify; the app never writes to it.',
          collectionCount: collections.length,
        },
      };
    } catch (err) {
      return {
        provider: 'qdrant',
        status: 'down',
        latencyMs: Date.now() - start,
        details: { error: (err as Error).message },
      };
    }
  }
}
