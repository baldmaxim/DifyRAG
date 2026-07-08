# External API

External systems authenticate with an API key via the `X-API-Key` header
(`<prefix>.<secret>`) and are limited by per-key scopes and a rate limit.

Base path: `/api/v1/external`. All endpoints require `X-API-Key`.

## Scopes

| Scope | Grants |
|---|---|
| `documents:read` | GET documents, list |
| `documents:write` | create, update, upload-url, commit-upload, restore |
| `documents:delete` | soft delete |
| `search:read` | POST /external/search |
| `processing:write` | reindex |

Private datasets (`company__people_private`) are excluded from external search.

## Endpoints & curl examples

Set `KEY=<prefix>.<secret>` and `BASE=http://localhost:3000/api/v1`.

### Create document

```bash
curl -X POST "$BASE/external/documents" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{
  "scope": "project",
  "project_code": "zilart-lot-31",
  "folder_path": "07-finance/03-ks2-ks3/01-customer-ks2",
  "document_type": "ks2",
  "title": "КС-2 за июнь 2026",
  "document_date": "2026-06-30",
  "counterparty": "Заказчик",
  "confidentiality": "internal"
}'
```

### Get an upload URL

```bash
curl -X POST "$BASE/external/documents/$DOC_ID/upload-url" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{
  "file_name": "ks2-june.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 123456,
  "checksum_sha256": "<64-hex>"
}'
```

### Upload the file to S3 (presigned PUT), then commit

```bash
curl -X PUT --upload-file ks2-june.pdf "<uploadUrl-from-previous-step>"

curl -X POST "$BASE/external/documents/$DOC_ID/commit-upload" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{
  "uploadSessionId": "<uploadSessionId>"
}'
# commit triggers the Dify processing pipeline automatically
```

### Reindex

```bash
curl -X POST "$BASE/external/documents/$DOC_ID/reindex" -H "X-API-Key: $KEY"
```

### Search

```bash
curl -X POST "$BASE/external/search" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{
  "query": "Найди КС-2 по заказчику за июнь 2026",
  "scope": "project",
  "project_code": "zilart-lot-31",
  "folder_path": "07-finance/03-ks2-ks3/01-customer-ks2",
  "document_type": "ks2",
  "top_k": 10,
  "mode": "chunks"
}'
```

### Soft delete (never physical)

```bash
curl -X DELETE "$BASE/external/documents/$DOC_ID" -H "X-API-Key: $KEY"
# soft delete in Postgres + Dify archive job; S3 original is retained
```

## Errors & limits

- Missing/invalid key → 401. Missing scope → 403.
- Rate limit exceeded → 429 (per key, `EXTERNAL_RATE_LIMIT_PER_MIN`).
- All external actions are written to `audit_logs`; secrets are never logged.
