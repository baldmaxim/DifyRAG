#!/usr/bin/env bash
set -euo pipefail

STACK=/opt/difyrag/infra/platform
SECRETS=$STACK/.deploy-secrets.env
DOMAIN=02.vibe.cloud-ip.cc
CADDY_FILE=/opt/rd-web/app/deploy/single-host/Caddyfile
RD_ENV=/opt/rd-web/app/deploy/single-host/.env

gen_hex() { openssl rand -hex 32; }
gen_b64() { openssl rand -base64 24 | tr -d '/+=' | head -c 24; }

if [[ ! -f "$SECRETS" ]]; then
  cat >"$SECRETS" <<EOF
POSTGRES_PASSWORD=$(gen_hex)
QDRANT_API_KEY=$(gen_hex)
JWT_SECRET=$(gen_hex)
JWT_REFRESH_SECRET=$(gen_hex)
SETTINGS_ENCRYPTION_KEY=$(openssl rand -base64 32)
DIFY_SECRET_KEY=$(gen_hex)
DIFY_INIT_PASSWORD=$(gen_b64)
SEED_ADMIN_PASSWORD=$(gen_b64)
EOF
  chmod 600 "$SECRETS"
fi
# shellcheck disable=SC1090
source "$SECRETS"

# shellcheck disable=SC1090
source "$RD_ENV"
S3_ENDPOINT=${S3_ENDPOINT_URL}
S3_BUCKET=${S3_BUCKET:-dkp-portal-prod}

LM_MODEL=text-embedding-nomic-embed-text-v1.5
LM_DIM=768

cat >"$STACK/api.env" <<EOF
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://${DOMAIN}

DATABASE_URL=postgresql://dkp:${POSTGRES_PASSWORD}@postgres:5432/document_portal?schema=public

JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

S3_ENDPOINT=${S3_ENDPOINT}
S3_REGION=${S3_REGION}
S3_BUCKET=${S3_BUCKET}
S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID}
S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY}
S3_FORCE_PATH_STYLE=true
S3_PRESIGNED_URL_TTL_SECONDS=900
MAX_FILE_SIZE_BYTES=524288000

DIFY_ENABLED=true
DIFY_BASE_URL=http://host.docker.internal:8090
DIFY_API_PREFIX=/v1
DIFY_KNOWLEDGE_API_KEY=
DIFY_APP_API_KEY=
DIFY_TIMEOUT_MS=120000
DIFY_AUTO_CREATE_DATASETS=true
DIFY_DATASET_STRATEGY=project_section
DIFY_DEFAULT_INDEXING_TECHNIQUE=high_quality
DIFY_DEFAULT_DOC_FORM=text_model
DIFY_DEFAULT_DOC_LANGUAGE=Russian
DIFY_CHUNK_MAX_TOKENS=700
DIFY_CHUNK_OVERLAP=80
DIFY_RETRIEVE_TOP_K=12
DIFY_RETRIEVE_SCORE_THRESHOLD=0.2

LM_STUDIO_BASE_URL=http://host.docker.internal:1234/v1
LM_STUDIO_EMBEDDING_MODEL=${LM_MODEL}
LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION=${LM_DIM}
LM_STUDIO_TIMEOUT_MS=60000

QDRANT_URL=http://host.docker.internal:6333
QDRANT_API_KEY=${QDRANT_API_KEY}
QDRANT_HEALTHCHECK_ENABLED=true

PG_BOSS_SCHEMA=pgboss
PROCESSING_WORKER_ENABLED=true
PROCESSING_POLL_INTERVAL_MS=4000
PROCESSING_MAX_ATTEMPTS=5

EXTERNAL_RATE_LIMIT_PER_MIN=120
SETTINGS_ENCRYPTION_KEY=${SETTINGS_ENCRYPTION_KEY}

SEED_ADMIN_EMAIL=admin@${DOMAIN}
SEED_ADMIN_PASSWORD=${SEED_ADMIN_PASSWORD}
SEED_ADMIN_FULL_NAME=Portal Administrator
EOF
chmod 600 "$STACK/api.env"

echo "[1/5] Starting Postgres + Qdrant"
cd "$STACK"
export POSTGRES_PASSWORD QDRANT_API_KEY
docker compose -f docker-compose.prod.yml up -d postgres qdrant
sleep 8
docker compose -f docker-compose.prod.yml ps postgres qdrant

echo "[2/5] Installing Dify"
DIFY_ROOT=/opt/dify
if [[ ! -d "$DIFY_ROOT/docker" ]]; then
  git clone --depth 1 https://github.com/langgenius/dify.git "$DIFY_ROOT"
fi
cd "$DIFY_ROOT/docker"
[[ -f .env ]] || cp .env.example .env

set_kv() {
  local key="$1" val="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >>.env
  fi
}

set_kv SECRET_KEY "$DIFY_SECRET_KEY"
set_kv VECTOR_STORE qdrant
set_kv QDRANT_URL http://host.docker.internal:6333
set_kv QDRANT_API_KEY "$QDRANT_API_KEY"
set_kv QDRANT_GRPC_ENABLED true
set_kv EXPOSE_NGINX_PORT 8090
set_kv NGINX_PORT 8090
set_kv INIT_PASSWORD "$DIFY_INIT_PASSWORD"
set_kv CONSOLE_API_URL http://127.0.0.1:8090
set_kv CONSOLE_WEB_URL http://127.0.0.1:8090
set_kv SERVICE_API_URL http://127.0.0.1:8090
set_kv APP_API_URL http://127.0.0.1:8090
set_kv APP_WEB_URL http://127.0.0.1:8090

cp -f /opt/difyrag/infra/dify/docker-compose.override.example.yml docker-compose.override.yaml
docker compose up -d
sleep 15
docker compose ps

echo "[3/5] Configuring Caddy for ${DOMAIN}"
if ! grep -q "${DOMAIN}" "$CADDY_FILE"; then
  cp "$CADDY_FILE" "${CADDY_FILE}.bak.$(date +%Y%m%d%H%M%S)"
  cat >>"$CADDY_FILE" <<EOF

${DOMAIN} {
	encode gzip
	reverse_proxy host.docker.internal:8080
}
EOF
  docker compose -f /opt/rd-web/app/deploy/single-host/docker-compose.yml exec -T caddy caddy reload --config /etc/caddy/Caddyfile || \
    docker compose -f /opt/rd-web/app/deploy/single-host/docker-compose.yml restart caddy
fi

echo "[4/5] Building DKP api + web (this may take several minutes)"
cd "$STACK"
docker compose -f docker-compose.prod.yml up -d --build api web

echo "[5/5] Waiting for health"
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1; then
    echo "API healthy"
    break
  fi
  sleep 5
done
curl -s http://127.0.0.1:3000/api/v1/health || true
curl -s -o /dev/null -w 'web:%{http_code}\n' http://127.0.0.1:8080/ || true

cat <<SUMMARY

=== DKP deployed ===
URL: https://${DOMAIN}
Admin: admin@${DOMAIN}
Password: ${SEED_ADMIN_PASSWORD}
Dify: http://127.0.0.1:8090 (init: ${DIFY_INIT_PASSWORD})
Secrets: ${SECRETS}

Configure Dify LM Studio provider, create Knowledge API key, then:
  sed -i 's|^DIFY_KNOWLEDGE_API_KEY=.*|DIFY_KNOWLEDGE_API_KEY=<key>|' ${STACK}/api.env
  cd ${STACK} && docker compose -f docker-compose.prod.yml restart api
SUMMARY
