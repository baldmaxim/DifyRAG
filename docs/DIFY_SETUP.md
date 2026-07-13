# Dify setup

Dify is the primary RAG engine and is installed **separately** (we never vendor its sources).

## 1. Install

```bash
git clone https://github.com/langgenius/dify.git
cd dify/docker
cp .env.example .env
```

## 2. Configure for the Dify-first stack

Merge the keys from [`../infra/dify/.env.qdrant.s3.lmstudio.example`](../infra/dify/.env.qdrant.s3.lmstudio.example)
into `dify/docker/.env`:

- `VECTOR_STORE=qdrant`, `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_GRPC_ENABLED=true`
- a strong `SECRET_KEY` and `INIT_PASSWORD`
- console/service/app URLs and CORS origins for your host
- (optional) `STORAGE_TYPE=s3` + Cloud.ru S3 keys if Dify should store files in S3

Copy [`../infra/dify/docker-compose.override.example.yml`](../infra/dify/docker-compose.override.example.yml)
to `dify/docker/docker-compose.override.yaml` so `api`/`worker` get `host.docker.internal` and Qdrant env.

## 3. Start

```bash
docker compose up -d
docker compose ps        # api, worker, web, db, redis, ... should be healthy
```

Open the console (default `http://localhost/install`) and set the admin password.

## 4. Model provider

- Add LM Studio as an OpenAI-compatible provider —
  [LM_STUDIO_DIFY_PROVIDER_SETUP.md](LM_STUDIO_DIFY_PROVIDER_SETUP.md).
- (Optional) create **Knowledge/App API keys** (Settings → API access) if external
  integrations need programmatic access to Dify.

## 5. Verify

- Create a Knowledge Base, upload a test file, wait for `completed`.
- Confirm a collection appears in Qdrant ([QDRANT_DIFY_MODE.md](QDRANT_DIFY_MODE.md)).
- Run a retrieval test in the KB and confirm relevant chunks come back.
