# Deployment

Production assumptions:

1. **PostgreSQL** — external Managed Service (via `DATABASE_URL`); no Postgres container in prod.
2. **S3** — Cloud.ru Object Storage (keys without DeleteObject).
3. **Dify** — separate self-hosted stack (see `infra/dify`).
4. **Qdrant** — separate service connected to Dify (see `infra/qdrant`).
5. **LM Studio** — on the GPU host as an OpenAI-compatible endpoint (see `infra/lmstudio`).
6. **Our app** — separate API + Web containers (see `infra/platform`).

## 1. Database

- Create a Managed PostgreSQL instance and set `DATABASE_URL`
  (`postgresql://user:pass@host:5432/document_portal?schema=public`).

## 2. S3 (Cloud.ru)

- Create a bucket, enable **Versioning** (+ Object Lock if available).
- Create access keys **without** `s3:DeleteObject` — the app never deletes objects; the
  StorageService has no delete method by design.
- Fill `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.

## 3. RAG stack

- Bring up **Qdrant** (`infra/qdrant/docker-compose.qdrant.yml`).
- Bring up **LM Studio** with `Qwen3-Embedding-8B` (dim 4096) — see `infra/lmstudio`.
  (Local testing may load a smaller installed model — set `LM_STUDIO_EMBEDDING_MODEL` /
  `LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION` to its actual values; see `.env.example`.)
- Bring up **Dify** with `VECTOR_STORE=qdrant` — see [DIFY_SETUP.md](DIFY_SETUP.md).
- Add LM Studio as a Dify model provider — see [LM_STUDIO_DIFY_PROVIDER_SETUP.md](LM_STUDIO_DIFY_PROVIDER_SETUP.md).
- Create a Dify **Knowledge API key** → `DIFY_KNOWLEDGE_API_KEY`. (Optional Dify **App API key**
  for answer mode → `DIFY_APP_API_KEY`.)

## 4. Application

```bash
cp apps/api/.env.example infra/platform/api.env   # fill DB, S3, DIFY_*, LM_STUDIO_*, QDRANT_*
cd infra/platform
docker compose -f docker-compose.platform.example.yml up -d --build
```

- API: `http://<host>:3000/api/v1/health`, Swagger at `/api/v1/docs`
- Web: `http://<host>:8080`

## 5. Migrations & seed

The API image runs `prisma migrate deploy` on start. To run manually:

```bash
pnpm --filter @dkp/api exec prisma migrate deploy
pnpm --filter @dkp/api seed   # creates super admin (SEED_ADMIN_*), doc types, departments
```

## 6. Verify

1. Open the web UI, log in as the seeded admin.
2. `/integrations` — Dify / LM Studio / Qdrant / S3 all `ok`.
3. Create a project (auto folder tree + Dify dataset mappings).
4. Upload a test document → watch status reach `indexed`.
5. Confirm a collection appears in Qdrant (admin → Qdrant diagnostics).
6. Run a search on `/search` and get chunks back.

## 7. Migrations local → server

`.env` changes: `DATABASE_URL`, `DIFY_BASE_URL`, `QDRANT_URL`, `LM_STUDIO_BASE_URL`,
`LM_STUDIO_EMBEDDING_MODEL`, `LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION` (→ `qwen3-embedding-8b` /
`4096` on the server), public URLs, `CORS_ORIGIN`. Re-run the verify checklist on the server.

**Important — do not share data stores across environments.** Local testing may use a smaller
embedding model, so its Qdrant collections and `dify_dataset_mappings` are built at a different
vector size. Use a **fresh** PostgreSQL, **fresh** Qdrant, and **fresh** Dify datasets on the
server (the app auto-creates them at 4096 on first upload; `ensureDataset` self-heals a stale
dataset id via a 404 check). See the "Local → remote migration" section of
[END_TO_END_RAG_DEPLOYMENT.md](END_TO_END_RAG_DEPLOYMENT.md).

## 8. Backups

- PostgreSQL: managed backups / `pg_dump`.
- Qdrant: snapshot the storage volume.
- S3: rely on Versioning (+ Object Lock).
- Rotate any secret that was exposed.

## Enable the processing worker

Set `PROCESSING_WORKER_ENABLED=true` on the API so it pushes documents to Dify and polls
indexing status. Keep Qdrant and LM Studio off the public internet (firewall/VPN).
