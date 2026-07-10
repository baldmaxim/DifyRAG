#!/usr/bin/env bash
set -euo pipefail
cd /opt/dify/docker
source /opt/difyrag/infra/platform/.deploy-secrets.env
export QDRANT_API_KEY

sed -i 's|^NGINX_PORT=.*|NGINX_PORT=80|' .env
sed -i 's|^EXPOSE_NGINX_PORT=.*|EXPOSE_NGINX_PORT=8090|' .env
sed -i 's|^EXPOSE_NGINX_SSL_PORT=.*|EXPOSE_NGINX_SSL_PORT=18443|' .env

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
YAML

docker compose up -d nginx --force-recreate
sleep 5
docker port docker-nginx-1
curl -s -o /dev/null -w 'dify:%{http_code}\n' http://127.0.0.1:8090/
