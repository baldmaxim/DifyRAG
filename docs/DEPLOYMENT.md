# Deployment

Production layout on the GPU host — **Dify UI is the main system**:

1. **Dify** — self-hosted stack from the official repo (see [DIFY_SETUP.md](DIFY_SETUP.md)),
   the only component published to the internet (via host Caddy/nginx).
2. **Qdrant** — vector store for Dify (`infra/platform/docker-compose.prod.yml`),
   bound to 127.0.0.1.
3. **LM Studio** — on the GPU host as an OpenAI-compatible endpoint (:1234) with
   `Qwen3-Embedding-8B` (dim 4096) and an LLM for answers.

> The former portal (api/web/postgres containers) is decommissioned. Its Postgres data
> stays in the `dkp_postgres_data` volume — do not run `docker compose down -v`.

## 1. RAG stack

- Bring up **Qdrant**: `cd infra/platform && docker compose -f docker-compose.prod.yml up -d`
  (`QDRANT_API_KEY` in `.deploy-secrets.env`).
- Bring up **LM Studio** with `Qwen3-Embedding-8B` (dim 4096) + an LLM.
- Bring up **Dify** with `VECTOR_STORE=qdrant` — see [DIFY_SETUP.md](DIFY_SETUP.md) and
  `infra/dify/docker-compose.override.example.yml` (shared network with Qdrant,
  `extra_hosts: host.docker.internal:host-gateway` for LM Studio).
- Add LM Studio as a Dify model provider — see
  [LM_STUDIO_DIFY_PROVIDER_SETUP.md](LM_STUDIO_DIFY_PROVIDER_SETUP.md).

## 2. Publish Dify UI

- Point the public domain at Dify's nginx via host Caddy/nginx.
- Keep Qdrant and LM Studio off the public internet (127.0.0.1 + firewall/VPN).

## 3. Verify

1. Open Dify UI from outside, log in.
2. Create/open a Knowledge Base with the LM Studio embedding model, upload a test document,
   wait for indexing `completed`.
3. Retrieval test in the KB returns relevant chunks.
4. A collection exists in Qdrant (`curl -H "api-key: ..." http://127.0.0.1:6333/collections`
   on the host) with vector size 4096.

## 4. Backups

- Dify: its Postgres + storage volumes (official compose).
- Qdrant: snapshot the `dkp_qdrant_data` volume.
- Rotate any secret that was exposed.
