# Qdrant (vector store for Dify)

Qdrant stores the vectors, but **Dify owns and manages the collections** — nothing else
writes to Qdrant; manual access is read-only diagnostics.

## Run

```bash
cp qdrant.env.example .env        # set a strong QDRANT_API_KEY
docker compose -f docker-compose.qdrant.yml --env-file .env up -d
```

- REST API: `http://localhost:6333`
- gRPC: `localhost:6334`
- Dashboard: `http://localhost:6333/dashboard`

## Health

```bash
curl -H "api-key: $QDRANT_API_KEY" http://localhost:6333/readyz
curl -H "api-key: $QDRANT_API_KEY" http://localhost:6333/collections
```

After you index the first document in Dify, a collection appears here automatically.

## Security

- **Never** publish 6333/6334 to the public internet without a firewall/VPN.
- On a server, bind to `127.0.0.1` (see the commented port mapping) so only Dify (same host /
  same Docker network) can reach it.
- Always set `QDRANT_API_KEY`.

## Connecting Dify to Qdrant

In Dify's `.env` set (see `infra/dify/.env.qdrant.s3.lmstudio.example`):

```env
VECTOR_STORE=qdrant
QDRANT_URL=http://qdrant:6333          # or http://host-ip:6333
QDRANT_API_KEY=<same as here>
QDRANT_GRPC_ENABLED=true
QDRANT_GRPC_PORT=6334
```

If Dify and Qdrant run in the **same** compose network, use the service name (`qdrant`) as host.
