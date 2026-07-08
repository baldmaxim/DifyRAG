# Архитектура — Document Knowledge Portal

## Назначение

Веб-портал для хранения, классификации, версионирования и **автоматической RAG-индексации**
документов строительной компании (проекты/ЖК, компания, контрагенты, справочники). Главный
RAG-движок — **Dify**. Портал управляет проектами, папками, документами, версиями, metadata,
правами, S3-оригиналами, очередью обработки, статусами индексации, внешним API и audit logs.

## Компоненты

```text
Пользователь / Внешний API
        │
        ▼
Document Knowledge Portal
  apps/web  (React + Vite + Ant Design 5)
  apps/api  (NestJS + Prisma)
        │
        ├── Managed PostgreSQL      metadata, версии, права, jobs, audit, Dify mappings
        ├── Cloud.ru S3             оригиналы файлов, версии, Object Lock / Versioning
        │
        ▼
  Processing Worker (pg-boss)
        │
        ▼
  Dify Knowledge API   create-by-file / update-by-file / indexing-status / retrieve
        │
        ├── LM Studio   Qwen3-Embedding-8B через OpenAI-compatible /v1/embeddings
        ▼
  Qdrant  (vector storage, управляется Dify)
```

| Компонент | Роль |
|---|---|
| **apps/web** | Enterprise UI: проекты, дерево папок, документы, upload-pipeline, поиск, health интеграций. Никогда не получает секреты. |
| **apps/api** | NestJS backend: auth, RBAC, S3, CRUD, Dify-интеграция, processing worker, external API. Держит все секреты. |
| **packages/shared** | Общие enums/типы (`@dkp/shared`): `UserRole`, `Scope`, `DocumentStatus`, `DifyIndexingStatus`, `Confidentiality`, `DocumentTypeCode`, `ProcessingJobType`, `ProcessingJobStatus`, `ApiKeyScope`. |
| **Managed PostgreSQL** | Единственный источник истины по metadata, версиям, правам, jobs, audit и Dify-mappings. |
| **Cloud.ru S3** | Оригиналы файлов и их версии. Физическое удаление запрещено (Versioning + Object Lock). |
| **Dify** | Парсинг, cleaning, chunking, вызов embeddings, запись в Qdrant, retrieval. |
| **LM Studio** | OpenAI-совместимый провайдер embeddings/LLM (`Qwen3-Embedding-8B`, dim 4096). |
| **Qdrant** | Vector store, которым управляет Dify. Для приложения — только read-only health. |
| **pg-boss** | Очередь фоновой обработки поверх PostgreSQL. |

## Ключевые архитектурные правила

1. Приложение **не пишет embeddings в Qdrant** напрямую (никаких upsert/delete points).
2. Оригинал → Cloud.ru S3; файл → Dify Knowledge API; Dify сам делает весь RAG-pipeline.
3. Прямой доступ к Qdrant — только health / read-only diagnostics / просмотр collections админом.
4. Секреты (Dify/Qdrant/S3/LM Studio) — только на backend; frontend их не получает.
5. Удаление документа — всегда soft delete в PostgreSQL; S3-оригинал не удаляется; в Dify —
   archive/disable (delete из индекса только как крайний случай).
6. Все статусы Dify отображаются пользователю (queued … completed / error / archived / disabled).

## Технологии

Backend: NestJS + TypeScript, Prisma, AWS SDK v3 (S3), JWT + API keys, Swagger, pg-boss.
Frontend: React + Vite + TypeScript, Ant Design 5 + ProComponents, TanStack Query, Zustand, React Router.
Deploy: Docker / Docker Compose; внешние Managed PostgreSQL и Cloud.ru S3 в production.

См. также: [DIFY_FIRST_ARCHITECTURE.md](DIFY_FIRST_ARCHITECTURE.md),
[DATABASE_MODEL.md](DATABASE_MODEL.md), [RAG_PROCESSING_FLOW.md](RAG_PROCESSING_FLOW.md).
