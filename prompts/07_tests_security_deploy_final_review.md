# Prompt 7 — тесты, безопасность, деплой и финальная ревизия

Проведи hardening, тестирование, подготовку к деплою и финальную ревизию проекта **Document Knowledge Portal**.

Ключевое правило остаётся неизменным: **Dify является главным RAG-движком**, приложение не пишет embeddings напрямую в Qdrant.

## Security hardening

Проверь и реализуй, если отсутствует:

1. Физическое удаление S3-объектов полностью запрещено в коде.
2. Нет методов `deleteObject` в StorageService или они бросают `ForbiddenByPolicy`.
3. Все document delete operations — только soft delete.
4. Soft delete обязательно пишет audit log.
5. Restore обязательно пишет audit log.
6. Upload new version обязательно пишет audit log.
7. Download URL creation пишет audit log.
8. API key create/revoke пишет audit log.
9. Viewer не может создавать/изменять/удалять.
10. Editor может работать с документами, но не управлять интеграциями.
11. Manager может управлять проектами и processing jobs.
12. Admin может управлять API keys и integrations.
13. Super admin может всё.
14. API keys:
    - scopes обязательны;
    - revoked keys не работают;
    - expired keys не работают;
    - last_used_at обновляется.
15. Rate limit для external API.
16. Request size limit.
17. File type allowlist:
    - pdf;
    - doc;
    - docx;
    - xls;
    - xlsx;
    - csv;
    - txt;
    - md;
    - jpg;
    - jpeg;
    - png;
    - zip.
18. Max file size из env.
19. Mime type validation.
20. Секреты не попадают во frontend bundle.
21. Секреты не попадают в logs.
22. Private datasets защищены:
    - `company__people_private` не ищется без прав;
    - внешний API не получает private results без специального разрешения.

## Dify/Qdrant safety checks

Добавь tests/static checks:

1. В production path нет прямого Qdrant search.
2. В production path нет Qdrant upsert.
3. В Qdrant client отсутствуют methods:
   - upsert;
   - deletePoints;
   - updateVectors;
   - overwritePayload.
4. Qdrant используется только для:
   - health;
   - listCollections;
   - getCollection.
5. Dify используется для:
   - create-by-file;
   - update-by-file;
   - indexing-status;
   - retrieve;
   - archive/disable/delete from index.
6. Search endpoints вызывают DifySearchService, а не Qdrant.

## Backend tests

Добавь тесты:

### Auth

1. Login success.
2. Login failure.
3. Refresh token.
4. Revoked refresh token.
5. Disabled user cannot login.

### API keys

1. Create key.
2. Secret shown only once.
3. Stored only hash.
4. Revoked key rejected.
5. Expired key rejected.
6. Scope enforcement.

### Projects/folders

1. Create project.
2. Default folders generated.
3. Folder paths correct.
4. Duplicate seed does not create duplicates.
5. Folder group resolves to Dify dataset group.

### S3/storage

1. Object key generation.
2. Presigned PUT generation.
3. Presigned GET generation.
4. HeadObject check.
5. Physical delete forbidden.

### Documents

1. Create document metadata.
2. Create upload URL.
3. Commit upload.
4. document_version created.
5. version_no increments.
6. current_version_id updated.
7. Replace file creates new version.
8. Metadata-only update.
9. Soft delete.
10. Restore.
11. Download URL.
12. Audit logs created.

### Dify processing

1. Commit upload creates Dify job.
2. Missing dataset mapping auto-creates mapping.
3. Dify create-by-file mocked.
4. Dify update-by-file mocked.
5. Poll status:
   - waiting;
   - parsing;
   - splitting;
   - indexing;
   - completed.
6. Completed sets document.status=indexed.
7. Error sets document.status=error.
8. Retry/reindex works.
9. Delete archives/disables Dify document.
10. Restore enables/unarchives or reuploads.

### Search

