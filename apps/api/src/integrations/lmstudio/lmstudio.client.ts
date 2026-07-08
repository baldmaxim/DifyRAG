import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LmStudioConfig } from '../../config/configuration';

interface OpenAiModelsResponse {
  data: Array<{ id: string; object?: string }>;
}

interface OpenAiEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model?: string;
}

/**
 * OpenAI-compatible client for LM Studio. Used ONLY for health/diagnostics —
 * the app never generates document embeddings itself (Dify does, via LM Studio).
 */
@Injectable()
export class LmStudioClient {
  private readonly cfg: LmStudioConfig;

  constructor(config: ConfigService) {
    this.cfg = config.getOrThrow<LmStudioConfig>('lmStudio');
  }

  isConfigured(): boolean {
    return Boolean(this.cfg.baseUrl);
  }

  private base(): string {
    return this.cfg.baseUrl.replace(/\/$/, '');
  }

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    try {
      const res = await fetch(`${this.base()}${path}`, { ...init, signal: controller.signal });
      if (!res.ok) {
        throw new Error(`LM Studio ${path} -> ${res.status}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async listModels(): Promise<string[]> {
    const res = await this.fetchJson<OpenAiModelsResponse>('/models');
    return res.data.map((m) => m.id);
  }

  async createTestEmbedding(input = 'health check', model?: string): Promise<number[]> {
    const res = await this.fetchJson<OpenAiEmbeddingResponse>('/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model ?? this.cfg.embeddingModel, input }),
    });
    return res.data[0]?.embedding ?? [];
  }

  async detectEmbeddingDimension(model?: string): Promise<number> {
    const embedding = await this.createTestEmbedding('health check', model);
    return embedding.length;
  }
}
