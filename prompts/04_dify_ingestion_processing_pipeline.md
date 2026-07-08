# Prompt 4 — Dify ingestion и автоматический processing pipeline

Реализуй **Dify-first document ingestion pipeline**.

Цель: пользователь загружает документ в web UI или через external API, а система сама:

1. сохраняет оригинал в Cloud.ru S3;
2. создаёт/обновляет metadata в PostgreSQL;
3. определяет нужный Dify dataset;
4. отправляет документ в Dify Knowledge Base API;
5. Dify обрабатывает документ;
6. Dify вызывает embedding-модель через LM Studio;
7. Dify записывает embeddings в Qdrant;
8. приложение отслеживает статус indexing;
9. пользователь видит статус и может искать документ после completed.

Жёсткое правило: приложение не пишет напрямую в Qdrant.

## Новые backend modules

Создай:

```text
apps/api/src/integrations/dify/
  dify.module.ts
  dify.client.ts
  dify.types.ts
  dify.config.ts
  dify.service.ts
  dify-dataset-mapping.service.ts
  dify-document-sync.service.ts
  dify-indexing-poller.service.ts
  dify-search.service.ts
  dify-health.service.ts

apps/api/src/integrations/lmstudio/
  lmstudio.module.ts
  lmstudio.client.ts
  lmstudio-health.service.ts

apps/api/src/integrations/qdrant/
  qdrant.module.ts
  qdrant-readonly.client.ts
  qdrant-health.service.ts

apps/api/src/processing/
  processing.module.ts
  processing-queue.service.ts
  processing-worker.service.ts
  processing-jobs.controller.ts
```

## Prisma tables

Добавь миграции для таблиц.

### dify_dataset_mappings

- id uuid
- scope enum
- project_id nullable
- department_id nullable
- folder_group string
- folder_path_prefix string nullable
- dify_dataset_id string nullable
- dify_dataset_name string
- dify_dataset_description text nullable
- strategy enum: project | project_section | company_section
- embedding_provider string nullable
- embedding_model string nullable
- indexing_technique string nullable
- status enum: pending | creating | active | error | archived
- error_message text nullable
- created_at
- updated_at

### dify_document_mappings

- id uuid
- document_id uuid
- document_version_id uuid
- dify_dataset_mapping_id uuid
- dify_dataset_id string
- dify_document_id string nullable
- dify_batch string nullable
- dify_upload_file_id string nullable
- indexing_status enum:
  - pending
  - uploading
  - waiting
  - parsing
  - cleaning
  - splitting
  - indexing
  - completed
  - error
  - archived
  - disabled
- completed_segments int nullable
- total_segments int nullable
- error_message text nullable
- last_polled_at timestamp nullable
- indexed_at timestamp nullable
- created_at
- updated_at

Unique:

```text
document_version_id + dify_dataset_mapping_id
```

### rag_search_logs

- id uuid
- actor_type
- actor_user_id nullable
- actor_api_key_id nullable
- query text
- scope string nullable
- project_id nullable
- folder_path nullable
- dataset_ids string[]
- top_k int
- result_count int
- latency_ms int
- status enum: success | error
- error_message nullable
- created_at

### integration_health_checks

- id uuid
- provider enum: dify | lmstudio | qdrant | s3
- status enum: ok | degraded | down | setup_required
- latency_ms int nullable
- details jsonb
- checked_at

## DifyClient

Реализуй server-side client. Секреты не отдавать во frontend.

Методы:

1. `listDatasets()`
2. `createDataset(params)`
3. `getDataset(datasetId)`
4. `updateDataset(datasetId, params)`
5. `createDocumentByFile(params)`

Endpoint pattern:

```text
POST {DIFY_BASE_URL}{DIFY_API_PREFIX}/datasets/{dataset_id}/document/create-by-file
```

multipart/form-data:

- `file`
- `data` as JSON string

6. `updateDocumentByFile(params)`

Endpoint pattern:

```text
POST {DIFY_BASE_URL}{DIFY_API_PREFIX}/datasets/{dataset_id}/documents/{document_id}/update-by-file
```

7. `getDocument(datasetId, documentId)`
8. `listDocuments(datasetId, filters)`
9. `getDocumentIndexingStatus(datasetId, batch)`

Endpoint pattern:

```text
GET {DIFY_BASE_URL}{DIFY_API_PREFIX}/datasets/{dataset_id}/documents/{batch}/indexing-status
```

10. `updateDocumentStatusBatch(datasetId, action, documentIds)`

Actions:

```text
enable | disable | archive | un_archive
```

11. `deleteDocumentFromDify(datasetId, documentId)`

Использовать только если archive/disable невозможны.

12. `retrieve(datasetId, query, options)`

Endpoint pattern:

```text
POST {DIFY_BASE_URL}{DIFY_API_PREFIX}/datasets/{dataset_id}/retrieve
```

## Dataset strategy: project_section

При создании проекта создавай Dify dataset mappings для:

```text
project_{project_code}__project_card
project_{project_code}__contracts
project_{project_code}__correspondence
project_{project_code}__tender
project_{project_code}__design_docs
project_{project_code}__working_docs
project_{project_code}__estimates
project_{project_code}__finance
project_{project_code}__schedule
project_{project_code}__claims_risks
project_{project_code}__meetings
project_{project_code}__courts_litigation
project_{project_code}__warranty
project_{project_code}__materials_on_site
project_{project_code}__additional_works
project_{project_code}__photo_video
project_{project_code}__archive
```

