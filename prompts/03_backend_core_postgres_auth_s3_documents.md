# Prompt 3 — backend core: PostgreSQL, Auth, S3, проекты, папки, документы

Реализуй основной backend приложения **Document Knowledge Portal**.

Напоминание: Dify будет главным RAG-движком, но в этом промте нужно построить фундамент приложения: PostgreSQL schema, auth, S3 storage, проекты, папки, документы, версии, audit.

## Backend stack

```text
NestJS + TypeScript
Prisma ORM
Managed PostgreSQL
AWS SDK v3 for S3-compatible Cloud.ru
JWT auth
API keys
Swagger/OpenAPI
pg-boss будет добавлен/использован для processing jobs
```

## Prisma schema

Реализуй модели:

### users

- id uuid
- email unique
- password_hash
- full_name
- role: super_admin | admin | manager | editor | viewer
- status: active | disabled
- created_at
- updated_at

### refresh_tokens

- id uuid
- user_id
- token_hash
- expires_at
- revoked_at
- created_at

### api_keys

- id uuid
- name
- prefix unique
- secret_hash
- scopes string[]
- status: active | revoked
- created_by_user_id
- last_used_at
- expires_at
- created_at
- revoked_at

Scopes:

```text
documents:read
documents:write
documents:delete
projects:read
projects:write
search:read
processing:write
integrations:read
integrations:write
```

### projects

- id uuid
- code unique
- name
- description
- address
- customer_name
- status: active | archived
- metadata jsonb
- created_at
- updated_at

### departments

- id uuid
- slug unique
- name
- description
- skills_markdown
- metadata jsonb
- created_at
- updated_at

### folders

- id uuid
- scope: project | company | people | contractors | reference | templates
- project_id nullable
- department_id nullable
- parent_id nullable
- slug
- name
- path
- sort_order
- metadata jsonb
- created_at
- updated_at

Unique: `scope + project_id + path`.

### document_types

- id uuid
- code unique
- name
- description
- metadata jsonb

Добавь типы:

```text
project_card
contract
additional_agreement
letter_in
letter_out
tender
design_documentation
working_documentation
working_documentation_remark
estimate
ks2
ks3
material_payment_allocation_letter
upd
ttn
delivery_photo
court_claim
court_decision
warranty_request
defect_list
additional_work_calculation
meeting_protocol
schedule
risk
photo
video
template
department_skill
employee_info
```

### documents

- id uuid
- scope
- project_id nullable
- department_id nullable
- folder_id
- document_type_id
- title
- description
- document_date nullable
- counterparty nullable
- contract_number nullable
- status: draft | active | uploading | stored | queued | processing | indexed | error | deleted
- confidentiality: public | internal | confidential | restricted
- access_group nullable
- current_version_id nullable
- metadata jsonb
- deleted_at nullable
- deleted_by_user_id nullable
- created_by_user_id
- updated_by_user_id nullable
- created_at
- updated_at

### document_versions

- id uuid
- document_id
- version_no int
- original_file_name
- mime_type
- size_bytes bigint
- checksum_sha256
- s3_bucket
- s3_key
- s3_version_id nullable
- uploaded_by_user_id nullable
- upload_source: web | external_api | system
- is_current boolean
- created_at

Unique: `document_id + version_no`.

### file_upload_sessions

- id uuid
- document_id nullable
- intended_file_name
- mime_type
- size_bytes nullable
- checksum_sha256 nullable
- s3_bucket
- s3_key
- status: created | uploaded | committed | expired | failed
- expires_at
- created_by_user_id nullable
- created_by_api_key_id nullable
- created_at
- committed_at nullable

### processing_jobs

- id uuid
- document_id nullable
- document_version_id nullable
- job_type: dify_create_document | dify_update_document | dify_archive_document | dify_restore_document | dify_reindex_document | dify_poll_indexing_status
- status: queued | running | success | failed | skipped
- provider: dify
- attempts int
- error_message nullable
- started_at nullable
- finished_at nullable
- created_at
- updated_at

### audit_logs

- id uuid
- actor_type: user | api_key | system
- actor_user_id nullable
- actor_api_key_id nullable
- action
- resource_type
- resource_id
- ip nullable
- user_agent nullable
- before jsonb nullable
- after jsonb nullable
- created_at

### project_members

- id uuid
- project_id
- user_id
- role: owner | manager | editor | viewer
- created_at

Unique: `project_id + user_id`.

## Seed

Добавь seed script:

