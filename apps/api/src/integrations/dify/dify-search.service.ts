import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DifyConfig } from '../../config/configuration';
import { DifyClient } from './dify.client';

export interface RetrievedChunk {
  content: string;
  score: number;
  datasetId: string;
  difyDocumentId: string | null;
}

/**
 * Thin wrapper over Dify retrieve. The full multi-dataset search + metadata
 * enrichment + logging lives in the search module (prompt 05).
 */
@Injectable()
export class DifySearchService {
  private readonly cfg: DifyConfig;

  constructor(
    private readonly dify: DifyClient,
    config: ConfigService,
  ) {
    this.cfg = config.getOrThrow<DifyConfig>('dify');
  }

  async retrieveFromDataset(
    datasetId: string,
    query: string,
    options?: { topK?: number; scoreThreshold?: number },
  ): Promise<RetrievedChunk[]> {
    const res = await this.dify.retrieve(datasetId, query, {
      top_k: options?.topK ?? this.cfg.retrieveTopK,
      score_threshold: options?.scoreThreshold ?? this.cfg.retrieveScoreThreshold,
    });
    return res.records.map((r) => ({
      content: r.segment.content,
      score: r.score,
      datasetId,
      difyDocumentId: r.segment.document?.id ?? r.segment.document_id ?? null,
    }));
  }
}