Для company scope:

```text
company__legal
company__commercial
company__finance
company__accounting
company__production
company__procurement
company__pto
company__design_review
company__hr_public
company__it
company__warranty
company__safety
company__templates
company__reference
company__contractors
company__people_public
company__people_private
```

Если `DIFY_AUTO_CREATE_DATASETS=true`, worker должен создавать отсутствующий dataset в Dify.

Если `DIFY_AUTO_CREATE_DATASETS=false`, job должен падать с понятной ошибкой `setup_required`.

## Mapping папок в Dify folder_group

Реализуй функцию:

```text
resolveDifyFolderGroup(folderPath: string): DifyFolderGroup
```

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

Вложенные папки наследуют top-level group.

Примеры:

```text
07-finance/03-ks2-ks3/01-customer-ks2 -> finance
07-finance/05-material-payment-allocation-letters -> finance
13-materials-on-site/02-upd -> materials_on_site
13-materials-on-site/03-ttn -> materials_on_site
13-materials-on-site/04-delivery-photos -> materials_on_site
05-working-docs/03-detected-remarks -> working_docs
11-courts-litigation/02-court-claims -> courts_litigation
12-warranty/01-warranty-requests -> warranty
14-additional-works/02-calculations -> additional_works
```

Добавь unit tests.

## Processing flow

После `commit-upload`:

1. Создать `processing_job` type=`dify_create_document` или `dify_update_document`.
2. Worker определяет dataset mapping по:
   - scope;
   - project_id;
   - folder_path;
   - department_id.
3. Если mapping отсутствует, создать mapping.
4. Если dataset в Dify отсутствует и auto-create включен, создать dataset.
5. Worker берёт текущую версию файла из S3.
6. Worker отправляет файл в Dify:
   - `create-by-file`, если Dify-документа ещё нет;
   - `update-by-file`, если Dify-документ уже есть.
7. Сохраняет:
   - dify_dataset_id;
   - dify_document_id;
   - dify_batch;
   - статус `waiting` или фактический статус Dify.
8. Создаёт job `dify_poll_indexing_status`.
9. Poller опрашивает Dify indexing-status.
10. UI должен видеть обновления через API polling.
11. При completed:
    - `documents.status = indexed`;
    - `dify_document_mappings.indexing_status = completed`;
    - `processing_job.status = success`.
12. При error:
    - `documents.status = error`;
    - сохранить error_message;
    - пользователь должен иметь кнопку retry/reindex.

## Update flow

Если пользователь заменил файл:

1. Создать новую upload session.
2. После commit создать новую `document_version`.
3. Если есть active dify_document_id:
   - использовать `update-by-file`.
4. Если Dify вернул 404:
   - использовать `create-by-file`;
   - старый mapping пометить error/replaced.
5. После completed новая версия становится current indexed version.

Если изменились только metadata:

1. Если metadata не влияет на dataset, Dify reindex не нужен.
2. Если изменились folder/project/scope/document_type и dataset mapping поменялся:
   - archive/disable старый Dify document;
   - отправить текущую S3 version в новый dataset;
   - создать новый mapping.

## Delete flow

DELETE документа:

1. В PostgreSQL только soft delete.
2. Создать job `dify_archive_document`.
3. Worker пробует:
   - archive;
   - затем disable;
   - затем delete from Dify, если первые варианты невозможны.
4. S3 объект не удалять.
5. Audit log обязателен.

## Restore flow

1. Восстановить document в PostgreSQL.
2. Создать job `dify_restore_document`.
3. Worker пробует:
   - un_archive;
   - enable.
4. Если Dify document отсутствует — заново отправить current version из S3.

## LM Studio health

Реализуй только health/config layer. Приложение не генерирует embeddings для документов напрямую.

Методы:

- `listModels()`;
- `createTestEmbedding('health check', model)`;
- `detectEmbeddingDimension()`.

Если dimension != `LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION`, health = degraded.

## Qdrant read-only diagnostics

Реализуй только:

- `listCollections()`;
- `getCollection(collectionName)`;
- `health()`.

Запрещено иметь методы:

- upsert;
- delete points;
- update vectors;
- overwrite payload.

Добавь тест, что в Qdrant client нет write methods.

## Health endpoints

```text
GET /api/v1/integrations/health
GET /api/v1/integrations/dify/health
GET /api/v1/integrations/lmstudio/health
GET /api/v1/integrations/qdrant/health
GET /api/v1/integrations/qdrant/collections
```

`collections` — только admin/super_admin.

## Processing jobs endpoints

```text
GET  /api/v1/processing/jobs
GET  /api/v1/processing/jobs/:id
POST /api/v1/processing/jobs/:id/retry
```

## Tests

Добавь mock tests:

1. Dify create document by file.
2. Dify update document by file.
3. Dify indexing status: waiting → parsing → splitting → indexing → completed.
4. Error path.
5. Delete/archive path.
6. Restore path.
7. LM Studio embeddings health.
8. Qdrant read-only health.
9. Проверить, что приложение не вызывает Qdrant write endpoints.
10. Проверить, что S3 delete не вызывается.

## Проверки

Запусти:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Исправь все ошибки.
