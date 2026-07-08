# Document Knowledge Portal

Dify-first document management and RAG-indexing portal for a construction company.
**Dify is the primary RAG engine** — the app stores originals in Cloud.ru S3, metadata in
PostgreSQL, and sends files to Dify; Dify parses/chunks, calls LM Studio for embeddings, and
writes to Qdrant. The app **never writes to Qdrant directly** (Qdrant is read-only health only).

## Monorepo layout

```text
apps/
  api/        NestJS + TypeScript backend (Prisma, S3, Dify integration)
  web/        React + Vite + Ant Design 5 frontend
packages/
  shared/     Shared enums/types (@dkp/shared)
docs/         Architecture & operations documentation
infra/        Dify / Qdrant / LM Studio / platform deployment configs
```

## Prerequisites

- Node.js >= 20 (tested on Node 24)
- pnpm (via `corepack enable`)
- Docker + Docker Compose (for the local dev database and infra stack)

## Commands

```bash
pnpm install       # install all workspace dependencies
pnpm dev           # run api (:3000) and web (:5173) in parallel
pnpm build         # build @dkp/shared, then api and web
pnpm lint          # eslint across all packages
pnpm typecheck     # tsc --noEmit across all packages
pnpm test          # vitest across all packages
pnpm format        # prettier --write

# database (backend)
docker compose -f docker-compose.dev.yml up -d   # local Postgres
pnpm db:migrate                                   # apply Prisma migrations
pnpm seed                                          # idempotent seed (admin, doc types, departments)
```

## Environment

Copy the example env files and fill them in (secrets live only on the backend):

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

## Documentation

- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
  [docs/DIFY_FIRST_ARCHITECTURE.md](docs/DIFY_FIRST_ARCHITECTURE.md)
- Data & API: [docs/DATABASE_MODEL.md](docs/DATABASE_MODEL.md),
  [docs/API_DESIGN.md](docs/API_DESIGN.md)
- RAG flows: [docs/RAG_PROCESSING_FLOW.md](docs/RAG_PROCESSING_FLOW.md),
  [docs/RAG_SEARCH_API.md](docs/RAG_SEARCH_API.md), [docs/S3_STORAGE_FLOW.md](docs/S3_STORAGE_FLOW.md)
- Deploy / RAG environment: [docs/END_TO_END_RAG_DEPLOYMENT.md](docs/END_TO_END_RAG_DEPLOYMENT.md),
  [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
