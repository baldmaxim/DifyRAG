#!/usr/bin/env bash
set -euo pipefail
STACK=/opt/difyrag/infra/platform
source "$STACK/.deploy-secrets.env"
source /opt/rd-web/app/deploy/single-host/.env

sed -i "s|postgresql://dkp:[^@]*@|postgresql://dkp:${POSTGRES_PASSWORD}@|" "$STACK/api.env"

cd "$STACK"
docker compose -f docker-compose.prod.yml down api web postgres
docker volume rm -f platform_dkp_postgres_data
docker compose -f docker-compose.prod.yml up -d --build api web
sleep 35
docker ps --format '{{.Names}} {{.Status}}' | grep dkp
curl -s http://127.0.0.1:3000/api/v1/health || true
curl -s -o /dev/null -w 'web:%{http_code}\n' http://127.0.0.1:8080/ || true
