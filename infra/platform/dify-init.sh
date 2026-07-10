#!/usr/bin/env bash
set -euo pipefail
source /opt/difyrag/infra/platform/.deploy-secrets.env
EMAIL="admin@02.vibe.cloud-ip.cc"
NAME="DKP Admin"
COOKIE=/tmp/dify-init.cookie
INIT_PW=$(grep '^INIT_PASSWORD=' /opt/dify/docker/.env | cut -d= -f2-)
rm -f "$COOKIE"

echo "1) Init password validation (session cookie)"
curl -s -c "$COOKIE" -X POST http://127.0.0.1:8090/console/api/init \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"${INIT_PW}\"}"
echo

echo "2) Setup admin account"
curl -s -b "$COOKIE" -c "$COOKIE" -X POST http://127.0.0.1:8090/console/api/setup \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${DIFY_INIT_PASSWORD}\",\"name\":\"${NAME}\"}"
echo

LOGIN=$(curl -s -X POST http://127.0.0.1:8090/console/api/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${DIFY_INIT_PASSWORD}\"}")
TOKEN=$(echo "$LOGIN" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("data",{}).get("access_token",""))' 2>/dev/null || true)
echo "3) Login token length: ${#TOKEN}"

if [[ -n "$TOKEN" ]]; then
  NEW=$(curl -s -X POST http://127.0.0.1:8090/console/api/datasets/api-keys \
    -H "Authorization: Bearer ${TOKEN}" \
    -H 'Content-Type: application/json' \
    -d '{"type":"dataset"}')
  API_KEY=$(echo "$NEW" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("data",{}).get("token",""))' 2>/dev/null || true)
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
    echo "4) Dify dataset API key saved"
  fi
fi

docker exec dkp-api sh -c 'cd apps/api && prisma db seed' 2>&1 | tail -5 || true
echo "Portal: ${EMAIL} / ${SEED_ADMIN_PASSWORD}"
echo "Dify: ${EMAIL} / ${DIFY_INIT_PASSWORD}"
