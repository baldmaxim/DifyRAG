# Prompt 1 — архитектура, документация и monorepo

Проанализируй `CLAUDE.md` и создай архитектуру приложения **Document Knowledge Portal**, где **Dify является главным RAG-движком**.

Важно: приложение не должно писать embeddings напрямую в Qdrant. Приложение хранит оригиналы файлов в Cloud.ru S3, metadata и версии в PostgreSQL, отправляет документы в Dify Knowledge Base API, а Dify сам обрабатывает документы, вызывает LM Studio для embeddings и пишет vectors в Qdrant.

## Этап 1. Архитектурная документация

Создай документы:

```text
docs/ARCHITECTURE.md
docs/DIFY_FIRST_ARCHITECTURE.md
docs/API_DESIGN.md
docs/DATABASE_MODEL.md
docs/S3_STORAGE_FLOW.md
docs/RAG_PROCESSING_FLOW.md
docs/RAG_SEARCH_API.md
docs/IMPLEMENTATION_PLAN.md
```

В документации опиши:

1. Общую архитектуру.
2. Почему Dify является главным RAG-движком.
3. Почему приложение не пишет в Qdrant напрямую.
4. Роли компонентов:
   - Document Knowledge Portal;
   - Managed PostgreSQL;
   - Cloud.ru S3;
   - Dify;
   - LM Studio;
   - Qdrant;
   - pg-boss workers.
5. End-to-end flow:
   - загрузка документа;
   - сохранение в S3;
   - создание document_version;
   - отправка в Dify;
   - обработка в Dify;
   - embeddings через LM Studio;
   - запись Dify в Qdrant;
   - поиск через Dify retrieve.
6. Soft delete / restore flow.
7. Document versioning flow.
8. Dataset strategy `project_section`.
9. Mapping папок проекта в Dify datasets.
10. External API flow.
11. Security model.
12. Audit model.
13. Health checks для Dify, LM Studio, Qdrant, S3.

## Этап 2. Создай monorepo

Создай структуру:

```text
apps/
  api/
  web/
packages/
  shared/
docs/
infra/
```

Технологии:

```text
Backend: NestJS + TypeScript
Frontend: React + Vite + TypeScript
UI: Ant Design 5 + ProComponents
ORM: Prisma
DB: PostgreSQL
Storage: S3-compatible Cloud.ru
Queue: pg-boss
Package manager: pnpm workspaces
```

Требования:

1. Настрой `pnpm-workspace.yaml`.
2. Настрой общий `tsconfig.base.json`.
3. Настрой eslint/prettier.
4. В `apps/api` создай NestJS-приложение.
5. В `apps/web` создай Vite React TypeScript-приложение.
6. В `packages/shared` создай общие enums/types:
   - UserRole;
   - Scope;
   - DocumentStatus;
   - DifyIndexingStatus;
   - Confidentiality;
   - DocumentTypeCode;
   - ProcessingJobType;
   - ProcessingJobStatus.
7. Добавь `.env.example` для backend и frontend.
8. Добавь `docker-compose.dev.yml` для локального PostgreSQL, но production должен использовать внешний `DATABASE_URL` Managed PostgreSQL.
9. Добавь корневой `README.md` с командами:
   - `pnpm install`;
   - `pnpm dev`;
   - `pnpm build`;
   - `pnpm lint`;
   - `pnpm typecheck`;
   - `pnpm test`.

## Этап 3. Базовые env variables

В `apps/api/.env.example` добавь минимум:

```text
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/document_portal

JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me
CORS_ORIGIN=http://localhost:5173

S3_ENDPOINT=
S3_REGION=ru-central-1
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=true
S3_PRESIGNED_URL_TTL_SECONDS=900
MAX_FILE_SIZE_BYTES=524288000

DIFY_ENABLED=true
DIFY_BASE_URL=http://localhost
DIFY_API_PREFIX=/v1
DIFY_KNOWLEDGE_API_KEY=
DIFY_APP_API_KEY=
DIFY_TIMEOUT_MS=120000
DIFY_AUTO_CREATE_DATASETS=true
DIFY_DATASET_STRATEGY=project_section
DIFY_DEFAULT_INDEXING_TECHNIQUE=high_quality
DIFY_DEFAULT_DOC_FORM=text_model
DIFY_DEFAULT_DOC_LANGUAGE=Russian
DIFY_CHUNK_MAX_TOKENS=700
DIFY_CHUNK_OVERLAP=80
DIFY_RETRIEVE_TOP_K=12
DIFY_RETRIEVE_SCORE_THRESHOLD=0.2

LM_STUDIO_BASE_URL=http://host.docker.internal:1234/v1
LM_STUDIO_EMBEDDING_MODEL=qwen3-embedding-8b
LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION=4096
LM_STUDIO_TIMEOUT_MS=60000

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_HEALTHCHECK_ENABLED=true

PG_BOSS_SCHEMA=pgboss
```

## Проверки

После реализации запусти:

```text
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

Исправь все ошибки.
