# Дизайн API

## Общие принципы

- Версионирование пути: **`/api/v1`** (глобальный префикс NestJS).
- Аутентификация: **JWT** (Bearer) для UI, **API keys** (`X-API-Key`) со scopes для внешних систем.
- Документация: **Swagger/OpenAPI** на `/api/v1/docs` (Bearer + ApiKey security schemes).
- Единый формат ошибок; stack traces пользователю не отдаются.
- Валидация DTO через `class-validator` + глобальный `ValidationPipe` (`whitelist`, `transform`).

## Внутренние endpoints (JWT) — промты 03–05

```text
# Auth
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

# Projects
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PATCH  /api/v1/projects/:id
DELETE /api/v1/projects/:id            # = archive

# Folders / Departments
GET    /api/v1/folders/tree
POST   /api/v1/folders
PATCH  /api/v1/folders/:id
DELETE /api/v1/folders/:id
GET|POST|GET|PATCH|DELETE /api/v1/departments[...]

# Documents
GET    /api/v1/documents
POST   /api/v1/documents
GET    /api/v1/documents/:id
PATCH  /api/v1/documents/:id
DELETE /api/v1/documents/:id           # soft delete
POST   /api/v1/documents/:id/restore
POST   /api/v1/documents/:id/upload-url
POST   /api/v1/documents/:id/commit-upload
GET    /api/v1/documents/:id/download-url
GET    /api/v1/documents/:id/versions
POST   /api/v1/documents/:id/versions/:versionId/make-current
POST   /api/v1/documents/:id/reindex
GET    /api/v1/documents/search        # non-RAG metadata search

# Search (RAG через Dify)
POST   /api/v1/search

# Processing & Integrations
GET    /api/v1/processing/jobs[/:id][/retry]
GET    /api/v1/integrations/health
GET    /api/v1/integrations/{dify|lmstudio|qdrant}/health
GET    /api/v1/integrations/qdrant/collections   # admin only
```

## Внешний API (X-API-Key + scopes) — промт 05

```text
POST   /api/v1/external/documents
PATCH  /api/v1/external/documents/:id
DELETE /api/v1/external/documents/:id            # soft delete + Dify archive
POST   /api/v1/external/documents/:id/restore
POST   /api/v1/external/documents/:id/upload-url
POST   /api/v1/external/documents/:id/commit-upload
GET    /api/v1/external/documents[/:id]
POST   /api/v1/external/documents/:id/reindex
POST   /api/v1/external/search
```

Scopes: `documents:read|write|delete`, `projects:read|write`, `search:read`,
`processing:write`, `integrations:read|write`. Rate limit — на уровне API key.

## Health-контракт

Каждая интеграция возвращает `status: ok | degraded | down | setup_required`, `latency_ms` и
`details`. Для LM Studio дополнительно — `expected` vs `detected` embedding dimension.

Подробнее по поиску: [RAG_SEARCH_API.md](RAG_SEARCH_API.md); по внешнему API — `docs/EXTERNAL_API.md`
(создаётся в промте 05).
