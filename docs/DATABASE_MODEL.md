# Модель данных (PostgreSQL / Prisma)

Единственный источник истины по metadata, версиям, правам, jobs, audit и Dify-mappings.
Полная Prisma-схema реализуется в промте 03 (core) и промте 04 (Dify/processing). Ниже —
логическая модель.

## Основные сущности (промт 03)

| Таблица | Назначение | Ключевые поля |
|---|---|---|
| `users` | Пользователи | `email` unique, `password_hash`, `role`, `status` |
| `refresh_tokens` | Refresh-токены | `token_hash`, `expires_at`, `revoked_at` |
| `api_keys` | Внешние ключи | `prefix` unique, `secret_hash`, `scopes[]`, `status`, `expires_at` |
| `projects` | Проекты/ЖК | `code` unique, `status`, `metadata` |
| `departments` | Отделы | `slug` unique, `skills_markdown` |
| `folders` | Дерево папок | `scope`, `project_id?`, `parent_id?`, `path`; unique `scope+project_id+path` |
| `document_types` | Справочник типов | `code` unique (~30 типов) |
| `documents` | Документы | `scope`, `folder_id`, `document_type_id`, `status`, `confidentiality`, `current_version_id?`, `deleted_at?` |
| `document_versions` | Версии файлов | `version_no`, `s3_bucket`, `s3_key`, `s3_version_id?`, `checksum_sha256`, `is_current`; unique `document_id+version_no` |
| `file_upload_sessions` | Presigned-загрузки | `s3_key`, `status`, `expires_at` |
| `processing_jobs` | Фоновые задачи | `job_type`, `status`, `attempts`, `error_message?` |
| `audit_logs` | Аудит | `actor_type`, `action`, `resource_type`, `resource_id`, `before/after` |
| `project_members` | Участники проекта | unique `project_id+user_id`, `role` |

## Dify / processing (промт 04)

| Таблица | Назначение |
|---|---|
| `dify_dataset_mappings` | Маппинг scope/project/folder_group → Dify dataset (`dify_dataset_id`, `strategy`, `status`) |
| `dify_document_mappings` | Маппинг версии документа → Dify document (`dify_document_id`, `dify_batch`, `indexing_status`, `completed/total_segments`); unique `document_version_id+dify_dataset_mapping_id` |
| `rag_search_logs` | Логи RAG-поиска (query, datasets, latency, result_count, status) |
| `integration_health_checks` | История health по provider (`dify`/`lmstudio`/`qdrant`/`s3`) |

## Enums (в `@dkp/shared`)

`UserRole` (admin/user), `Scope`, `DocumentStatus`,
`DifyIndexingStatus` (pending…completed/error/archived/disabled), `Confidentiality`,
`DocumentTypeCode`, `ProcessingJobType`, `ProcessingJobStatus`, `ApiKeyScope`.

В Prisma эти значения дублируются как native enum либо строковые поля с CHECK — источник
значений остаётся `@dkp/shared`, чтобы backend и frontend не расходились.

## Инварианты целостности

- `documents.current_version_id` обновляется **только** после успешного commit загрузки.
- Soft delete: выставляется `documents.deleted_at`/`deleted_by_user_id`; строки не удаляются.
- `document_versions` иммутабельны после создания (новый файл = новая версия).
- Любое критичное изменение сопровождается записью в `audit_logs`.
