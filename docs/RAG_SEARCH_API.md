# RAG Search API

Весь RAG-поиск идёт через **Dify retrieve / Dify App API**. Прямой поиск в Qdrant запрещён.

```text
Document Knowledge Portal → Dify retrieve API / Dify App API → Dify-managed Qdrant
```

## Endpoint

```text
POST /api/v1/search
POST /api/v1/external/search   # тот же контракт, auth через X-API-Key + scope search:read
```

## Request

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

## Response

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
      "source": { "file_name": "...", "document_version_id": "...", "page": null }
    }
  ],
  "sources": [{ "document_id": "...", "title": "...", "file_name": "...", "folder_path": "..." }],
  "trace_id": "...",
  "warnings": []
}
```

## DatasetResolver

- `scope=project` + `folder_path` → top-level section → соответствующий dataset.
- `scope=project` без `folder_path` → все active datasets проекта (parallel retrieve).
- `scope=company` → company datasets по department_slug/section.
- `scope=people_private` → проверка роли и `access_group`.
- Dataset отсутствует → `setup_required` с понятной ошибкой.

## Поведение поиска

1. Для каждого dataset — Dify `retrieve` (parallel с concurrency limit).
2. Объединение результатов, нормализация score.
3. Обогащение metadata из PostgreSQL (title, file_name, folder_path, project_code, type, version).
4. Post-filter по вложенным папкам; при малом числе результатов — второй проход с бóльшим top_k.
5. Логирование в `rag_search_logs`.
6. Private datasets по умолчанию исключаются из поиска.

## Режимы

- `mode=chunks` — только chunks и sources.
- `mode=answer` — если задан `DIFY_APP_API_KEY`, ответ формирует **Dify App/Workflow**; иначе
  возвращаются chunks + warning `answer_mode_not_configured`. Локальная генерация ответа вне
  Dify не выполняется.

## Non-RAG fallback

`GET /api/v1/documents/search` — административный поиск по metadata (title, description,
counterparty, contract_number, jsonb, project, folder). Это не RAG.
