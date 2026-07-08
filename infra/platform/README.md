# Platform deployment (Document Knowledge Portal app)

Deploys **our** application (api + web). The RAG stack (Dify + Qdrant + LM Studio) and the
database (Managed PostgreSQL) live elsewhere.

## Prerequisites

- External **Managed PostgreSQL** reachable via `DATABASE_URL`.
- **Cloud.ru S3** bucket + access keys (without DeleteObject).
- Running **Dify** stack with a Knowledge API key, plus Qdrant and LM Studio.
- `apps/api/Dockerfile`, `apps/web/Dockerfile`, `nginx.conf` (created in prompt 07).

## Run

```bash
cp ../../apps/api/.env.example ./api.env   # fill DATABASE_URL, S3_*, DIFY_*, LM_STUDIO_*, QDRANT_*
docker compose -f docker-compose.platform.example.yml up -d --build
```

- API: `http://<host>:3000/api/v1/health`
- Web: `http://<host>:8080`

## Environment that changes local → server

| Var | Local | Server |
|---|---|---|
| `DATABASE_URL` | dev Postgres container | Managed PostgreSQL |
| `DIFY_BASE_URL` | `http://localhost` | Dify private address |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant private address |
| `LM_STUDIO_BASE_URL` | `http://host.docker.internal:1234/v1` | GPU host private address |
| `CORS_ORIGIN` | `http://localhost:5173` | public web origin |

The application code does not change between environments — only `.env`.

See [../../docs/END_TO_END_RAG_DEPLOYMENT.md](../../docs/END_TO_END_RAG_DEPLOYMENT.md) and
[../../docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md) (the latter is created in prompt 07).