1. Создать super admin из env:
   - `SEED_ADMIN_EMAIL`
   - `SEED_ADMIN_PASSWORD`
   - `SEED_ADMIN_FULL_NAME`
2. Создать базовые document_types.
3. Создать стандартные отделы:
   - legal;
   - commercial;
   - finance;
   - accounting;
   - production;
   - procurement;
   - pto;
   - design-review;
   - hr;
   - it;
   - warranty;
   - safety.
4. Seed должен быть идемпотентным.

## Структура папок проекта

При создании проекта автоматически создавай стандартное дерево папок из `CLAUDE.md`.

Добавь функцию:

```text
createDefaultProjectFolderTree(projectId, projectCode)
```

Требования:

1. `path` — полный путь относительно проекта.
2. `slug` — URL-safe.
3. Повторный запуск не создаёт дубликаты.
4. Unit tests на генерацию дерева.

## Storage module для Cloud.ru S3

Реализуй `StorageService` на AWS SDK v3:

- `createPresignedPutUrl(params)`;
- `createPresignedGetUrl(params)`;
- `headObject(params)`;
- `copyObject(params)`;
- `getObjectMetadata(params)`.

Запрещено реализовывать физическое удаление объектов. Метод `deleteObject` должен отсутствовать или бросать `ForbiddenByPolicy`.

Object key:

```text
documents/{scope}/{projectCodeOrGlobal}/{yyyy}/{mm}/{documentId}/{versionNo}/{safeFileName}
```

Добавь проверку:

- allowlist file extensions:
  - pdf, doc, docx, xls, xlsx, csv, txt, md, jpg, jpeg, png, zip;
- max file size из env;
- mime type validation.

## Auth module

Реализуй:

1. Email/password login.
2. JWT access token.
3. Refresh token с hash в БД.
4. Logout.
5. Password hashing через argon2.
6. Guards:
   - JwtAuthGuard;
   - RolesGuard;
   - ApiKeyGuard.
7. Decorators:
   - `@CurrentUser()`;
   - `@CurrentApiKey()`;
   - `@Roles(...)`;
   - `@Scopes(...)`.
8. API keys:
   - генерация;
   - хранение только hash;
   - secret показывать только один раз;
   - prefix для поиска;
   - revoke;
   - last_used_at.

## CRUD modules

Реализуй backend endpoints:

### Projects

```text
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PATCH  /api/v1/projects/:id
DELETE /api/v1/projects/:id
```

DELETE проекта = archive, не физическое удаление.

### Folders

```text
GET    /api/v1/folders/tree
POST   /api/v1/folders
PATCH  /api/v1/folders/:id
DELETE /api/v1/folders/:id
```

Удалять папку можно только если она пустая. Предпочтительно archive/soft delete, если потребуется.

### Departments

```text
GET    /api/v1/departments
POST   /api/v1/departments
GET    /api/v1/departments/:id
PATCH  /api/v1/departments/:id
DELETE /api/v1/departments/:id
```

Поддержи `skills_markdown`.

### Documents

```text
GET    /api/v1/documents
POST   /api/v1/documents
GET    /api/v1/documents/:id
PATCH  /api/v1/documents/:id
DELETE /api/v1/documents/:id
POST   /api/v1/documents/:id/restore
POST   /api/v1/documents/:id/upload-url
POST   /api/v1/documents/:id/commit-upload
GET    /api/v1/documents/:id/download-url
GET    /api/v1/documents/:id/versions
POST   /api/v1/documents/:id/versions/:versionId/make-current
POST   /api/v1/documents/:id/reindex
```

Логика:

1. `POST /documents` создаёт metadata.
2. `upload-url` создаёт file_upload_session и presigned PUT URL.
3. Frontend грузит файл напрямую в S3.
4. `commit-upload` проверяет S3 object через headObject.
5. После commit создаётся новая `document_version`.
6. `current_version_id` обновляется только после успешного commit.
7. После commit создаётся processing job для Dify, но саму Dify-интеграцию реализуем в следующем промте.
8. DELETE документа — только soft delete.
9. Файлы S3 не удалять.
10. Все действия писать в audit_logs.

## Swagger

Добавь Swagger/OpenAPI:

- Bearer JWT;
- X-API-Key;
- tags по модулям.

## Проверки

Запусти:

```text
pnpm prisma generate
pnpm db:migrate
pnpm seed
pnpm lint
pnpm typecheck
pnpm test
```

Исправь ошибки.
