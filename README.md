# Dify-first Document Knowledge Portal — набор промтов для Claude Code

В архиве — `CLAUDE.md` и 7 промтов для поэтапной реализации приложения, где **Dify является главным RAG-движком**.

Главная архитектурная идея:

```text
Пользователь / Внешний API
        │
        ▼
Document Knowledge Portal
React + AntD / NestJS
        │
        ├── Managed PostgreSQL
        │     metadata, версии, права, jobs, audit, Dify mappings
        │
        ├── Cloud.ru S3
        │     оригиналы файлов, версии, Object Lock / Versioning
        │
        ▼
Processing Worker
pg-boss
        │
        ▼
Dify Knowledge API
create-by-file / update-by-file / indexing-status / retrieve
        │
        ├── LM Studio
        │     Qwen3-Embedding-8B через OpenAI-compatible /v1/embeddings
        │
        ▼
Qdrant
Dify-managed vector storage
```

Важное правило: приложение **не пишет напрямую в Qdrant**. Документы отправляются в Dify, а Dify сам делает парсинг, чанкинг, embeddings через LM Studio и запись в Qdrant.

## Как использовать

1. Создайте пустой репозиторий.
2. Скопируйте `CLAUDE.md` в корень репозитория.
3. Запускайте Claude Code в корне проекта.
4. Давайте промты строго по порядку:
   - `01_architecture_and_monorepo.md`
   - `02_infra_dify_qdrant_lmstudio_s3.md`
   - `03_backend_core_postgres_auth_s3_documents.md`
   - `04_dify_ingestion_processing_pipeline.md`
   - `05_search_external_api_and_permissions.md`
   - `06_frontend_antd_enterprise_ui.md`
   - `07_tests_security_deploy_final_review.md`

## Целевой стек

```text
Frontend: React + Vite + TypeScript + Ant Design 5 + ProComponents
Backend: NestJS + TypeScript
ORM: Prisma
DB: Managed Service for PostgreSQL
Storage: Cloud.ru S3-compatible Object Storage
Queue: pg-boss
RAG engine: Dify
Vector DB: Qdrant, управляется Dify
Embedding provider: LM Studio OpenAI-compatible endpoint
Embedding model: Qwen/Qwen3-Embedding-8B, dimension 4096
Auth: JWT + API keys
Deploy: Docker / Docker Compose, внешний Managed PostgreSQL
```
