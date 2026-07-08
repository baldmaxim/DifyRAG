# End-to-end RAG deployment

Ordered playbook to bring up the whole Dify-first stack and prove the RAG loop, locally and on
the remote GPU server. The only differences between environments are `.env` values.

## Startup order

1. **Cloud.ru S3** — create a bucket ([S3_CLOUD_RU_SETUP.md](S3_CLOUD_RU_SETUP.md)).
2. Enable **Versioning**.
3. Enable **Object Lock** if available.
4. Create **access keys without physical delete** rights.
5. Bring up **Qdrant** (`infra/qdrant/docker-compose.qdrant.yml`).
6. Start **LM Studio** and load the embedding model (`Qwen3-Embedding-8B`, dim 4096).
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
3. Check Qdrant has a collection with vector size 4096.
4. Use Dify's retrieve/test to confirm relevant chunks come back.

If this works, `Dify → LM Studio → Qdrant` is healthy and any later problem is in the portal wiring.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| **Dify can't see LM Studio** | Missing `extra_hosts: host.docker.internal:host-gateway` on Dify api/worker (Linux). Test from inside: `docker compose exec api curl http://host.docker.internal:1234/v1/models`. |
| **Dify doesn't write to Qdrant** | Wrong `QDRANT_URL`/`QDRANT_API_KEY`, or Dify not on Qdrant's network. Check Dify worker logs. |
| **Indexing stuck on `parsing`** | Large/complex file or worker overloaded; check Dify worker logs and resources. |
| **Indexing `error` (embedding model)** | LM Studio model not loaded, wrong model name, or dimension mismatch (must be 4096). |
| **S3 permission denied** | Keys lack `PutObject`/`GetObject`/`HeadObject`, or wrong endpoint/region/path-style. |
| **Container can't resolve `host.docker.internal`** | Add `extra_hosts: host.docker.internal:host-gateway` (Linux). |
| **Qdrant reachable from outside** | Bind to `127.0.0.1`, add firewall/VPN, always set `QDRANT_API_KEY`. |

## Local → remote migration

- Same stack; change only `.env`: `DATABASE_URL` (Managed PostgreSQL), `DIFY_BASE_URL`,
  `QDRANT_URL`, `LM_STUDIO_BASE_URL`, public URLs and CORS.
- Re-run steps 11–15 on the server.
- Keep Qdrant and LM Studio off the public internet.
- Back up: PostgreSQL, the Qdrant volume, and rely on S3 Versioning.
