import { Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import type { HealthResult } from './health.types';

@Injectable()
export class S3HealthService {
  constructor(private readonly storage: StorageService) {}

  async check(): Promise<HealthResult> {
    if (!this.storage.isConfigured()) {
      return { provider: 's3', status: 'setup_required', details: { reason: 'not configured' } };
    }
    const start = Date.now();
    try {
      // Probe a key that almost certainly does not exist: a NotFound (404) proves
      // the bucket is reachable and credentials are valid without needing to write.
      await this.storage.headObject('__healthcheck__/probe');
      return { provider: 's3', status: 'ok', latencyMs: Date.now() - start, details: {} };
    } catch (err) {
      const message = (err as Error).message ?? '';
      const name = (err as { name?: string }).name ?? '';
      const reachable = /NotFound|404|NoSuchKey/i.test(`${name} ${message}`);
      return {
        provider: 's3',
        status: reachable ? 'ok' : 'down',
        latencyMs: Date.now() - start,
        details: reachable ? { note: 'reachable (probe key absent)' } : { error: message },
      };
    }
  }
}
