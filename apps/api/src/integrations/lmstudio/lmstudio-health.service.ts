import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LmStudioConfig } from '../../config/configuration';
import type { HealthResult } from '../health.types';
import { LmStudioClient } from './lmstudio.client';

@Injectable()
export class LmStudioHealthService {
  private readonly cfg: LmStudioConfig;

  constructor(
    private readonly client: LmStudioClient,
    config: ConfigService,
  ) {
    this.cfg = config.getOrThrow<LmStudioConfig>('lmStudio');
  }

  async check(): Promise<HealthResult> {
    if (!this.client.isConfigured()) {
      return { provider: 'lmstudio', status: 'setup_required', details: { reason: 'not configured' } };
    }
    const start = Date.now();
    try {
      const models = await this.client.listModels();
      const dimension = await this.client.detectEmbeddingDimension();
      const expected = this.cfg.expectedEmbeddingDimension;
      const degraded = dimension !== expected;
      return {
        provider: 'lmstudio',
        status: degraded ? 'degraded' : 'ok',
        latencyMs: Date.now() - start,
        details: {
          baseUrl: this.cfg.baseUrl,
          embeddingModel: this.cfg.embeddingModel,
          expectedDimension: expected,
          detectedDimension: dimension,
          models,
        },
      };
    } catch (err) {
      return {
        provider: 'lmstudio',
        status: 'down',
        latencyMs: Date.now() - start,
        details: { baseUrl: this.cfg.baseUrl, error: (err as Error).message },
      };
    }
  }
}
