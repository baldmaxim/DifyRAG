# UI-managed settings

Most configuration is editable from the portal (**Настройки**, admin/super_admin only) and stored
in the database, **overriding `.env`**. Changes apply **immediately** (no restart). Secrets are
encrypted at rest and are **never** returned to the frontend (write-only; the UI shows only
"configured / not set").

## Editable in the UI

| Group | Fields |
|---|---|
| **S3** | endpoint, region, bucket, accessKeyId, **secretAccessKey** 🔒, forcePathStyle, presigned TTL, max file size |
| **Dify** | enabled, baseUrl, apiPrefix, **knowledgeApiKey** 🔒, **appApiKey** 🔒, timeout, autoCreate, technique/doc form/language, top_k, score threshold |
| **LM Studio** | baseUrl, embeddingModel, expectedEmbeddingDimension, timeout |
| **Qdrant** | url, **apiKey** 🔒, healthcheckEnabled |
| **Processing** | workerEnabled, pollIntervalMs, maxAttempts |
| **Security** | externalRateLimitPerMin |

🔒 = secret (encrypted, write-only). Leave a secret field empty to keep the current value.
**S3 / Dify / LM Studio / Qdrant** have a **«Проверить соединение»** button (runs the health check).

## Stays in `.env` only (bootstrap)

You need the DB and a decryption key before you can read UI settings, so these remain in env:

- `DATABASE_URL`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `SETTINGS_ENCRYPTION_KEY` — passphrase used to encrypt UI secrets (AES-256-GCM). **Required** to
  save/read secrets from the UI. Changing it makes previously stored UI secrets unreadable
  (re-enter them). Use a long random value.
- `PORT`, `CORS_ORIGIN`

## How resolution works

Effective config = **env defaults overlaid with DB settings**. `SettingsService` keeps an in-memory
snapshot and bumps a version on every change; consumers (`StorageService`, Dify/LM Studio/Qdrant
clients, search, worker, rate limit) read the live snapshot, so edits take effect at once (the S3
client is rebuilt when settings change). If the DB is unreachable, the app falls back to env.

## Notes

- `worker enabled` changes apply to the poll loop at next startup; other settings are fully live.
- Non-admins get 403 on `/api/v1/settings`; the UI shows an access notice.
- All settings changes are written to `audit_logs` (field names only — never secret values).
