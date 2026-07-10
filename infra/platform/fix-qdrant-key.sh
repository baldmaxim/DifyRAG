#!/usr/bin/env bash
set -euo pipefail
cd /opt/difyrag/infra/platform
set -a
source .deploy-secrets.env
set +a
docker compose --env-file .deploy-secrets.env -f docker-compose.prod.yml up -d qdrant api --force-recreate
sleep 10
source .deploy-secrets.env
docker compose -f /opt/dify/docker/docker-compose.yaml exec -T api \
  curl -sS -H "api-key: ${QDRANT_API_KEY}" http://172.17.0.1:6333/collections
echo
