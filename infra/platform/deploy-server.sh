#!/usr/bin/env bash
# Deploy Document Knowledge Portal on a shared GPU host (safe alongside existing projects).
set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/difyrag}"
DIFY_ROOT="${DIFY_ROOT:-/opt/dify}"
DOMAIN="${APP_DOMAIN:-02.vibe.cloud-ip.cc}"
CADDY_FILE="${CADDY_FILE:-/opt/rd-web/app/deploy/single-host/Caddyfile}"
STACK_DIR="${DEPLOY_ROOT}/infra/platform"
SECRETS_FILE="${STACK_DIR}/.deploy-secrets.env"

log() { printf '[deploy] %s\n' "$*"; }
die() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing command: $1"
}

gen_secret() {
  openssl rand -hex 32
}

ensure_secrets() {
  if [[ -f "${SECRETS_FILE}" ]]; then
    # shellcheck disable=SC1090
    source "${SECRETS_FILE}"
    return
  fi

  POSTGRES_PASSWORD="$(gen_secret)"
  QDRANT_API_KEY="$(gen_secret)"
  JWT_SECRET="$(gen_secret)"
  JWT_REFRESH_SECRET="$(gen_secret)"
  SETTINGS_ENCRYPTION_KEY="$(openssl rand -base64 32)"
  DIFY_SECRET_KEY="$(gen_secret)"
  DIFY_INIT_PASSWORD="$(openssl rand -base64 18)"
  SEED_ADMIN_PASSWORD="$(openssl rand -base64 16)"

  cat >"${SECRETS_FILE}" <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
QDRANT_API_KEY=${QDRANT_API_KEY}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
SETTINGS_ENCRYPTION_KEY=${SETTINGS_ENCRYPTION_KEY}
DIFY_SECRET_KEY=${DIFY_SECRET_KEY}
DIFY_INIT_PASSWORD=${DIFY_INIT_PASSWORD}
SEED_ADMIN_PASSWORD=${SEED_ADMIN_PASSWORD}
EOF
  chmod 600 "${SECRETS_FILE}"
  # shellcheck disable=SC1090
  source "${SECRETS_FILE}"
}

clone_repo() {
  require_cmd git
  if [[ -d "${DEPLOY_ROOT}/.git" ]]; then
    log "Updating ${DEPLOY_ROOT}"
    git -C "${DEPLOY_ROOT}" pull --ff-only
  else
    log "Cloning repository to ${DEPLOY_ROOT}"
    mkdir -p "$(dirname "${DEPLOY_ROOT}")"
    git clone https://github.com/baldmaxim/DifyRAG.git "${DEPLOY_ROOT}"
  fi
}

write_api_env() {
  local s3_endpoint="${S3_ENDPOINT:-https://s3.cloud.ru}"
  local s3_region="${S3_REGION:-ru-central-1}"
  local s3_bucket="${S3_BUCKET:-}"
  local s3_access_key="${S3_ACCESS_KEY_ID:-}"
  local s3_secret_key="${S3_SECRET_ACCESS_KEY:-}"
  local dify_key="${DIFY_KNOWLEDGE_API_KEY:-}"
  local lm_model="${LM_STUDIO_EMBEDDING_MODEL:-text-embedding-nomic-embed-text-v1.5}"
  local lm_dim="${LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION:-768}"

  [[ -n "${s3_bucket}" ]] || die "Set S3_BUCKET (and S3 keys) before deploy"
  [[ -n "${s3_access_key}" ]] || die "Set S3_ACCESS_KEY_ID before deploy"
  [[ -n "${s3_secret_key}" ]] || die "Set S3_SECRET_ACCESS_KEY before deploy"

  cat >"${STACK_DIR}/api.env" <<EOF
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://${DOMAIN}

DATABASE_URL=postgresql://dkp:${POSTGRES_PASSWORD}@postgres:5432/document_portal?schema=public

JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

S3_ENDPOINT=${s3_endpoint}
S3_REGION=${s3_region}
S3_BUCKET=${s3_bucket}
S3_ACCESS_KEY_ID=${s3_access_key}
S3_SECRET_ACCESS_KEY=${s3_secret_key}
S3_FORCE_PATH_STYLE=true
S3_PRESIGNED_URL_TTL_SECONDS=900
MAX_FILE_SIZE_BYTES=524288000

DIFY_ENABLED=true
DIFY_BASE_URL=http://host.docker.internal:8090
DIFY_API_PREFIX=/v1
DIFY_KNOWLEDGE_API_KEY=${dify_key}
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
LM_STUDIO_EMBEDDING_MODEL=${lm_model}
LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION=${lm_dim}
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
  chmod 600 "${STACK_DIR}/api.env"
}

