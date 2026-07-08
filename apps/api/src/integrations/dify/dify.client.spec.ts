import type { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DifyConfig } from '../../config/configuration';
import { DifyApiError, DifyClient } from './dify.client';

const difyConfig: DifyConfig = {
  enabled: true,
  baseUrl: 'http://dify.local',
  apiPrefix: '/v1',
  knowledgeApiKey: 'test-key',
  appApiKey: undefined,
  timeoutMs: 5000,
  autoCreateDatasets: true,
  datasetStrategy: 'project_section',
  defaultIndexingTechnique: 'high_quality',
  defaultDocForm: 'text_model',
  defaultDocLanguage: 'Russian',
  chunkMaxTokens: 700,
  chunkOverlap: 80,
  retrieveTopK: 12,
  retrieveScoreThreshold: 0.2,
};

const config = { getOrThrow: () => difyConfig } as unknown as ConfigService;

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    })),
  );
}

describe('DifyClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('createDocumentByFile posts multipart to the create-by-file endpoint', async () => {
    mockFetch(200, { document: { id: 'doc-1' }, batch: 'batch-1' });
    const client = new DifyClient(config);
    const res = await client.createDocumentByFile({
      datasetId: 'ds-1',
      file: new Uint8Array([1, 2, 3]),
      fileName: 'a.pdf',
      mimeType: 'application/pdf',
      data: { indexing_technique: 'high_quality' },
    });
    expect(res.document.id).toBe('doc-1');
    expect(res.batch).toBe('batch-1');

    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(call[0])).toContain('/v1/datasets/ds-1/document/create-by-file');
    expect(call[1].method).toBe('POST');
    expect(call[1].body).toBeInstanceOf(FormData);
  });

  it('updateDocumentByFile targets the update-by-file endpoint', async () => {
    mockFetch(200, { document: { id: 'doc-1' }, batch: 'batch-2' });
    const client = new DifyClient(config);
    await client.updateDocumentByFile({
      datasetId: 'ds-1',
      documentId: 'doc-1',
      file: new Uint8Array([1]),
      fileName: 'a.pdf',
      mimeType: 'application/pdf',
      data: {},
    });
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(call[0])).toContain('/v1/datasets/ds-1/documents/doc-1/update-by-file');
  });

  it('getDocumentIndexingStatus hits the indexing-status endpoint', async () => {
    mockFetch(200, { data: [{ id: 'doc-1', indexing_status: 'indexing' }] });
    const client = new DifyClient(config);
    const res = await client.getDocumentIndexingStatus('ds-1', 'batch-1');
    expect(res.data[0]?.indexing_status).toBe('indexing');
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(call[0])).toContain('/v1/datasets/ds-1/documents/batch-1/indexing-status');
  });

  it('retrieve posts a semantic search body', async () => {
    mockFetch(200, { records: [{ segment: { id: 's1', content: 'hi' }, score: 0.9 }] });
    const client = new DifyClient(config);
    const res = await client.retrieve('ds-1', 'query', { top_k: 5 });
    expect(res.records[0]?.score).toBe(0.9);
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(call[0])).toContain('/v1/datasets/ds-1/retrieve');
    expect(JSON.parse(call[1].body)).toMatchObject({ query: 'query' });
  });

  it('throws DifyApiError on a non-2xx response', async () => {
    mockFetch(404, { message: 'not found' });
    const client = new DifyClient(config);
    await expect(client.getDataset('missing')).rejects.toBeInstanceOf(DifyApiError);
  });

  it('throws setup_required when not configured', async () => {
    const unconfigured = {
      getOrThrow: () => ({ ...difyConfig, knowledgeApiKey: undefined }),
    } as unknown as ConfigService;
    const client = new DifyClient(unconfigured);
    await expect(client.listDatasets()).rejects.toThrow(/not configured/i);
  });
});
