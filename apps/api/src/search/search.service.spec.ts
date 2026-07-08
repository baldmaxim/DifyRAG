import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { DifyAppService } from '../integrations/dify/dify-app.service';
import type { DifySearchService } from '../integrations/dify/dify-search.service';
import type { ActorContext } from '../common/types/actor-context';
import type { DatasetResolverService } from './dataset-resolver.service';
import { SearchService } from './search.service';

const config = {
  getOrThrow: () => ({ retrieveTopK: 10, retrieveScoreThreshold: 0.2 }),
} as unknown as ConfigService;

const ctx: ActorContext = { actor: { actorType: 'user', actorUserId: 'u1' }, userId: 'u1' };

function build(opts: {
  datasetIds: string[];
  chunks?: Array<{ content: string; score: number; datasetId: string; difyDocumentId: string | null }>;
  appConfigured?: boolean;
}) {
  const resolver = {
    resolve: vi.fn(async () => ({ datasetIds: opts.datasetIds, projectId: 'p1', warnings: [] })),
  } as unknown as DatasetResolverService;

  const difySearch = {
    retrieveFromDataset: vi.fn(async () => opts.chunks ?? []),
  } as unknown as DifySearchService;

  const difyApp = {
    isConfigured: () => opts.appConfigured ?? false,
    generateAnswer: vi.fn(async () => 'the answer'),
  } as unknown as DifyAppService;

  const prisma = {
    difyDocumentMapping: {
      findMany: vi.fn(async () => [{ difyDocumentId: 'dd1', documentId: 'doc1' }]),
    },
    document: {
      findMany: vi.fn(async () => [
        {
          id: 'doc1',
          title: 'КС-2 июнь',
          currentVersionId: 'v1',
          currentVersion: { originalFileName: 'ks2.pdf' },
          folder: { path: '07-finance/03-ks2-ks3/01-customer-ks2' },
          project: { code: 'zilart-lot-31' },
          documentType: { code: 'ks2' },
        },
      ]),
    },
    ragSearchLog: { create: vi.fn(async () => ({})) },
  } as unknown as PrismaService;

  const service = new SearchService(prisma, resolver, difySearch, difyApp, config);
  return { service, prisma, difyApp };
}

describe('SearchService', () => {
  it('returns empty result and logs when no datasets resolve', async () => {
    const { service, prisma } = build({ datasetIds: [] });
    const res = await service.search({ query: 'q' }, { ctx, includePrivate: false });
    expect(res.chunks).toEqual([]);
    expect((prisma.ragSearchLog.create as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('enriches chunks with document metadata from Postgres', async () => {
    const { service } = build({
      datasetIds: ['ds1'],
      chunks: [{ content: 'hello', score: 0.9, datasetId: 'ds1', difyDocumentId: 'dd1' }],
    });
    const res = await service.search(
      { query: 'q', folder_path: '07-finance', document_type: 'ks2' },
      { ctx, includePrivate: false },
    );
    expect(res.chunks).toHaveLength(1);
    expect(res.chunks[0]?.document_title).toBe('КС-2 июнь');
    expect(res.chunks[0]?.project_code).toBe('zilart-lot-31');
    expect(res.sources[0]?.document_id).toBe('doc1');
  });

  it('warns answer_mode_not_configured when app key is missing', async () => {
    const { service } = build({
      datasetIds: ['ds1'],
      chunks: [{ content: 'x', score: 0.5, datasetId: 'ds1', difyDocumentId: 'dd1' }],
      appConfigured: false,
    });
    const res = await service.search({ query: 'q', mode: 'answer' }, { ctx, includePrivate: false });
    expect(res.answer).toBeNull();
    expect(res.warnings).toContain('answer_mode_not_configured');
  });

  it('returns a Dify answer when the app key is configured', async () => {
    const { service } = build({
      datasetIds: ['ds1'],
      chunks: [{ content: 'x', score: 0.5, datasetId: 'ds1', difyDocumentId: 'dd1' }],
      appConfigured: true,
    });
    const res = await service.search({ query: 'q', mode: 'answer' }, { ctx, includePrivate: false });
    expect(res.answer).toBe('the answer');
  });
});
