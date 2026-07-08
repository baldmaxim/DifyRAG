import { Injectable } from '@nestjs/common';
import { DifyClient } from './dify.client';
import type { HealthResult } from '../health.types';

@Injectable()
export class DifyHealthService {
  constructor(private readonly dify: DifyClient) {}

  async check(): Promise<HealthResult> {
    if (!this.dify.isConfigured()) {
      return { provider: 'dify', status: 'setup_required', details: { reason: 'not configured' } };
    }
    const start = Date.now();
    try {
      const res = await this.dify.listDatasets(1, 1);
      return {
        provider: 'dify',
        status: 'ok',
        latencyMs: Date.now() - start,
        details: { datasetsVisible: res.total ?? res.data.length },
      };
    } catch (err) {
      return {
        provider: 'dify',
        status: 'down',
        latencyMs: Date.now() - start,
        details: { error: (err as Error).message },
      };
    }
  }
}
