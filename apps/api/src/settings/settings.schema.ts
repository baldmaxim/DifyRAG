export type SettingType = 'string' | 'number' | 'boolean';

export interface SettingField {
  field: string; // must match the config interface property name
  label: string;
  type: SettingType;
  secret?: boolean;
}

export interface SettingGroupDef {
  group: string; // must match a RootConfig key (s3, dify, lmStudio, qdrant, processing, security)
  label: string;
  fields: SettingField[];
}

/**
 * UI-editable settings. Field names match the config interfaces in
 * config/configuration.ts, so DB values overlay the env snapshot directly.
 * Bootstrap-only settings (DATABASE_URL, JWT_*, SETTINGS_ENCRYPTION_KEY, PORT,
 * CORS_ORIGIN) are intentionally NOT here — they stay in env.
 */
export const SETTINGS_GROUPS: SettingGroupDef[] = [
  {
    group: 's3',
    label: 'S3 (Cloud.ru Object Storage)',
    fields: [
      { field: 'endpoint', label: 'Endpoint', type: 'string' },
      { field: 'region', label: 'Region', type: 'string' },
      { field: 'bucket', label: 'Bucket', type: 'string' },
      { field: 'accessKeyId', label: 'Access Key ID', type: 'string' },
      { field: 'secretAccessKey', label: 'Secret Access Key', type: 'string', secret: true },
      { field: 'forcePathStyle', label: 'Force path style', type: 'boolean' },
      { field: 'presignedUrlTtlSeconds', label: 'Presigned URL TTL (s)', type: 'number' },
      { field: 'maxFileSizeBytes', label: 'Max file size (bytes)', type: 'number' },
    ],
  },
  {
    group: 'dify',
    label: 'Dify (RAG engine)',
    fields: [
      { field: 'enabled', label: 'Enabled', type: 'boolean' },
      { field: 'baseUrl', label: 'Base URL', type: 'string' },
      { field: 'apiPrefix', label: 'API prefix', type: 'string' },
      { field: 'knowledgeApiKey', label: 'Knowledge API key', type: 'string', secret: true },
      { field: 'appApiKey', label: 'App API key (answer mode)', type: 'string', secret: true },
      { field: 'timeoutMs', label: 'Timeout (ms)', type: 'number' },
      { field: 'autoCreateDatasets', label: 'Auto-create datasets', type: 'boolean' },
      { field: 'defaultIndexingTechnique', label: 'Indexing technique', type: 'string' },
      { field: 'defaultDocForm', label: 'Doc form', type: 'string' },
      { field: 'defaultDocLanguage', label: 'Doc language', type: 'string' },
      { field: 'retrieveTopK', label: 'Retrieve top_k', type: 'number' },
      { field: 'retrieveScoreThreshold', label: 'Score threshold', type: 'number' },
    ],
  },
  {
    group: 'lmStudio',
    label: 'LM Studio (embeddings)',
    fields: [
      { field: 'baseUrl', label: 'Base URL', type: 'string' },
      { field: 'embeddingModel', label: 'Embedding model', type: 'string' },
      { field: 'expectedEmbeddingDimension', label: 'Expected dimension (0 = off)', type: 'number' },
      { field: 'timeoutMs', label: 'Timeout (ms)', type: 'number' },
    ],
  },
  {
    group: 'qdrant',
    label: 'Qdrant (read-only health)',
    fields: [
      { field: 'url', label: 'URL', type: 'string' },
      { field: 'apiKey', label: 'API key', type: 'string', secret: true },
      { field: 'healthcheckEnabled', label: 'Healthcheck enabled', type: 'boolean' },
    ],
  },
  {
    group: 'processing',
    label: 'Processing worker',
    fields: [
      { field: 'workerEnabled', label: 'Worker enabled', type: 'boolean' },
      { field: 'pollIntervalMs', label: 'Poll interval (ms)', type: 'number' },
      { field: 'maxAttempts', label: 'Max attempts', type: 'number' },
    ],
  },
  {
    group: 'security',
    label: 'Security limits',
    fields: [{ field: 'externalRateLimitPerMin', label: 'External rate limit / min', type: 'number' }],
  },
];

export function findGroup(group: string): SettingGroupDef | undefined {
  return SETTINGS_GROUPS.find((g) => g.group === group);
}
