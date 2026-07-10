#!/usr/bin/env bash
set -euo pipefail

echo "=== DKP status ==="
curl -s http://127.0.0.1:3000/api/v1/health
echo
curl -s -o /dev/null -w 'web local: %{http_code}\n' http://127.0.0.1:8080/
curl -s -o /dev/null -w 'domain: %{http_code}\n' https://02.vibe.cloud-ip.cc/ -k

echo "=== Dify ==="
curl -s -o /dev/null -w 'dify install page: %{http_code}\n' http://127.0.0.1:8090/install
curl -s http://127.0.0.1:8090/console/api/setup | head -c 400 || true
echo

echo "=== LM Studio from Dify api container ==="
docker compose -f /opt/dify/docker/docker-compose.yaml exec -T api curl -s http://host.docker.internal:1234/v1/models | head -c 500 || true
echo

echo "=== Integrations health ==="
curl -s http://127.0.0.1:3000/api/v1/integrations/health || true
echo

echo "=== Seed admin if missing ==="
docker exec dkp-api sh -c 'cd apps/api && npx tsx prisma/seed.ts' 2>/dev/null || \
docker exec dkp-api sh -c 'cd apps/api && node ../../node_modules/.pnpm/tsx@*/node_modules/tsx/dist/cli.mjs prisma/seed.ts' 2>/dev/null || \
echo 'seed needs manual run'

source /opt/difyrag/infra/platform/.deploy-secrets.env
echo "Admin email: admin@02.vibe.cloud-ip.cc"
echo "Admin password: ${SEED_ADMIN_PASSWORD}"
echo "Dify init password: ${DIFY_INIT_PASSWORD}"
