# S3 storage flow (Cloud.ru)

## Принципы

1. Оригиналы файлов и все их версии хранятся в **Cloud.ru S3** (S3-compatible).
2. PostgreSQL хранит только metadata: `s3_bucket`, `s3_key`, `s3_version_id`, `checksum_sha256`,
   `size_bytes`, `mime_type`, `original_file_name`.
3. **Физическое удаление объектов запрещено.** `StorageService` не имеет `deleteObject`
   (метод отсутствует или бросает `ForbiddenByPolicy`). У ключей приложения нет права `DeleteObject`.
4. Рекомендуется включить **Versioning** и **Object Lock** на bucket.

## Object key

```text
documents/{scope}/{projectCodeOrGlobal}/{yyyy}/{mm}/{documentId}/{versionNo}/{safeFileName}
```

## Presigned upload flow

```text
POST /documents                → создаётся metadata (document)
POST /documents/:id/upload-url  → file_upload_session + presigned PUT URL
[frontend] PUT file → S3        → загрузка напрямую в S3 (backend файл не проксирует)
POST /documents/:id/commit-upload → headObject проверяет объект (size/checksum),
                                    создаётся document_version, current_version_id обновляется,
                                    ставится processing_job для Dify
```

## StorageService (AWS SDK v3)

Разрешённые методы: `createPresignedPutUrl`, `createPresignedGetUrl`, `headObject`,
`copyObject`, `getObjectMetadata`. Запрещён любой physical delete.

## Валидация загрузок

- Allowlist расширений: `pdf, doc, docx, xls, xlsx, csv, txt, md, jpg, jpeg, png, zip`.
- `MAX_FILE_SIZE_BYTES` из env.
- Проверка mime type.

## Download

`GET /documents/:id/download-url` → presigned GET (TTL `S3_PRESIGNED_URL_TTL_SECONDS`).
Внутренние S3-ключи наружу без права download не отдаются. Создание download URL пишется в audit.
