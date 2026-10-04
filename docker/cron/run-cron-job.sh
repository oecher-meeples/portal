#!/bin/sh
# Usage: run-cron-job <route>   → GET $APP_URL/api/cron/<route>
# Called by crond as root; output goes to PID 1's stdout so it shows up in
# `docker compose logs cron-sidecar`. curl itself runs as `nobody`.
route="$1"
url="$(cat /run/cron/app-url)/api/cron/$route"

{
  echo "[cron] $(date -u '+%Y-%m-%dT%H:%M:%SZ') GET $url"
  su-exec nobody:nobody curl -fsS --max-time 900 \
    -H @/run/cron/auth-header \
    -w '\n[cron] HTTP %{http_code}\n' \
    "$url"
  echo "[cron] $route exit=$?"
} >> /proc/1/fd/1 2>&1
