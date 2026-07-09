import { Injectable } from '@nestjs/common';
import type { DifyConfig } from '../../config/configuration';
import { SettingsService } from '../../settings/settings.service';
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
  constructor(
    private readonly dify: DifyClient,
    private readonly settings: SettingsService,
  ) {}

  private get cfg(): DifyConfig {
    return this.settings.dify();
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
