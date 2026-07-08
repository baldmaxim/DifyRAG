export type IntegrationProviderName = 'dify' | 'lmstudio' | 'qdrant' | 's3';
export type IntegrationStatusName = 'ok' | 'degraded' | 'down' | 'setup_required';

export interface HealthResult {
  provider: IntegrationProviderName;
  status: IntegrationStatusName;
  latencyMs?: number;
  details: Record<string, unknown>;
}
