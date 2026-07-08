# RAG processing flow

## Общая последовательность

```text
commit-upload
  → processing_job (dify_create_document | dify_update_document)
  → worker: resolve dataset mapping (scope, project_id, folder_path, department_id)
  → (auto-create dataset в Dify при DIFY_AUTO_CREATE_DATASETS=true)
  → worker берёт текущую версию файла из S3
  → Dify create-by-file / update-by-file (multipart: file + data JSON)
  → сохраняем dify_dataset_id, dify_document_id, dify_batch, indexing_status
  → processing_job (dify_poll_indexing_status)
  → poller опрашивает indexing-status: waiting → parsing → cleaning → splitting → indexing → completed
  → completed: documents.status=indexed, mapping.indexing_status=completed, job.status=success
  → error:    documents.status=error, error_message, доступен retry/reindex
```

## Маппинг папок → folder_group (`resolveDifyFolderGroup`)

```text
00-project-card       → project_card
01-contracts          → contracts
02-correspondence     → correspondence
03-tender             → tender
04-design-docs        → design_docs
05-working-docs       → working_docs
06-estimates          → estimates
07-finance            → finance
08-schedule           → schedule
09-claims-risks       → claims_risks
10-meetings           → meetings
11-courts-litigation  → courts_litigation
12-warranty           → warranty
13-materials-on-site  → materials_on_site
14-additional-works   → additional_works
15-photo-video        → photo_video
98-old-versions       → archive
99-archive            → archive
```

Вложенные папки наследуют top-level раздел, напр.
`07-finance/03-ks2-ks3/01-customer-ks2 → finance`.

## Dataset naming

```text
project_{project_code}__{folder_group}      # проектные datasets
company__{section}                          # company__legal, company__finance, ...
company__people_private                     # отдельные права доступа
```

## Update / Delete / Restore

- **Update (новый файл):** новая `document_version` → `update-by-file` (или `create-by-file`
  при 404) → после `completed` новая версия становится current indexed.
- **Metadata-only:** reindex не нужен, кроме смены dataset (folder/project/scope/type) —
  тогда archive/disable старого + отправка в новый dataset.
- **Delete:** soft delete + job `dify_archive_document` (archive → disable → delete из индекса).
- **Restore:** restore + job `dify_restore_document` (un_archive → enable; иначе reupload из S3).

## Статусы, отображаемые пользователю

`queued, uploading, waiting, parsing, cleaning, splitting, indexing, completed, error,
archived, disabled` — UI показывает live-timeline и кнопку retry при ошибке.

## Надёжность worker

- `attempts` инкрементируется; фейлы фиксируются в `error_message`.
- Poller обновляет `last_polled_at`; UI polling каждые 3–5 сек.
- Приложение **никогда** не пишет в Qdrant в этом потоке — только Dify.
