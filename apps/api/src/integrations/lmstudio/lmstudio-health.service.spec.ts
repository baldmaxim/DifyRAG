import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { LmStudioConfig } from '../../config/configuration';
import { LmStudioHealthService } from './lmstudio-health.service';
import type { LmStudioClient } from './lmstudio.client';

function configWith(expectedEmbeddingDimension: number): ConfigService {
  const cfg: LmStudioConfig = {
    baseUrl: 'http://localhost:1234/v1',
    embeddingModel: 'qwen3-embedding-8b',
    expectedEmbeddingDimension,
    timeoutMs: 5000,
  };
  return { getOrThrow: () => cfg } as unknown as ConfigService;
}
const config = configWith(4096);

function clientWith(dimension: number, configured = true): LmStudioClient {
  return {
    isConfigured: () => configured,
    listModels: vi.fn(async () => ['qwen3-embedding-8b']),
    detectEmbeddingDimension: vi.fn(async () => dimension),
  } as unknown as LmStudioClient;
}

describe('LmStudioHealthService', () => {
  it('reports ok when the embedding dimension matches', async () => {
    const service = new LmStudioHealthService(clientWith(4096), config);
    const result = await service.check();
    expect(result.status).toBe('ok');
    expect(result.details.detectedDimension).toBe(4096);
  });

  it('reports degraded when the embedding dimension mismatches', async () => {
    const service = new LmStudioHealthService(clientWith(1024), config);
    const result = await service.check();
    expect(result.status).toBe('degraded');
  });

  it('reports setup_required when not configured', async () => {
    const service = new LmStudioHealthService(clientWith(4096, false), config);
    const result = await service.check();
    expect(result.status).toBe('setup_required');
  });

  it('does not flag degraded when the expected dimension is not enforced (0)', async () => {
    // A smaller local model (e.g. 768) is fine when the expected dim is left at 0.
    const service = new LmStudioHealthService(clientWith(768), configWith(0));
    const result = await service.check();
    expect(result.status).toBe('ok');
    expect(result.details.dimensionEnforced).toBe(false);
    expect(result.details.detectedDimension).toBe(768);
  });
});
