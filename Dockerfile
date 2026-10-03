# syntax=docker/dockerfile:1
#
# App-Image fürs Self-Hosting (siehe docs/deployment-docker.md).
# Stages: deps (pnpm install) → build (next build + Seed-Bundle) →
# prisma-cli (Migrate-Werkzeug) → runner (minimales Laufzeit-Image).
#
# Node 22 statt 20: pnpm 11 (`packageManager` in package.json) verlangt
# Node >= 22.13, und die CI (.github/workflows/ci.yml) prüft gegen Node 22.

FROM node:22-slim AS base
# openssl: Prismas Schema-Engine (natives Binary, nur für `prisma migrate`)
# erkennt darüber die libssl-Version; ohne ist es nicht lauffähig.
# Die Query-Engine gibt es seit Prisma 7 nicht mehr (wasm + @prisma/adapter-pg).
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---------------------------------------------------------------------------
FROM base AS deps
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    HUSKY=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# corepack liest die pnpm-Version aus `packageManager` in package.json.
RUN corepack enable && corepack install
# postinstall ruft `prisma generate` — braucht Schema + Config.
COPY prisma.config.ts ./
COPY prisma/schema.prisma prisma/schema.prisma
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store \
 && pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
FROM deps AS build
COPY . .
# src/lib/auth/server.ts instanziiert better-auth auf Modulebene (requireEnv),
# und `next build` lädt die Module beim Page-Data-Sammeln. Platzhalter nur für
# diesen RUN — sie landen weder im Runner-Image noch im Bundle (kein
# NEXT_PUBLIC_*); zur Laufzeit gelten die echten Werte aus der Container-Env.
RUN pnpm exec prisma generate \
 && BETTER_AUTH_URL=http://localhost:3000 \
    BETTER_AUTH_SECRET=build-time-placeholder-never-used-at-runtime \
    pnpm run build
# Seed als eine in sich geschlossene CJS-Datei bündeln (inkl. @prisma/client,
# generiertem Client und better-auth) — so braucht der Runner weder tsx noch
# src/ noch die vollen node_modules, um den Seed auszuführen.
RUN node docker/app/bundle-seed.mjs prisma/seed.ts /app/db-tools/seed.cjs
# Fail fast, falls das standalone-Tracing den generierten Prisma-Client
# (default-Output `.prisma/client` neben @prisma/client im pnpm-Store) nicht
# mitkopiert hat — sonst fällt das erst zur Laufzeit beim ersten Query auf.
RUN cd .next/standalone \
 && node -e "const p=require.resolve('@prisma/client');require.resolve('.prisma/client/default',{paths:[require('fs').realpathSync(p)]});console.log('prisma client traced:',p)"

# ---------------------------------------------------------------------------
# Prisma-CLI nur für `migrate deploy` beim Container-Start. Eigenes
# Mini-Projekt statt der vollen Dev-node_modules; Version exakt aus
# package.json (prisma ist dort fest gepinnt).
FROM base AS prisma-cli
WORKDIR /opt/prisma-cli
COPY package.json /tmp/package.json
RUN PRISMA_VERSION="$(node -p "require('/tmp/package.json').devDependencies.prisma")" \
 && echo '{"private":true}' > package.json \
 && npm install --omit=dev --no-audit --no-fund --no-package-lock "prisma@${PRISMA_VERSION}" \
 && npm cache clean --force

# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Next.js-standalone: server.js + getracte node_modules. static/ und public/
# kopiert Next bewusst nicht mit.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

# Migrate + Seed: /app/db ist ein eigenes Mini-Projekt, damit
# `prisma.config.ts` sein `import "prisma/config"` aus /app/db/node_modules
# auflöst und nicht mit den standalone-node_modules kollidiert.
COPY --from=prisma-cli /opt/prisma-cli/node_modules ./db/node_modules
COPY --from=build /app/prisma.config.ts ./db/prisma.config.ts
COPY --from=build /app/prisma/schema.prisma ./db/prisma/schema.prisma
COPY --from=build /app/prisma/migrations ./db/prisma/migrations
COPY --from=build /app/db-tools/seed.cjs ./db/seed.cjs
COPY docker/app/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod 0755 /usr/local/bin/entrypoint

# `node` (uid/gid 1000) bringt das offizielle Node-Image schon mit.
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/entrypoint"]
