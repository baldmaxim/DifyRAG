#!/usr/bin/env bash
set -euo pipefail

# LM Studio listens on 127.0.0.1 only; Docker containers reach the host via 172.17.0.1.
# Bridge with socat on the docker gateway without exposing LM Studio on 0.0.0.0.
# Dify's LM Studio provider then uses http://172.17.0.1:1235/v1.
if ! command -v socat >/dev/null; then
  apt-get update && apt-get install -y socat
fi

pkill -f 'socat TCP-LISTEN:1235,bind=172.17.0.1' 2>/dev/null || true
nohup socat TCP-LISTEN:1235,bind=172.17.0.1,reuseaddr,fork TCP:127.0.0.1:1234 >/var/log/lmstudio-bridge.log 2>&1 &

sleep 1
curl -s http://172.17.0.1:1235/v1/models | head -c 150
echo
