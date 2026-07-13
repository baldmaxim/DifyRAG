# Platform: Qdrant on the GPU host

`docker-compose.prod.yml` runs **Qdrant** — the vector store for Dify. Dify itself runs
separately from its official compose in `/opt/dify/docker` (see `../dify/` and
`../../docs/DIFY_SETUP.md`); the public domain is served by the host Caddy and proxies
to Dify's nginx (local port 8090).

> The former portal (api/web/postgres) is decommissioned. Its Postgres data stays in the
> `dkp_postgres_data` volume — never run `docker compose down -v` here.

## Run

```bash
cd /opt/difyrag/infra/platform
docker compose -f docker-compose.prod.yml up -d
```

`QDRANT_API_KEY` lives in `.deploy-secrets.env` (not in the repo).

## Helper scripts (server-side, one-off)

- `fix-dify-nginx.sh`, `fix-dify-network.sh` — Dify nginx on :8090, Qdrant wiring
  (`QDRANT_URL=http://172.17.0.1:6333` via the docker bridge gateway).
- `fix-qdrant-bind.sh` — bind Qdrant to `172.17.0.1` so Dify containers can reach it.
- `setup-lm-bridge.sh` — socat bridge so containers reach LM Studio without exposing it.