start_qdrant_postgres() {
  log "Starting Postgres + Qdrant"
  cd "${STACK_DIR}"
  export POSTGRES_PASSWORD QDRANT_API_KEY
  docker compose -f docker-compose.prod.yml up -d postgres qdrant
  docker compose -f docker-compose.prod.yml ps postgres qdrant
}

install_dify() {
  require_cmd docker
  if [[ ! -d "${DIFY_ROOT}/docker" ]]; then
    log "Cloning Dify to ${DIFY_ROOT}"
    git clone --depth 1 https://github.com/langgenius/dify.git "${DIFY_ROOT}"
  fi

  cd "${DIFY_ROOT}/docker"
  if [[ ! -f .env ]]; then
    cp .env.example .env
  fi

  # Safe local-only bindings; do not touch host :80/:443 (used by rd-web Caddy).
  sed -i \
    -e "s|^SECRET_KEY=.*|SECRET_KEY=${DIFY_SECRET_KEY}|" \
    -e 's|^VECTOR_STORE=.*|VECTOR_STORE=qdrant|' \
    -e 's|^QDRANT_URL=.*|QDRANT_URL=http://host.docker.internal:6333|' \
    -e "s|^QDRANT_API_KEY=.*|QDRANT_API_KEY=${QDRANT_API_KEY}|" \
    -e 's|^QDRANT_GRPC_ENABLED=.*|QDRANT_GRPC_ENABLED=true|' \
    -e 's|^EXPOSE_NGINX_PORT=.*|EXPOSE_NGINX_PORT=8090|' \
    -e 's|^NGINX_PORT=.*|NGINX_PORT=8090|' \
    -e "s|^INIT_PASSWORD=.*|INIT_PASSWORD=${DIFY_INIT_PASSWORD}|" \
    .env || true

  # Ensure keys exist even if sed patterns missed.
  grep -q '^SECRET_KEY=' .env || echo "SECRET_KEY=${DIFY_SECRET_KEY}" >>.env
  grep -q '^VECTOR_STORE=' .env || echo 'VECTOR_STORE=qdrant' >>.env
  grep -q '^QDRANT_URL=' .env || echo 'QDRANT_URL=http://host.docker.internal:6333' >>.env
  grep -q '^QDRANT_API_KEY=' .env || echo "QDRANT_API_KEY=${QDRANT_API_KEY}" >>.env
  grep -q '^EXPOSE_NGINX_PORT=' .env || echo 'EXPOSE_NGINX_PORT=8090' >>.env

  cp -f "${DEPLOY_ROOT}/infra/dify/docker-compose.override.example.yml" docker-compose.override.yaml

  log "Starting Dify (local port 8090)"
  docker compose up -d
}

configure_caddy() {
  [[ -f "${CADDY_FILE}" ]] || die "Caddyfile not found: ${CADDY_FILE}"
  if grep -q "${DOMAIN}" "${CADDY_FILE}"; then
    log "Caddy already configured for ${DOMAIN}"
    return
  fi

  cp "${CADDY_FILE}" "${CADDY_FILE}.bak.$(date +%Y%m%d%H%M%S)"
  cat >>"${CADDY_FILE}" <<EOF

${DOMAIN} {
	encode gzip
	reverse_proxy host.docker.internal:8080
}
EOF

  log "Reloading Caddy"
  docker compose -f /opt/rd-web/app/deploy/single-host/docker-compose.yml exec -T caddy caddy reload --config /etc/caddy/Caddyfile || \
    docker compose -f /opt/rd-web/app/deploy/single-host/docker-compose.yml restart caddy
}

start_app() {
  log "Building and starting DKP api + web"
  cd "${STACK_DIR}"
  export POSTGRES_PASSWORD QDRANT_API_KEY
  docker compose -f docker-compose.prod.yml up -d --build api web
}

print_summary() {
  cat <<EOF

=== Deployment summary ===
Portal URL:     https://${DOMAIN}
Admin email:    admin@${DOMAIN}
Admin password: ${SEED_ADMIN_PASSWORD}
Dify console:   http://127.0.0.1:8090 (init password: ${DIFY_INIT_PASSWORD})
Secrets file:   ${SECRETS_FILE}
API env:        ${STACK_DIR}/api.env

Next manual step (once): create Dify Knowledge API key and set DIFY_KNOWLEDGE_API_KEY in api.env, then:
  cd ${STACK_DIR} && docker compose -f docker-compose.prod.yml restart api
EOF
}

main() {
  require_cmd docker
  require_cmd openssl
  clone_repo
  ensure_secrets
  write_api_env
  start_qdrant_postgres
  install_dify
  configure_caddy
  start_app
  print_summary
}

main "$@"
