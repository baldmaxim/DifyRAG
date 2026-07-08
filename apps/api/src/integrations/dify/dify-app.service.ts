import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DifyConfig } from '../../config/configuration';

/**
 * Answer-mode via a Dify chat app (uses DIFY_APP_API_KEY). Answer generation
 * always happens inside Dify — never locally.
 */
@Injectable()
export class DifyAppService {
  private readonly logger = new Logger(DifyAppService.name);
  private readonly cfg: DifyConfig;

  constructor(config: ConfigService) {
    this.cfg = config.getOrThrow<DifyConfig>('dify');
  }

  isConfigured(): boolean {
    return Boolean(this.cfg.enabled && this.cfg.baseUrl && this.cfg.appApiKey);
  }

  private base(): string {
    return `${this.cfg.baseUrl.replace(/\/$/, '')}${this.cfg.apiPrefix}`;
  }

  async generateAnswer(
    query: string,
    inputs: Record<string, unknown>,
    user: string,
  ): Promise<string | null> {
    if (!this.isConfigured()) {
      return null;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    try {
      const res = await fetch(`${this.base()}/chat-messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.cfg.appApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs, query, response_mode: 'blocking', user }),
        signal: controller.signal,
      });
      if (!res.ok) {
        this.logger.warn(`Dify app chat-messages -> ${res.status}`);
        return null;
      }
      const json = (await res.json()) as { answer?: string };
      return json.answer ?? null;
    } catch (err) {
      this.logger.warn(`Dify app answer failed: ${(err as Error).message}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