1. Search one dataset.
2. Search all project datasets.
3. Search by folder_path.
4. Search by document_type.
5. Search private dataset forbidden.
6. Search Dify partial failure.
7. Search empty results.
8. Answer mode without DIFY_APP_API_KEY returns warning.

### External API

1. Create document with API key.
2. Reject without scope.
3. Upload URL with API key.
4. Commit upload triggers Dify job.
5. Soft delete through external API.
6. External search.
7. Rate limit works.

## Frontend tests

Добавь базовые component tests:

1. DocumentsTable.
2. DocumentDrawer.
3. UploadDocumentDrawer.
4. ProjectTree.
5. SearchPage.
6. ProcessingStatusTag.
7. DifyIndexingTimeline.
8. ApiKeyCreateModal.
9. IntegrationHealthCards.
10. DepartmentSkillsEditor.

## Docker и deployment

Создай/проверь:

```text
apps/api/Dockerfile
apps/web/Dockerfile
infra/platform/docker-compose.platform.example.yml
infra/platform/nginx.conf
docs/DEPLOYMENT.md
```

Production assumptions:

1. PostgreSQL — внешний Managed Service for PostgreSQL.
2. S3 — Cloud.ru Object Storage.
3. Dify — отдельный self-hosted stack.
4. Qdrant — отдельный service, подключенный к Dify.
5. LM Studio — на GPU-сервере как OpenAI-compatible endpoint.
6. Наше приложение — отдельный API + Web.

`docker-compose.platform.example.yml` должен содержать:

1. api.
2. web/nginx.
3. env для подключения к Managed PostgreSQL.
4. env для S3.
5. env для Dify.
6. env для LM Studio health.
7. env для Qdrant read-only health.
8. `extra_hosts: host.docker.internal:host-gateway` для Linux.
9. Healthchecks.

## docs/DEPLOYMENT.md

Опиши:

1. Как создать Managed PostgreSQL.
2. Как задать `DATABASE_URL`.
3. Как создать S3 bucket.
4. Как включить Versioning/Object Lock.
5. Почему приложению не нужны права DeleteObject.
6. Как поднять Qdrant.
7. Как подключить Qdrant в Dify.
8. Как запустить LM Studio.
9. Как загрузить Qwen3-Embedding-8B.
10. Как подключить LM Studio provider в Dify.
11. Как создать Dify Knowledge API key.
12. Как запустить наше приложение.
13. Как выполнить migrations.
14. Как выполнить seed.
15. Как открыть admin UI.
16. Как проверить integrations health.
17. Как загрузить тестовый документ.
18. Как проверить, что document indexed.
19. Как выполнить тестовый search.
20. Backup рекомендации.

## Environment documentation

Проверь, что `.env.example` полный и сгруппирован:

- App;
- Database;
- Auth;
- S3;
- Dify;
- LM Studio;
- Qdrant;
- Queue;
- Security limits;
- CORS;
- Seed.

## CI workflow

Добавь пример GitHub Actions workflow:

```text
.github/workflows/ci.yml
```

Jobs:

1. install;
2. lint;
3. typecheck;
4. test;
5. build.

Не добавляй реальные секреты.

## Финальная ревизия

Создай `docs/FINAL_REVIEW.md`:

1. Что реализовано.
2. Как устроена Dify-first архитектура.
3. Как документы попадают в Dify.
4. Как Dify пишет в Qdrant.
5. Почему приложение не пишет в Qdrant.
6. Как работает S3 versioning/soft delete.
7. Какие env нужны.
8. Как запустить локально.
9. Как запустить production.
10. Как проверить health.
11. Как проверить upload → Dify → Qdrant → search.
12. Ограничения текущей версии.
13. Что делать следующим этапом.

## Проверки

Запусти:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Если есть docker build scripts, запусти их тоже.

Исправь все ошибки.

В финальном ответе Claude Code должен кратко перечислить:

1. Что было сделано.
2. Какие команды проверок прошли.
3. Какие env нужно заполнить перед запуском.
4. Какие ограничения остались.
