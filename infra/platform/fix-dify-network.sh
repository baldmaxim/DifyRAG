#!/usr/bin/env bash
set -euo pipefail
source /opt/difyrag/infra/platform/.deploy-secrets.env
export QDRANT_API_KEY
cd /opt/dify/docker

cat >docker-compose.override.yaml <<YAML
services:
  api:
    extra_hosts:
      - 'host.docker.internal:host-gateway'
    environment:
      VECTOR_STORE: qdrant
      QDRANT_URL: http://172.17.0.1:6333
      QDRANT_API_KEY: ${QDRANT_API_KEY}
      QDRANT_GRPC_ENABLED: 'true'
      QDRANT_GRPC_PORT: '6334'

  worker:
    extra_hosts:
      - 'host.docker.internal:host-gateway'
    environment:
      VECTOR_STORE: qdrant
      QDRANT_URL: http://172.17.0.1:6333
      QDRANT_API_KEY: ${QDRANT_API_KEY}
YAML

docker compose up -d api worker
sleep 5
docker compose exec -T api curl -sS http://172.17.0.1:1235/v1/models | head -c 150
echo
docker compose exec -T api curl -sS -H "api-key: ${QDRANT_API_KEY}" http://172.17.0.1:6333/collections | head -c 150
echo
