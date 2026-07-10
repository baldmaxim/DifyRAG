#!/usr/bin/env bash
set -euo pipefail

DIFY=/opt/dify/docker
STACK=/opt/difyrag/infra/platform

# Fix Dify nginx port conflict with host Caddy (443) — bind HTTP only on localhost:8090.
cd "$DIFY"
sed -i 's|^EXPOSE_NGINX_SSL_PORT=.*|EXPOSE_NGINX_SSL_PORT=18443|' .env
grep -q '^EXPOSE_NGINX_SSL_PORT=' .env || echo 'EXPOSE_NGINX_SSL_PORT=18443' >>.env

cat >docker-compose.override.yaml <<'YAML'
services:
  api:
    extra_hosts:
      - 'host.docker.internal:host-gateway'
    environment:
      VECTOR_STORE: qdrant
      QDRANT_URL: http://host.docker.internal:6333
      QDRANT_API_KEY: ${QDRANT_API_KEY}
      QDRANT_GRPC_ENABLED: 'true'
      QDRANT_GRPC_PORT: '6334'

  worker:
    extra_hosts:
      - 'host.docker.internal:host-gateway'
    environment:
      VECTOR_STORE: qdrant
      QDRANT_URL: http://host.docker.internal:6333
      QDRANT_API_KEY: ${QDRANT_API_KEY}

  nginx:
    ports: !reset
      - '127.0.0.1:8090:8090'
YAML

# shellcheck disable=SC1090
source "$STACK/.deploy-secrets.env"
export QDRANT_API_KEY
docker compose up -d nginx
sleep 5
docker compose ps nginx api worker

echo "Dify nginx on http://127.0.0.1:8090"

# Caddy for portal domain
DOMAIN=02.vibe.cloud-ip.cc
CADDY_FILE=/opt/rd-web/app/deploy/single-host/Caddyfile
if ! grep -q "$DOMAIN" "$CADDY_FILE"; then
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

echo "Building DKP..."
cd "$STACK"
export POSTGRES_PASSWORD
docker compose -f docker-compose.prod.yml up -d --build api web

for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1; then
    echo "API healthy"
    break
  fi
  sleep 5
done

curl -s http://127.0.0.1:3000/api/v1/health || true
curl -s -o /dev/null -w 'web local: %{http_code}\n' http://127.0.0.1:8080/ || true
