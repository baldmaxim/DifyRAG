import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { QdrantConfig } from '../../config/configuration';

/**
 * READ-ONLY Qdrant client. Qdrant is managed by Dify; the app must NEVER write.
 * This client intentionally exposes only health/list/get — no upsert, no delete
 * points, no update vectors, no overwrite payload. A unit test enforces this.
 */
@Injectable()
export class QdrantReadonlyClient {
  private readonly cfg: QdrantConfig;

  constructor(config: ConfigService) {
    this.cfg = config.getOrThrow<QdrantConfig>('qdrant');
  }

  isConfigured(): boolean {
    return Boolean(this.cfg.url);
  }

  private headers(): Record<string, string> {
    return this.cfg.apiKey ? { 'api-key': this.cfg.apiKey } : {};
  }

  private base(): string {
    return this.cfg.url.replace(/\/$/, '');
  }

  private async get<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(`${this.base()}${path}`, {
        method: 'GET',
        headers: this.headers(),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Qdrant ${path} -> ${res.status}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async health(): Promise<boolean> {
    const res = await fetch(`${this.base()}/readyz`, { headers: this.headers() });
    return res.ok;
  }

  async listCollections(): Promise<string[]> {
    const res = await this.get<{ result: { collections: Array<{ name: string }> } }>('/collections');
    return res.result.collections.map((c) => c.name);
  }

  async getCollection(name: string): Promise<unknown> {
    const res = await this.get<{ result: unknown }>(`/collections/${encodeURIComponent(name)}`);
    return res.result;
  }
}
