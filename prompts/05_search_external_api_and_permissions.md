# Prompt 5 — поиск через Dify, внешний API, права доступа

Реализуй поиск и внешний API. Вся RAG-логика должна идти через **Dify**, а не напрямую через Qdrant.

## Главное правило

Production search path:

```text
Document Knowledge Portal -> Dify retrieve API / Dify App API -> Dify-managed Qdrant
```

Нельзя искать напрямую в Qdrant. Qdrant остаётся только для read-only health/diagnostics.

## Search endpoints

Реализуй:

```text
POST /api/v1/search
POST /api/v1/external/search
```

Request:

```json
{
  "query": "Найди КС-2 по заказчику за июнь 2026",
  "scope": "project",
  "project_code": "zilart-lot-31",
  "folder_path": "07-finance/03-ks2-ks3/01-customer-ks2",
  "document_type": "ks2",
  "department_slug": null,
  "top_k": 10,
  "score_threshold": 0.2,
  "mode": "chunks"
}
```

Response:

```json
{
  "answer": null,
  "chunks": [
    {
      "content": "...",
      "score": 0.83,
      "dataset_id": "...",
      "dify_document_id": "...",
      "document_id": "...",
      "document_title": "...",
      "document_type": "ks2",
      "project_code": "zilart-lot-31",
      "folder_path": "07-finance/03-ks2-ks3/01-customer-ks2",
      "source": {
        "file_name": "2026-06-30__ks2__customer__june.pdf",
        "document_version_id": "...",
        "page": null
      }
    }
  ],
  "sources": [
    {
      "document_id": "...",
      "title": "...",
      "file_name": "...",
      "folder_path": "..."
    }
  ],
  "trace_id": "...",
  "warnings": []
}
```

## DatasetResolver

Реализуй сервис `DatasetResolver`.

Правила:

1. Если `scope=project` и `folder_path` указан:
   - определить top-level section;
   - найти соответствующий Dify dataset mapping.
2. Если `scope=project` и `folder_path` не указан:
   - взять все active Dify datasets проекта.
3. Если `scope=company`:
   - выбрать company datasets по department_slug или section.
4. Если `scope=people_private`:
   - проверить роль и access_group.
5. Если dataset отсутствует:
   - вернуть `setup_required` с понятной ошибкой.

Mapping:

```text
00-project-card -> project_card
01-contracts -> contracts
02-correspondence -> correspondence
03-tender -> tender
04-design-docs -> design_docs
05-working-docs -> working_docs
06-estimates -> estimates
07-finance -> finance
08-schedule -> schedule
09-claims-risks -> claims_risks
10-meetings -> meetings
11-courts-litigation -> courts_litigation
12-warranty -> warranty
13-materials-on-site -> materials_on_site
14-additional-works -> additional_works
15-photo-video -> photo_video
98-old-versions -> archive
99-archive -> archive
```

## Search behavior

1. Для каждого dataset вызвать Dify `retrieve`.
2. Делать parallel calls с concurrency limit.
3. Объединить results.
4. Нормализовать score.
5. Обогатить результаты metadata из PostgreSQL:
   - document title;
   - file_name;
   - folder_path;
   - project_code;
   - document_type;
   - current_version.
6. Не отдавать S3 internal keys наружу без download permission.
7. Если folder_path указывает на вложенную папку:
   - post-filter по document.folder_id и descendants, когда Dify result содержит document_id mapping.
8. Если после post-filter мало результатов:
   - выполнить второй проход с увеличенным top_k.
9. Логировать в `rag_search_logs`:
   - query;
   - actor;
   - datasets;
   - latency;
   - result_count;
   - status.

## Answer mode

Режимы:

```text
mode=chunks
mode=answer
```

`mode=chunks`:

- вернуть только chunks и sources.

`mode=answer`:

1. Если `DIFY_APP_API_KEY` настроен:
   - вызвать Dify App/Workflow adapter;
   - передать query, project_code, folder_path, top chunks;
   - вернуть answer + sources.
2. Если `DIFY_APP_API_KEY` не настроен:
   - вернуть chunks и warning `answer_mode_not_configured`.

Не реализовывай генерацию ответа локально вне Dify. Dify должен оставаться главным RAG-движком.

## External API

Реализуй `/api/v1/external` с auth через `X-API-Key` и scopes.

Endpoints:

### Создать документ

```text
POST /api/v1/external/documents
```

Body:

```json
{
  "scope": "project",
  "project_code": "zilart-lot-31",
  "folder_path": "07-finance/03-ks2-ks3/01-customer-ks2",
  "document_type": "ks2",
  "title": "КС-2 за июнь 2026",
  "description": "...",
  "document_date": "2026-06-30",
  "counterparty": "Заказчик",
  "confidentiality": "internal",
  "metadata": {}
}
```

### Изменить документ

```text
PATCH /api/v1/external/documents/:id
```

### Soft delete

```text
DELETE /api/v1/external/documents/:id
```

Только soft delete + Dify archive job. S3 не удалять.

### Restore

```text
POST /api/v1/external/documents/:id/restore
```

### Upload URL

```text
POST /api/v1/external/documents/:id/upload-url
```

Body:

```json
{
  "file_name": "ks2-june.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 123456,
  "checksum_sha256": "..."
}
```

### Commit upload

```text
POST /api/v1/external/documents/:id/commit-upload
```

После commit автоматически запускается Dify processing pipeline.

### Get document

```text
GET /api/v1/external/documents/:id
```

### List documents

```text
GET /api/v1/external/documents
```

Фильтры:

- project_code;
- folder_path;
- document_type;
- status;
- updated_since.

### Reindex

```text
POST /api/v1/external/documents/:id/reindex
```

### Search

```text
POST /api/v1/external/search
```

Использует тот же search contract, что и `/api/v1/search`.

## Permissions

RBAC:

```text
super_admin: всё
admin: интеграции, API keys, пользователи, всё по документам
manager: проекты, документы, reindex, поиск
editor: создавать/редактировать документы
viewer: только просмотр и поиск разрешённых документов
```

API key scopes:

```text
documents:read
documents:write
documents:delete
projects:read
projects:write
search:read
processing:write
integrations:read
```

Private datasets:

1. `company__people_private` доступен только `super_admin`, `admin`, HR-specific group.
2. External API key должен иметь специальный scope/allowlist для private search.
3. Search должен исключать private datasets по умолчанию.

## Базовый PostgreSQL search fallback

Реализуй не-RAG поиск по metadata для UI:

```text
GET /api/v1/documents/search
```

Поиск по:

- title;
- description;
- counterparty;
- contract_number;
- metadata jsonb;
- project code/name;
- folder path.

Это не RAG, а administrative metadata search.

## Rate limit и logs

1. Добавь rate limit per API key.
2. Добавь request logs.
3. Все external API действия писать в audit_logs.
4. Не логировать секреты.

## Документация

Создай:

```text
docs/EXTERNAL_API.md
docs/RAG_SEARCH_API.md
docs/PERMISSIONS_MODEL.md
```

Добавь curl-примеры:

- create document;
- get upload URL;
- commit upload;
- reindex;
- search.

## Tests

Добавь e2e/mocked tests:

1. Search one dataset.
2. Search all project datasets.
3. Search folder_path.
4. Search private dataset forbidden.
5. Search Dify partial failure.
6. Search empty results.
7. External create document.
8. External upload URL.
9. External commit upload запускает Dify job.
10. External delete = soft delete + Dify archive job.
11. API key без scope отклоняется.

## Проверки

Запусти:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Исправь ошибки.
