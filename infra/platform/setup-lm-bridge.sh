#!/usr/bin/env bash
set -euo pipefail

# LM Studio listens on 127.0.0.1 only; Docker containers reach the host via 172.17.0.1.
# Bridge with socat on the docker gateway without exposing LM Studio on 0.0.0.0.
if ! command -v socat >/dev/null; then
  apt-get update && apt-get install -y socat
fi

pkill -f 'socat TCP-LISTEN:1235,bind=172.17.0.1' 2>/dev/null || true
nohup socat TCP-LISTEN:1235,bind=172.17.0.1,reuseaddr,fork TCP:127.0.0.1:1234 >/var/log/lmstudio-bridge.log 2>&1 &

python3 - <<'PY'
import re
path = "/opt/difyrag/infra/platform/api.env"
text = open(path).read()
text = re.sub(r'^LM_STUDIO_BASE_URL=.*$', 'LM_STUDIO_BASE_URL=http://172.17.0.1:1235/v1', text, flags=re.M)
text = re.sub(r'^QDRANT_URL=.*$', 'QDRANT_URL=http://qdrant:6333', text, flags=re.M)
text = re.sub(r'^DIFY_BASE_URL=.*$', 'DIFY_BASE_URL=http://172.17.0.1:8090', text, flags=re.M)
open(path, 'w').write(text)
PY

cd /opt/difyrag/infra/platform
docker compose -f docker-compose.prod.yml up -d api --force-recreate
sleep 15

docker exec dkp-api wget -qO- http://172.17.0.1:1235/v1/models 2>&1 | head -c 150
echo
