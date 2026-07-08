import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DifyConfig } from '../../config/configuration';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { StorageService } from '../../storage/storage.service';
import type { DifyClient } from './dify.client';
import type { DifyDatasetMappingService } from './dify-dataset-mapping.service';
import { DifyDocumentSyncService } from './dify-document-sync.service';

const difyConfig = {
  defaultIndexingTechnique: 'high_quality',
  defaultDocForm: 'text_model',
  defaultDocLanguage: 'Russian',
} as unknown as DifyConfig;

const config = { getOrThrow: () => difyConfig } as unknown as ConfigService;

const baseDoc = {
  id: 'doc-1',
  scope: 'project',
  projectId: 'p-1',
  departmentId: null,
  currentVersionId: 'ver-1',
  folder: { path: '07-finance/03-ks2-ks3/01-customer-ks2' },
  project: { code: 'zilart-lot-31' },
  currentVersion: { s3Key: 'documents/...', originalFileName: 'ks2.pdf', mimeType: 'application/pdf' },
};

interface Mocks {
  prisma: PrismaService;
  dify: DifyClient;
  datasetMapping: DifyDatasetMappingService;
  storage: StorageService;
  calls: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    statusBatch: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    mappingUpdate: ReturnType<typeof vi.fn>;
  };
}

function buildMocks(overrides: { prior?: unknown; findMany?: unknown[] } = {}): Mocks {
  const create = vi.fn(async () => ({ document: { id: 'dify-doc-1' }, batch: 'batch-1' }));
  const update = vi.fn(async () => ({ document: { id: 'dify-doc-1' }, batch: 'batch-2' }));
  const statusBatch = vi.fn(async () => ({ result: 'success' }));
  const upsert = vi.fn(async () => ({}));
  const mappingUpdate = vi.fn(async () => ({}));

  const prisma = {
    document: { findUnique: vi.fn(async () => baseDoc), update: vi.fn(async () => ({})) },
    difyDocumentMapping: {
      findFirst: vi.fn(async () => overrides.prior ?? null),
      findMany: vi.fn(async () => overrides.findMany ?? []),
      upsert,
      update: mappingUpdate,
    },
  } as unknown as PrismaService;

  const dify = {
    createDocumentByFile: create,
    updateDocumentByFile: update,
    updateDocumentStatusBatch: statusBatch,
    deleteDocumentFromDify: vi.fn(async () => ({ result: 'success' })),
    getDocumentIndexingStatus: vi.fn(async () => ({ data: [] })),
  } as unknown as DifyClient;

  const datasetMapping = {
    resolveMapping: vi.fn(async () => ({ id: 'map-1', difyDatasetId: null })),
    ensureDataset: vi.fn(async () => ({ id: 'map-1', difyDatasetId: 'ds-1' })),
  } as unknown as DifyDatasetMappingService;

  const storage = {
    getObjectBytes: vi.fn(async () => new Uint8Array([1, 2, 3])),
  } as unknown as StorageService;

  return { prisma, dify, datasetMapping, storage, calls: { create, update, statusBatch, upsert, mappingUpdate } };
}

describe('DifyDocumentSyncService', () => {
  let m: Mocks;
  let service: DifyDocumentSyncService;

  beforeEach(() => {
    m = buildMocks();
    service = new DifyDocumentSyncService(m.prisma, m.dify, m.datasetMapping, m.storage, config);
  });

  it('create path: create-by-file when there is no prior Dify document', async () => {
    await service.syncDocument('doc-1');
    expect(m.calls.create).toHaveBeenCalledTimes(1);
    expect(m.calls.update).not.toHaveBeenCalled();
    expect(m.calls.upsert).toHaveBeenCalledTimes(1);
  });

  it('update path: update-by-file when a prior Dify document exists', async () => {
    m = buildMocks({ prior: { difyDocumentId: 'dify-doc-1' } });
    service = new DifyDocumentSyncService(m.prisma, m.dify, m.datasetMapping, m.storage, config);
    await service.syncDocument('doc-1');
    expect(m.calls.update).toHaveBeenCalledTimes(1);
    expect(m.calls.create).not.toHaveBeenCalled();
  });

  it('archive path: archives the Dify document', async () => {
    m = buildMocks({ findMany: [{ id: 'dm-1', difyDatasetId: 'ds-1', difyDocumentId: 'dify-doc-1' }] });
    service = new DifyDocumentSyncService(m.prisma, m.dify, m.datasetMapping, m.storage, config);
    await service.archiveDocument('doc-1');
    expect(m.calls.statusBatch).toHaveBeenCalledWith('ds-1', 'archive', ['dify-doc-1']);
    expect(m.calls.mappingUpdate).toHaveBeenCalled();
  });

  it('restore path: un_archives the Dify document', async () => {
    m = buildMocks({ findMany: [{ id: 'dm-1', difyDatasetId: 'ds-1', difyDocumentId: 'dify-doc-1', indexingStatus: 'archived' }] });
    service = new DifyDocumentSyncService(m.prisma, m.dify, m.datasetMapping, m.storage, config);
    await service.restoreDocument('doc-1');
    expect(m.calls.statusBatch).toHaveBeenCalledWith('ds-1', 'un_archive', ['dify-doc-1']);
  });
});
