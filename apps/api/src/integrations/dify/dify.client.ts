import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DifyConfig } from '../../config/configuration';
import type {
  CreateDatasetParams,
  CreateDocumentByFileParams,
  DifyCreateDocumentResponse,
  DifyDataset,
  DifyDocumentRef,
  DifyDocumentStatusAction,
  DifyIndexingStatusResponse,
  DifyListDatasetsResponse,
  DifyRetrieveOptions,
  DifyRetrieveResponse,
  UpdateDocumentByFileParams,
} from './dify.types';

interface RequestOptions {
  method: string;
  path: string;
  json?: unknown;
  query?: Record<string, string | number | undefined>;
  form?: FormData;
}

/**
 * Server-side client for the Dify Knowledge API. Holds the Knowledge API key —
 * never exposed to the frontend.
 */
@Injectable()
export class DifyClient {
  private readonly logger = new Logger(DifyClient.name);
  private readonly cfg: DifyConfig;

  constructor(config: ConfigService) {
    this.cfg = config.getOrThrow<DifyConfig>('dify');
  }

  isConfigured(): boolean {
    return Boolean(this.cfg.enabled && this.cfg.baseUrl && this.cfg.knowledgeApiKey);
  }

  private baseUrl(): string {
    return `${this.cfg.baseUrl.replace(/\/$/, '')}${this.cfg.apiPrefix}`;
  }

  private async request<T>(opts: RequestOptions): Promise<T> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Dify is not configured (setup_required)');
    }
    const url = new URL(`${this.baseUrl()}${opts.path}`);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.cfg.knowledgeApiKey}`,
    };
    let body: string | FormData | undefined;
    if (opts.form) {
      body = opts.form; // fetch sets multipart boundary automatically
    } else if (opts.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.json);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    try {
      const res = await fetch(url, { method: opts.method, headers, body, signal: controller.signal });
      const text = await res.text();
      if (!res.ok) {
        this.logger.warn(`Dify ${opts.method} ${opts.path} -> ${res.status}`);
        throw new DifyApiError(res.status, opts.path, text);
      }
      return (text ? JSON.parse(text) : {}) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Datasets ──────────────────────────────────────────────

  listDatasets(page = 1, limit = 100): Promise<DifyListDatasetsResponse> {
    return this.request({ method: 'GET', path: '/datasets', query: { page, limit } });
  }

  createDataset(params: CreateDatasetParams): Promise<DifyDataset> {
    return this.request({ method: 'POST', path: '/datasets', json: params });
  }

  getDataset(datasetId: string): Promise<DifyDataset> {
    return this.request({ method: 'GET', path: `/datasets/${datasetId}` });
  }

  updateDataset(datasetId: string, params: Partial<CreateDatasetParams>): Promise<DifyDataset> {
    return this.request({ method: 'PATCH', path: `/datasets/${datasetId}`, json: params });
  }

  // ── Documents ─────────────────────────────────────────────

  private fileForm(params: CreateDocumentByFileParams): FormData {
    const form = new FormData();
    form.append('data', JSON.stringify(params.data));
    const blob = new Blob([params.file], { type: params.mimeType || 'application/octet-stream' });
    form.append('file', blob, params.fileName);
    return form;
  }

  createDocumentByFile(params: CreateDocumentByFileParams): Promise<DifyCreateDocumentResponse> {
    return this.request({
      method: 'POST',
      path: `/datasets/${params.datasetId}/document/create-by-file`,
      form: this.fileForm(params),
    });
  }

  updateDocumentByFile(params: UpdateDocumentByFileParams): Promise<DifyCreateDocumentResponse> {
    return this.request({
      method: 'POST',
      path: `/datasets/${params.datasetId}/documents/${params.documentId}/update-by-file`,
      form: this.fileForm(params),
    });
  }

  getDocument(datasetId: string, documentId: string): Promise<DifyDocumentRef> {
    return this.request({ method: 'GET', path: `/datasets/${datasetId}/documents/${documentId}` });
  }

  listDocuments(
    datasetId: string,
    filters: { keyword?: string; page?: number; limit?: number } = {},
  ): Promise<{ data: DifyDocumentRef[] }> {
    return this.request({
      method: 'GET',
      path: `/datasets/${datasetId}/documents`,
      query: { keyword: filters.keyword, page: filters.page, limit: filters.limit },
    });
  }

  getDocumentIndexingStatus(datasetId: string, batch: string): Promise<DifyIndexingStatusResponse> {
    return this.request({
      method: 'GET',
      path: `/datasets/${datasetId}/documents/${batch}/indexing-status`,
    });
  }

  updateDocumentStatusBatch(
    datasetId: string,
    action: DifyDocumentStatusAction,
    documentIds: string[],
  ): Promise<{ result: string }> {
    return this.request({
      method: 'PATCH',
      path: `/datasets/${datasetId}/documents/status/${action}`,
      json: { document_ids: documentIds },
    });
  }

  /** Only use when archive/disable are impossible — removes from the index (not S3). */
  deleteDocumentFromDify(datasetId: string, documentId: string): Promise<{ result: string }> {
    return this.request({
      method: 'DELETE',
      path: `/datasets/${datasetId}/documents/${documentId}`,
    });
  }

  retrieve(
    datasetId: string,
    query: string,
    options: DifyRetrieveOptions = {},
  ): Promise<DifyRetrieveResponse> {
    return this.request({
      method: 'POST',
      path: `/datasets/${datasetId}/retrieve`,
      json: {
        query,
        retrieval_model: {
          search_method: options.search_method ?? 'semantic_search',
          reranking_enable: options.reranking_enable ?? false,
          top_k: options.top_k,
          score_threshold_enabled: options.score_threshold_enabled ?? Boolean(options.score_threshold),
          score_threshold: options.score_threshold,
        },
      },
    });
  }
}

export class DifyApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly body: string,
  ) {
    super(`Dify API error ${status} on ${path}: ${body.slice(0, 300)}`);
    this.name = 'DifyApiError';
  }
}
