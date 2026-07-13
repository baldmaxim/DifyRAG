# End-to-end RAG deployment

Ordered playbook to bring up the Dify stack and prove the RAG loop, locally and on the
remote GPU server. **Dify UI is the main system** — documents are uploaded and searched
directly in Dify. **Data stores are NOT shared** between environments: each has its own
Qdrant and its own Dify Knowledge Bases (a local run may use a smaller embedding model
than the server's `Qwen3-Embedding-8B`).

## Startup order

1. Bring up **Qdrant** (`infra/qdrant/docker-compose.qdrant.yml` locally,
   `infra/platform/docker-compose.prod.yml` on the server).
2. Start **LM Studio** and load the embedding model (server: `Qwen3-Embedding-8B`, dim 4096;
   local testing: your smaller installed model) plus an LLM for answers.
3. Bring up **Dify** with `VECTOR_STORE=qdrant` ([DIFY_SETUP.md](DIFY_SETUP.md)).
4. In Dify, add **LM Studio** as a model provider
   ([LM_STUDIO_DIFY_PROVIDER_SETUP.md](LM_STUDIO_DIFY_PROVIDER_SETUP.md)).
5. Prove the RAG loop (next section).

## Verifying the RAG loop in Dify

1. In Dify, create a Knowledge Base with the LM Studio embedding model.
2. Upload a file → wait for `completed`.
3. Check Qdrant has a collection whose vector size matches your model (4096 for Qwen3-8B;
   smaller — e.g. 384/768/1024 — for a local model). The exact number depends on the model.
4. Use Dify's retrieve/test to confirm relevant chunks come back.
5. Optional: create a Chat App on top of the KB and confirm answers cite the document.

If this works, `Dify → LM Studio → Qdrant` is healthy.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| **Dify can't see LM Studio** | Missing `extra_hosts: host.docker.internal:host-gateway` on Dify api/worker (Linux). Test from inside: `docker compose exec api curl http://host.docker.internal:1234/v1/models`. |
| **Dify doesn't write to Qdrant** | Wrong `QDRANT_URL`/`QDRANT_API_KEY`, or Dify not on Qdrant's network. Check Dify worker logs. |
| **Indexing stuck on `parsing`** | Large/complex file or worker overloaded; check Dify worker logs and resources. |
| **Indexing `error` (embedding model)** | LM Studio model not loaded, wrong model name, or a Dify KB reusing a Qdrant collection built at a different dimension. |
| **Container can't resolve `host.docker.internal`** | Add `extra_hosts: host.docker.internal:host-gateway` (Linux). |
| **Qdrant reachable from outside** | Bind to `127.0.0.1`, add firewall/VPN, always set `QDRANT_API_KEY`. |

## Local → remote migration

Local testing typically uses a **smaller embedding model** (dim e.g. 384/768/1024); the server
uses **`Qwen3-Embedding-8B` (dim 4096)**. A Qdrant collection is created at a fixed vector size,
so a small-dim local collection can NOT be reused with the 4096 model — Dify would error on the
size mismatch. Therefore:

- **Do NOT carry over** the local Qdrant volume or local Dify data to the server. Each
  environment gets a fresh Qdrant and fresh Dify Knowledge Bases built at its model's dimension.
- Re-run the RAG-loop verification on the server.
- Keep Qdrant and LM Studio off the public internet; only Dify UI is published via host proxy.
- Back up: Dify's own Postgres/storage volumes and the Qdrant volume.
