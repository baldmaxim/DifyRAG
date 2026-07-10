#!/usr/bin/env bash
set -euo pipefail
STACK=/opt/difyrag/infra/platform
source "$STACK/.deploy-secrets.env"
export POSTGRES_PASSWORD
python3 - <<'PY'
import os, re
path = "/opt/difyrag/infra/platform/api.env"
pw = os.environ["POSTGRES_PASSWORD"]
url = f"postgresql://dkp:{pw}@postgres:5432/document_portal?schema=public"
text = open(path).read()
text = re.sub(r'^DATABASE_URL=.*$', f'DATABASE_URL={url}', text, flags=re.M)
open(path, 'w').write(text)
PY
cd "$STACK"
docker compose -f docker-compose.prod.yml up -d api web --force-recreate
sleep 30
docker logs dkp-api --tail 25
curl -s http://127.0.0.1:3000/api/v1/health || true
