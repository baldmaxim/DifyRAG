#!/usr/bin/env bash
source /opt/difyrag/infra/platform/.deploy-secrets.env
echo "=== Portal ==="
curl -s http://127.0.0.1:3000/api/v1/health
echo
curl -s -o /dev/null -w 'https://02.vibe.cloud-ip.cc -> %{http_code}\n' https://02.vibe.cloud-ip.cc/ -k

echo "=== LM Studio from dkp-api ==="
docker exec dkp-api wget -qO- http://host.docker.internal:1234/v1/models 2>&1 | head -c 400
echo

echo "=== LM Studio from dify-api ==="
docker compose -f /opt/dify/docker/docker-compose.yaml exec -T api curl -s http://host.docker.internal:1234/v1/models 2>&1 | head -c 400
echo

echo "=== Qdrant ==="
curl -s -H "api-key: ${QDRANT_API_KEY}" http://127.0.0.1:6333/collections | head -c 200
echo

echo "=== Dify ==="
curl -s http://127.0.0.1:8090/console/api/setup
echo

echo "=== Credentials (from .deploy-secrets.env) ==="
echo "Portal: admin@02.vibe.cloud-ip.cc / ${SEED_ADMIN_PASSWORD}"
echo "Dify console: http://127.0.0.1:8090 (admin@02.vibe.cloud-ip.cc / ${DIFY_INIT_PASSWORD})"
echo "Dify init password (first screen): $(grep '^INIT_PASSWORD=' /opt/dify/docker/.env | cut -d= -f2-)"
