#!/usr/bin/env bash
set -euo pipefail
sed -i 's|127.0.0.1:6333:6333|172.17.0.1:6333:6333|' /opt/difyrag/infra/platform/docker-compose.prod.yml
sed -i 's|127.0.0.1:6334:6334|172.17.0.1:6334:6334|' /opt/difyrag/infra/platform/docker-compose.prod.yml
cd /opt/difyrag/infra/platform
docker compose -f docker-compose.prod.yml up -d qdrant --force-recreate
sleep 5
source /opt/difyrag/infra/platform/.deploy-secrets.env
docker compose -f /opt/dify/docker/docker-compose.yaml exec -T api \
  curl -sS -H "api-key: ${QDRANT_API_KEY}" http://172.17.0.1:6333/collections | head -c 200
echo
