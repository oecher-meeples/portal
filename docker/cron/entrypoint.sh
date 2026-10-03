#!/bin/sh
# Cron jobs don't inherit the container environment, so the secret is
# written once at start into a file only the curl user can read; the job
# script passes it to curl via `-H @file` (keeps it out of the crontab and
# out of the process list).
set -eu

if [ -z "${CRON_SECRET:-}" ]; then
  echo "[cron] CRON_SECRET is not set — refusing to start" >&2
  exit 1
fi

mkdir -p /run/cron
printf 'Authorization: Bearer %s\n' "$CRON_SECRET" > /run/cron/auth-header
printf '%s\n' "$APP_URL" > /run/cron/app-url
chown nobody:nobody /run/cron/auth-header
chmod 0400 /run/cron/auth-header

echo "[cron] starting crond (TZ=$TZ, target $APP_URL)"
# -f: foreground (PID 1), -d 8: log to stderr (→ docker compose logs)
exec crond -f -d 8
