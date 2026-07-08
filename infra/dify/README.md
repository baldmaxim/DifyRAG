# Dify (primary RAG engine)

Dify is installed **separately** via its official method — we do not vendor Dify sources here.
This folder only provides the env and compose override needed to wire Dify to Qdrant, LM Studio
and (optionally) Cloud.ru S3.

## Install Dify

```bash
git clone https://github.com/langgenius/dify.git
cd dify/docker
cp .env.example .env
# then merge the keys from infra/dify/.env.qdrant.s3.lmstudio.example into this .env
```

## Wire to Qdrant + LM Studio

1. Merge `infra/dify/.env.qdrant.s3.lmstudio.example` into Dify's `docker/.env`
   (set `VECTOR_STORE=qdrant`, `QDRANT_URL`, `QDRANT_API_KEY`, and a strong `SECRET_KEY`/`INIT_PASSWORD`).
2. Copy `infra/dify/docker-compose.override.example.yml` to `dify/docker/docker-compose.override.yaml`
   so the `api` and `worker` containers get `host.docker.internal` and the Qdrant env.
3. Start Dify:

   ```bash
   docker compose up -d
   ```

4. Open the Dify console (default `http://localhost/install`), set the admin password.
5. Add **LM Studio** as an OpenAI-compatible model provider — see
   [../../docs/LM_STUDIO_DIFY_PROVIDER_SETUP.md](../../docs/LM_STUDIO_DIFY_PROVIDER_SETUP.md).
6. Create a **Knowledge API key** in Dify (Settings → API keys) for the portal's
   `DIFY_KNOWLEDGE_API_KEY`.

## Notes

- Keep Dify, Qdrant and LM Studio on the same host (or a private network) for local testing.
- The portal talks to Dify via `DIFY_BASE_URL` + `DIFY_API_PREFIX` (default `/v1`) with the
  Knowledge API key — all server-side.
- See [../../docs/DIFY_SETUP.md](../../docs/DIFY_SETUP.md) and
  [../../docs/END_TO_END_RAG_DEPLOYMENT.md](../../docs/END_TO_END_RAG_DEPLOYMENT.md).
