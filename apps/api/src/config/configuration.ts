/**
 * Central typed configuration derived from environment variables.
 * Secrets live only on the backend and must never be exposed to the frontend.
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
}

export interface DatabaseConfig {
  url: string | undefined;
}

export interface AuthConfig {
  jwtSecret: string | undefined;
  jwtRefreshSecret: string | undefined;
  accessTtl: string;
  refreshTtl: string;
}

export interface S3Config {
  endpoint: string | undefined;
  region: string;
  bucket: string | undefined;
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  forcePathStyle: boolean;
  presignedUrlTtlSeconds: number;
  maxFileSizeBytes: number;
}

export interface DifyConfig {
  enabled: boolean;
  baseUrl: string;
  apiPrefix: string;
  knowledgeApiKey: string | undefined;
  appApiKey: string | undefined;
  timeoutMs: number;
  autoCreateDatasets: boolean;
  datasetStrategy: string;
  defaultIndexingTechnique: string;
  defaultDocForm: string;
  defaultDocLanguage: string;
  chunkMaxTokens: number;
  chunkOverlap: number;
  retrieveTopK: number;
  retrieveScoreThreshold: number;
}

export interface LmStudioConfig {
  baseUrl: string;
  embeddingModel: string;
  expectedEmbeddingDimension: number;
  timeoutMs: number;
}

export interface QdrantConfig {
  url: string;
  apiKey: string | undefined;
  healthcheckEnabled: boolean;
}

export interface QueueConfig {
  pgBossSchema: string;
}

export interface ProcessingConfig {
  workerEnabled: boolean;
  pollIntervalMs: number;
  maxAttempts: number;
}

export interface SecurityConfig {
  externalRateLimitPerMin: number;
  /** Bootstrap-only (env): AES key/passphrase for encrypting UI-managed secrets at rest. */
  settingsEncryptionKey: string | undefined;
}

export interface RootConfig {
  app: AppConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
  s3: S3Config;
  dify: DifyConfig;
  lmStudio: LmStudioConfig;
  qdrant: QdrantConfig;
  queue: QueueConfig;
  processing: ProcessingConfig;
  security: SecurityConfig;
}

const toBool = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toFloat = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const configuration = (): RootConfig => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: toInt(process.env.PORT, 3000),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'ru-central-1',
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: toBool(process.env.S3_FORCE_PATH_STYLE, true),
    presignedUrlTtlSeconds: toInt(process.env.S3_PRESIGNED_URL_TTL_SECONDS, 900),
    maxFileSizeBytes: toInt(process.env.MAX_FILE_SIZE_BYTES, 524_288_000),
  },
  dify: {
    enabled: toBool(process.env.DIFY_ENABLED, true),
    baseUrl: process.env.DIFY_BASE_URL ?? 'http://localhost',
    apiPrefix: process.env.DIFY_API_PREFIX ?? '/v1',
    knowledgeApiKey: process.env.DIFY_KNOWLEDGE_API_KEY,
    appApiKey: process.env.DIFY_APP_API_KEY,
    timeoutMs: toInt(process.env.DIFY_TIMEOUT_MS, 120_000),
    autoCreateDatasets: toBool(process.env.DIFY_AUTO_CREATE_DATASETS, true),
    datasetStrategy: process.env.DIFY_DATASET_STRATEGY ?? 'project_section',
    defaultIndexingTechnique: process.env.DIFY_DEFAULT_INDEXING_TECHNIQUE ?? 'high_quality',
    defaultDocForm: process.env.DIFY_DEFAULT_DOC_FORM ?? 'text_model',
    defaultDocLanguage: process.env.DIFY_DEFAULT_DOC_LANGUAGE ?? 'Russian',
    chunkMaxTokens: toInt(process.env.DIFY_CHUNK_MAX_TOKENS, 700),
    chunkOverlap: toInt(process.env.DIFY_CHUNK_OVERLAP, 80),
    retrieveTopK: toInt(process.env.DIFY_RETRIEVE_TOP_K, 12),
    retrieveScoreThreshold: toFloat(process.env.DIFY_RETRIEVE_SCORE_THRESHOLD, 0.2),
  },
  lmStudio: {
    baseUrl: process.env.LM_STUDIO_BASE_URL ?? 'http://host.docker.internal:1234/v1',
    embeddingModel: process.env.LM_STUDIO_EMBEDDING_MODEL ?? 'qwen3-embedding-8b',
    // 0 = dimension not enforced (health reports detected dim without a "degraded"
    // verdict). Set to the real dim of the loaded model: 4096 for Qwen3-Embedding-8B
    // on the server, or the smaller local model's dim (e.g. 384/768/1024) for local tests.
    expectedEmbeddingDimension: toInt(process.env.LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION, 0),
    timeoutMs: toInt(process.env.LM_STUDIO_TIMEOUT_MS, 60_000),
  },
  qdrant: {
    url: process.env.QDRANT_URL ?? 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
    healthcheckEnabled: toBool(process.env.QDRANT_HEALTHCHECK_ENABLED, true),
  },
  queue: {
    pgBossSchema: process.env.PG_BOSS_SCHEMA ?? 'pgboss',
  },
  processing: {
    workerEnabled: toBool(process.env.PROCESSING_WORKER_ENABLED, false),
    pollIntervalMs: toInt(process.env.PROCESSING_POLL_INTERVAL_MS, 4000),
    maxAttempts: toInt(process.env.PROCESSING_MAX_ATTEMPTS, 5),
  },
  security: {
    externalRateLimitPerMin: toInt(process.env.EXTERNAL_RATE_LIMIT_PER_MIN, 120),
    settingsEncryptionKey: process.env.SETTINGS_ENCRYPTION_KEY,
  },
});
