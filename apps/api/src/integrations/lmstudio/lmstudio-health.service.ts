import { Injectable } from '@nestjs/common';
import type { LmStudioConfig } from '../../config/configuration';
import { SettingsService } from '../../settings/settings.service';
import type { HealthResult } from '../health.types';
import { LmStudioClient } from './lmstudio.client';

@Injectable()
export class LmStudioHealthService {
  constructor(
    private readonly client: LmStudioClient,
    private readonly settings: SettingsService,
  ) {}

  private get cfg(): LmStudioConfig {
    return this.settings.lmStudio();
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
      // Only flag degraded when an expected dimension is configured (> 0) and it
      // mismatches — so any embedding model (small local or Qwen3-8B) reads as ok
      // when LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION is set to its real value (or 0).
      const degraded = expected > 0 && dimension !== expected;
      return {
        provider: 'lmstudio',
        status: degraded ? 'degraded' : 'ok',
        latencyMs: Date.now() - start,
        details: {
          baseUrl: this.cfg.baseUrl,
          embeddingModel: this.cfg.embeddingModel,
          expectedDimension: expected,
          detectedDimension: dimension,
          dimensionEnforced: expected > 0,
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
