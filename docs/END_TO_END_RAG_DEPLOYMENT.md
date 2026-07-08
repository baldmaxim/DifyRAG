# End-to-end RAG deployment

Ordered playbook to bring up the whole Dify-first stack and prove the RAG loop, locally and on
the remote GPU server. Application **code** is identical between environments — only `.env`
values differ. **Data stores are NOT shared**: each environment has its own PostgreSQL, its own
Qdrant, and its own Dify datasets (see "Local → remote migration" — this matters because a local
run may use a smaller embedding model than the server's `Qwen3-Embedding-8B`).

## Startup order

1. **Cloud.ru S3** — create a bucket ([S3_CLOUD_RU_SETUP.md](S3_CLOUD_RU_SETUP.md)).
2. Enable **Versioning**.
3. Enable **Object Lock** if available.
4. Create **access keys without physical delete** rights.
5. Bring up **Qdrant** (`infra/qdrant/docker-compose.qdrant.yml`).
6. Start **LM Studio** and load the embedding model (server: `Qwen3-Embedding-8B`, dim 4096;
   **local testing: your smaller installed model** — then set `LM_STUDIO_EMBEDDING_MODEL` and
   `LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION` to its actual name/dim, or leave the dim `0`).
7. Bring up **Dify** with `VECTOR_STORE=qdrant` ([DIFY_SETUP.md](DIFY_SETUP.md)).
8. In Dify, add **LM Studio** as a model provider
   ([LM_STUDIO_DIFY_PROVIDER_SETUP.md](LM_STUDIO_DIFY_PROVIDER_SETUP.md)).
9. Create a **Dify Knowledge API key**.
10. Start our application (api + web) with the filled `.env`.
11. Check **health** (`GET /api/v1/integrations/health` → dify/lmstudio/qdrant/s3 = ok).
12. Upload a **test document** through the portal.
13. Confirm Dify **processed** the document (status → `completed`/`indexed`).
14. Confirm a **collection appeared in Qdrant** ([QDRANT_DIFY_MODE.md](QDRANT_DIFY_MODE.md)).
15. Run a **test search** through the portal (`POST /api/v1/search`) and get chunks back.

## Verifying the RAG loop directly in Dify (early de-risk, before the app)

Before wiring the portal, prove the engine alone works:

1. In Dify, create a Knowledge Base with the LM Studio embedding model.
2. Upload a file → wait for `completed`.
3. Check Qdrant has a collection whose vector size matches your model (4096 for Qwen3-8B;
   smaller — e.g. 384/768/1024 — for a local model). The exact number depends on the model, not 4096.
4. Use Dify's retrieve/test to confirm relevant chunks come back.

If this works, `Dify → LM Studio → Qdrant` is healthy and any later problem is in the portal wiring.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| **Dify can't see LM Studio** | Missing `extra_hosts: host.docker.internal:host-gateway` on Dify api/worker (Linux). Test from inside: `docker compose exec api curl http://host.docker.internal:1234/v1/models`. |
| **Dify doesn't write to Qdrant** | Wrong `QDRANT_URL`/`QDRANT_API_KEY`, or Dify not on Qdrant's network. Check Dify worker logs. |
| **Indexing stuck on `parsing`** | Large/complex file or worker overloaded; check Dify worker logs and resources. |
| **Indexing `error` (embedding model)** | LM Studio model not loaded, wrong model name, or a Dify KB reusing a collection built at a different dimension. The detected dim must equal `LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION` (4096 for Qwen3-8B, or your local model's dim). |
| **LM Studio health = `degraded`** | Detected dim ≠ `LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION`. Set it to the loaded model's real dim (or 0 to disable the check). Not a functional failure — ingestion is not blocked by this. |
| **S3 permission denied** | Keys lack `PutObject`/`GetObject`/`HeadObject`, or wrong endpoint/region/path-style. |
| **Container can't resolve `host.docker.internal`** | Add `extra_hosts: host.docker.internal:host-gateway` (Linux). |
| **Qdrant reachable from outside** | Bind to `127.0.0.1`, add firewall/VPN, always set `QDRANT_API_KEY`. |

## Local → remote migration

Local testing typically uses a **smaller embedding model** (dim e.g. 384/768/1024); the server
uses **`Qwen3-Embedding-8B` (dim 4096)**. A Qdrant collection is created at a fixed vector size,
so a small-dim local collection can NOT be reused with the 4096 model — Dify would error on the
size mismatch. Therefore:

- **Do NOT carry over** the local PostgreSQL DB or the local Qdrant volume to the server. Each
  environment gets a **fresh** Managed PostgreSQL, a **fresh** Qdrant, and **fresh** Dify datasets.
  (Reusing the DB would keep `dify_dataset_mappings` pointing at the local small-dim datasets.)
- Change `.env` for the server: `DATABASE_URL` (Managed PostgreSQL), `DIFY_BASE_URL`, `QDRANT_URL`,
  `LM_STUDIO_BASE_URL`, **`LM_STUDIO_EMBEDDING_MODEL`** and **`LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION`**
  (→ `qwen3-embedding-8b` / `4096`), public URLs and CORS.
- On the server, run `db:migrate` + `seed` on the fresh DB → the app auto-creates Dify datasets at
  4096 on first upload. (Self-healing: even if a mapping row referenced a non-existent dataset id,
  `ensureDataset` detects the 404 and recreates it in the current Dify.)
- If you *must* reuse a DB, first `TRUNCATE dify_dataset_mappings, dify_document_mappings;` and reset
  affected `documents.status`, then re-index so vectors are rebuilt at the new dimension.
- Re-run steps 11–15 on the server.
- Keep Qdrant and LM Studio off the public internet.
- Back up: PostgreSQL, the Qdrant volume, and rely on S3 Versioning.
