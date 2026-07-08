# Dify-first архитектура

## Почему Dify — главный RAG-движок

Dify выступает единой точкой RAG-обработки: он парсит документы, чистит и разбивает их на
chunks, вызывает embedding-модель, сохраняет вектора и выполняет retrieval. Портал не
реализует собственный pipeline эмбеддингов — это уменьшает связность, убирает дублирование
логики chunking/embeddings и даёт единое место управления качеством поиска.

## Почему приложение не пишет в Qdrant напрямую

- **Единый владелец коллекций.** Схема коллекций, payload и размерность векторов задаются Dify.
  Прямая запись из приложения рассинхронизировала бы индекс с метаданными Dify.
- **Консистентность.** Dify отслеживает статусы documents/segments; сторонний upsert их сломает.
- **Безопасность.** Ключи Qdrant остаются в Dify; приложение имеет только read-only доступ.

Поэтому Qdrant-клиент приложения **не содержит** методов `upsert`, `deletePoints`,
`updateVectors`, `overwritePayload` — только `health`, `listCollections`, `getCollection`.

## Поток данных (end-to-end)

```text
upload → S3 (оригинал) → document_version (PostgreSQL)
      → processing_job (pg-boss)
      → Dify create-by-file / update-by-file
      → Dify: parsing → cleaning → splitting → indexing (embeddings через LM Studio)
      → Qdrant (Dify пишет вектора)
      → indexing-status polling → documents.status = indexed
      → поиск через Dify retrieve
```

## Роль LM Studio

LM Studio — OpenAI-совместимый endpoint (`/v1/models`, `/v1/embeddings`, при необходимости
`/v1/chat/completions`). В Dify он подключается как **OpenAI-compatible model provider**.
Модель эмбеддингов — `Qwen/Qwen3-Embedding-8B` (dimension 4096). Приложение обращается к LM
Studio **только** для health/диагностики (`listModels`, тестовый embedding, проверка dimension),
но не генерирует эмбеддинги документов самостоятельно.

## Dataset strategy: `project_section`

Datasets создаются не на каждую мелкую папку, а на **проект + крупный раздел**. Имена:

```text
project_{project_code}__contracts, project_{project_code}__finance, ...
company__legal, company__finance, ..., company__people_private (отдельные права)
```

Папки проекта маппятся в folder_group через `resolveDifyFolderGroup(folderPath)` (вложенные
папки наследуют top-level раздел). Полный маппинг — см. [RAG_PROCESSING_FLOW.md](RAG_PROCESSING_FLOW.md).

## Soft delete / restore в контексте Dify

- **Delete:** soft delete в PostgreSQL + job `dify_archive_document` (archive → disable → delete
  из индекса как крайний случай). S3-оригинал не трогаем.
- **Restore:** восстановление в PostgreSQL + job `dify_restore_document` (un_archive → enable;
  если документ в Dify отсутствует — повторная отправка текущей S3-версии).

## Замена файла и изменение metadata

- Новый файл → новая `document_version` → `update-by-file` (если есть `dify_document_id`),
  иначе `create-by-file`.
- Metadata-only изменения не требуют reindex, **кроме** случая смены dataset (folder/project/
  scope/type): тогда archive/disable старого документа и отправка в новый dataset.
