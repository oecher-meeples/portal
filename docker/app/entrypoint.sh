#!/bin/sh
# App-Container-Start (siehe Dockerfile, docs/deployment-docker.md):
#   1. prisma migrate deploy   — bei jedem Start, idempotent
#   2. Seed, nur bei leerer DB — Admin-Account (+ Rechte/Rollen, Rechtliches)
#      immer, danach je nach SEED_PROFILE der echte Vereinsbestand
#      (release, Default) oder Demo-Daten (develop)
#   3. exec node server.js     — Next.js-standalone-Server als PID 1
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] DATABASE_URL is not set — refusing to start" >&2
  exit 1
fi

echo "[entrypoint] prisma migrate deploy"
cd /app/db
node node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] seed (only if database is empty, SEED_PROFILE=${SEED_PROFILE:-release})"
SEED_ONLY_IF_EMPTY=true SEED_PROFILE="${SEED_PROFILE:-release}" node seed.cjs

cd /app
echo "[entrypoint] starting Next.js on ${HOSTNAME}:${PORT}"
exec node server.js
