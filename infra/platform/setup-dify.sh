#!/usr/bin/env bash
set -euo pipefail
source /opt/difyrag/infra/platform/.deploy-secrets.env

EMAIL="admin@02.vibe.cloud-ip.cc"
NAME="DKP Admin"

# Initialize Dify if not started
STEP=$(curl -s http://127.0.0.1:8090/console/api/setup | python3 -c 'import sys,json; print(json.load(sys.stdin).get("step",""))')
if [[ "$STEP" == "not_started" || "$STEP" == "finished" ]]; then
  if [[ "$STEP" == "not_started" ]]; then
    echo "Initializing Dify..."
    curl -s -X POST http://127.0.0.1:8090/console/api/setup \
      -H 'Content-Type: application/json' \
      -d "{\"email\":\"${EMAIL}\",\"password\":\"${DIFY_INIT_PASSWORD}\",\"name\":\"${NAME}\"}" | head -c 500
    echo
  fi
fi

# Login and create dataset API key
LOGIN=$(curl -s -X POST http://127.0.0.1:8090/console/api/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${DIFY_INIT_PASSWORD}\"}")
TOKEN=$(echo "$LOGIN" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("data",{}).get("access_token",""))' 2>/dev/null || true)
if [[ -z "$TOKEN" ]]; then
  echo "Dify login failed: $LOGIN"
  exit 1
fi
echo "Dify login ok"

# Create knowledge API key if none exists
KEYS=$(curl -s http://127.0.0.1:8090/console/api/datasets/api-keys \
  -H "Authorization: Bearer ${TOKEN}")
API_KEY=$(echo "$KEYS" | python3 -c 'import sys,json; d=json.load(sys.stdin); items=d.get("data",[]); print(items[0]["token"] if items else "")' 2>/dev/null || true)
if [[ -z "$API_KEY" ]]; then
  NEW=$(curl -s -X POST http://127.0.0.1:8090/console/api/datasets/api-keys \
    -H "Authorization: Bearer ${TOKEN}" \
    -H 'Content-Type: application/json' \
    -d '{"type":"dataset"}')
  API_KEY=$(echo "$NEW" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("data",{}).get("token",""))')
fi

if [[ -n "$API_KEY" ]]; then
  export API_KEY
  python3 - <<'PY'
import os, re
path = "/opt/difyrag/infra/platform/api.env"
text = open(path).read()
text = re.sub(r'^DIFY_KNOWLEDGE_API_KEY=.*$', f'DIFY_KNOWLEDGE_API_KEY={os.environ["API_KEY"]}', text, flags=re.M)
open(path, 'w').write(text)
PY
  cd /opt/difyrag/infra/platform
  docker compose -f docker-compose.prod.yml up -d api --force-recreate
  echo "DIFY_KNOWLEDGE_API_KEY updated"
else
  echo "Failed to create Dify API key"
fi

# Test LM Studio from Dify api container
docker compose -f /opt/dify/docker/docker-compose.yaml exec -T api curl -s http://host.docker.internal:1234/v1/models | head -c 300
echo

# Run portal seed
docker exec dkp-api sh -c 'cd apps/api && prisma db seed' 2>&1 | tail -8 || true

echo "Portal admin: ${EMAIL} / ${SEED_ADMIN_PASSWORD}"
echo "Dify admin: ${EMAIL} / ${DIFY_INIT_PASSWORD}"
