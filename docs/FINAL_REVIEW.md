# Final review

## 1. What is implemented

- **Monorepo** (pnpm): `apps/api` (NestJS), `apps/web` (React/Vite/AntD 5),
  `packages/shared` (enums), `infra/`, `docs/`.
- **Backend**: PostgreSQL schema (Prisma, 17 models), JWT auth + rotating refresh tokens
  (argon2), API keys with scopes, S3 storage (no delete), projects/folders/departments/
  documents CRUD, upload→S3→commit→version pipeline, soft delete/restore, audit logs.
- **Dify-first RAG**: DifyClient (create/update-by-file, indexing-status, status batch,
  retrieve), dataset mapping (`project_section`), document sync + indexing poller,
  processing worker (Postgres-backed queue), LM Studio + Qdrant (read-only) + S3 health.
- **Search**: `/search` + `/external/search` via Dify, multi-dataset parallel retrieve,
  metadata enrichment, private-dataset protection, answer mode via Dify App.
- **External API**: `X-API-Key` + scopes + rate limit; documents CRUD, upload, reindex, search.
- **Frontend**: login, dashboard, projects (+tree+upload pipeline), documents, search,
  departments, Dify datasets, integrations health, API keys, processing jobs, audit logs.
- **Ops**: Dockerfiles (api, web), nginx, platform compose, GitHub Actions CI, docs.

## 2. Dify-first architecture

The app stores originals in S3 and metadata in PostgreSQL, then sends files to the **Dify
Knowledge API**. Dify parses/chunks, calls **LM Studio** for embeddings, and writes vectors to
**Qdrant**. Retrieval goes through Dify. The app never writes to Qdrant.

## 3. How documents reach Dify

`commit-upload` → `processing_job` → worker → `DifyDocumentSyncService.syncDocument` →
`create-by-file`/`update-by-file` → poll `indexing-status` → `documents.status = indexed`.

## 4. How Dify writes to Qdrant

Dify owns the Qdrant collections; embeddings come from LM Studio (`Qwen3-Embedding-8B`, dim 4096).

## 5. Why the app never writes to Qdrant

Single owner of collections/consistency/secrets. Enforced by tests: the Qdrant client has no
`upsert`/`deletePoints`/`updateVectors`/`overwritePayload`; search goes through `DifySearchService`.

## 6. S3 versioning / soft delete

New file → new `document_version`. Delete = soft delete in Postgres + Dify archive; the S3
object is retained (Versioning/Object Lock). `StorageService` has no delete method.

## 7. Required env

App/Database/Auth/S3/Dify/LM Studio/Qdrant/Queue+Processing/Security/Seed — see
`apps/api/.env.example` (grouped) and `apps/web/.env.example`.

## 8. Run locally

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d   # dev Postgres
pnpm --filter @dkp/api exec prisma migrate deploy && pnpm --filter @dkp/api seed
pnpm dev   # api :3000, web :5173
```

## 9. Run production

See [DEPLOYMENT.md](DEPLOYMENT.md).

## 10. Verify health

`GET /api/v1/integrations/health` → dify/lmstudio/qdrant/s3 = ok.

## 11. Verify upload → Dify → Qdrant → search

Upload a document, wait for `indexed`, confirm a Qdrant collection exists, run `/search`.

## 12. Current limitations

- Runtime validated on a local machine, then a GPU server. Local testing may use a **smaller
  preinstalled embedding model** (set `LM_STUDIO_EMBEDDING_MODEL` + `LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION`
  to its values, or dim `0`); the server uses `Qwen3-Embedding-8B` (4096). Data stores are **not**
  shared across environments (Qdrant collection dimension is fixed) — use fresh PostgreSQL/Qdrant/Dify
  datasets per environment; `ensureDataset` self-heals stale dataset ids via a 404 check.
- Live DB migrate/seed run on the target host (offline initial migration is committed).
- Dify chunking uses `automatic` process rule; custom `DIFY_CHUNK_*` rules to be tuned on live Dify.
- Rate limiting is in-memory (single instance); use Redis for multi-instance.
- Answer mode assumes a Dify **chat** app; adapt for workflow apps if used.

## 13. Next steps

- Validate the full RAG loop on the GPU host (see END_TO_END_RAG_DEPLOYMENT.md), tune chunking,
  then migrate to the remote GPU server. Expand e2e tests against a live stack.
