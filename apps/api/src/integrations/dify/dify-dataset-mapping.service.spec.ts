import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { DifyApiError, DifyClient } from './dify.client';
import { DatasetSetupRequiredError, DifyDatasetMappingService } from './dify-dataset-mapping.service';

const BASE_MAPPING = {
  id: 'm1',
  difyDatasetName: 'project_zilart__finance',
  difyDatasetDescription: null,
  indexingTechnique: 'high_quality',
  difyDatasetId: null as string | null,
  status: 'pending',
};

function build(opts: {
  autoCreate?: boolean;
  getDataset?: () => Promise<unknown>;
}) {
  const createDataset = vi.fn(async () => ({ id: 'ds-new', name: BASE_MAPPING.difyDatasetName }));
  const getDataset = vi.fn(opts.getDataset ?? (async () => ({ id: 'ds-existing' })));
  const update = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...BASE_MAPPING, ...data }));

  const dify = { getDataset, createDataset } as unknown as DifyClient;
  const prisma = { difyDatasetMapping: { update } } as unknown as PrismaService;
  const config = {
    getOrThrow: (key: string) =>
      key === 'lmStudio'
        ? { embeddingModel: 'qwen3-embedding-8b' }
        : { autoCreateDatasets: opts.autoCreate ?? true, defaultIndexingTechnique: 'high_quality' },
  } as unknown as ConfigService;

  const service = new DifyDatasetMappingService(prisma, dify, config);
  return { service, createDataset, getDataset, update };
}

describe('DifyDatasetMappingService.ensureDataset', () => {
  it('creates a dataset when none exists yet and records the embedding model', async () => {
    const { service, createDataset, update } = build({});
    const result = await service.ensureDataset({ ...BASE_MAPPING });
    expect(createDataset).toHaveBeenCalledTimes(1);
    expect(result.difyDatasetId).toBe('ds-new');
    const finalUpdate = update.mock.calls.at(-1)?.[0].data as Record<string, unknown>;
    expect(finalUpdate.embeddingModel).toBe('qwen3-embedding-8b');
    expect(finalUpdate.embeddingProvider).toBe('lmstudio');
  });

  it('reuses an existing dataset that still exists in Dify (no recreate)', async () => {
    const { service, createDataset, getDataset } = build({});
    await service.ensureDataset({ ...BASE_MAPPING, difyDatasetId: 'ds-existing' });
    expect(getDataset).toHaveBeenCalledWith('ds-existing');
    expect(createDataset).not.toHaveBeenCalled();
  });

  it('self-heals a stale dataset id (404) by recreating it', async () => {
    const { service, createDataset } = build({
      getDataset: async () => {
        throw new DifyApiError(404, '/datasets/ds-stale', 'not found');
      },
    });
    const result = await service.ensureDataset({ ...BASE_MAPPING, difyDatasetId: 'ds-stale' });
    expect(createDataset).toHaveBeenCalledTimes(1);
    expect(result.difyDatasetId).toBe('ds-new');
  });

  it('throws setup_required when auto-create is disabled and no dataset exists', async () => {
    const { service } = build({ autoCreate: false });
    await expect(service.ensureDataset({ ...BASE_MAPPING })).rejects.toBeInstanceOf(
      DatasetSetupRequiredError,
    );
  });
});
