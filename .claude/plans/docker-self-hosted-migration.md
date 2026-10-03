# Docker Self-Hosting Migration Plan

Branch: `feature/docker-self-hosted-migration` (von `develop`)

## Ziel

Ein Docker-Setup, das 1:1 an einen Dritten übergeben werden kann, um es komplett
selbst zu hosten — **ohne jede Vercel- oder Neon-Plattformbindung**. Jede
aktuell genutzte Managed-/SaaS-Komponente bekommt eine self-hosted Alternative
oder wird durch ein provider-agnostisches Protokoll ersetzt.

## Bestandsaufnahme (geprüft)

- **Neon Auth** (`src/lib/auth/server.ts`): `createNeonAuth({ baseUrl })`, HTTP-Call
  gegen Neon-gehosteten Auth-Endpunkt. Darunterliegend bereits `better-auth`
  ("Managed Better Auth" laut `.env.example`-Kommentar).
- **Datenbank**: `@prisma/adapter-neon` + `@neondatabase/serverless` — Neon-
  spezifisches HTTP/WebSocket-Tunneling, kein Standard-TCP-Postgres.
- **Cron-Routen** (`instagram-queue`, `market-digest`, `year-turn`): bereits
  bearer-token-geschützt (`src/lib/utils/cron-auth.ts`, `CRON_SECRET`). Nur der
  Scheduler (`vercel.json` → Vercel Cron) ist Vercel-spezifisch, nicht der Code.
- **`@vercel/blob`**: zentral in `src/lib/admin/blob-storage.ts` +
  `src/lib/utils/use-blob-upload.ts`, von dort in ~10 Feature-Dateien verwendet.
- **`@vercel/analytics`**: eine Zeile in `src/app/layout.tsx`, sendet an einen
  Vercel-Plattform-Endpunkt, kein alternatives Backend konfigurierbar.
- **Brevo** (`src/lib/newsletter/mailer.ts`): dünner REST-API-Wrapper
  (`fetch` gegen `api.brevo.com`), ein Empfänger pro Call — leicht austauschbar.
- **`@vercel/og`**: reine Satori-Lib, kein Hosting-Lock-in.
- **Google-SSO**: im Code vorgesehen (`src/lib/auth/login-log.ts` erwähnt es),
  aber **nie aktiv eingesetzt** — keine Google-OAuth-Credentials im Repo.
- Keine Edge-Runtime-Routes (`runtime = "edge"`) im Code — kein
  Docker-Kompatibilitätsproblem in der Hinsicht.

## Entscheidungen (gegrillt, final)

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Blob-Storage | `@vercel/blob` → **MinIO** (S3-kompatibel), Umbau auf `@aws-sdk/client-s3` | volle Unabhängigkeit, zentrale Call-Site macht Umbau überschaubar |
| Datenbank | Neon → **self-hosted `postgres:16`**-Container, Standard-Prisma-Client ohne Adapter | minimiert Abhängigkeiten, Prisma spricht nativ TCP-Postgres |
| Auth | Neon Auth → **self-hosted `better-auth`** (in-app, kein eigener Service) | Library ist bereits Projekt-Dependency, kleinster Umbau |
| Google-SSO | **entfällt ersatzlos** | war nie aktiv im Einsatz |
| Analytics | `@vercel/analytics` → **eigenes In-App-Tracking** (Prisma-Model `PageView`, Beacon-Route, Admin-Dashboard hinter bestehender RBAC) | kein zusätzlicher Service/Login, nutzt bestehende Schicht-Architektur, für Vereins-Traffic ausreichend |
| E-Mail | Brevo-API → **generischer SMTP-Mailer** (z. B. `nodemailer`), **kein** mitgelieferter Mailserver-Container; ohne `SMTP_*`-Credentials bleibt Versand deaktiviert (no-op, kein Crash) | Code wird provider-agnostisch; Zustellbarkeits-Risiko eines self-hosted Mailservers (IP-Reputation, Port-25-Sperren) bleibt bewusst Betreiber-Entscheidung, nicht Teil des Defaults |
| Cron | **`alpine`+`cron`+`curl`-Sidecar** im Compose, ruft bestehende Routen per Bearer-Token nach `vercel.json`-Zeitplänen | kein Docker-Socket-Zugriff nötig (geringere Angriffsfläche) im Gegensatz zu `ofelia` |
| TLS/Reverse-Proxy | **Caddy** als optionaler Compose-Service (Profile `with-proxy`) | automatisches Let's-Encrypt-Zertifikat, minimal-config; wer schon einen Proxy hat, startet ohne das Profil |
| Migrationen | **Entrypoint-Script** im App-Container führt `prisma migrate deploy` bei jedem Start automatisch aus | Single-Container-Deployment, Doppel-Migrations-Risiko praktisch null |
| Seed | **Admin-Account automatisch** bei leerer DB; **Demo-Daten** über neue Env-Var `SEED_DEMO_DATA=true/false` | Abnehmer hat sofort funktionierenden Login, Demo-Daten nur optional |
| Externe APIs (Meta/Instagram, YouTube, BGG) | **unverändert**, eigene Keys/Redirect-URIs durch Abnehmer | reine Content-APIs, keine Hosting-Plattform-Kopplung |

## Phase 1 — Next.js Standalone Build

- `next.config.ts`: `output: "standalone"`.
- `/api/health`-Endpoint für Docker-/Orchestrator-Healthchecks ergänzen (gibt's noch nicht).

## Phase 2 — Datenbank-Umbau (Neon → Postgres)

- `prisma.config.ts` + jede Stelle, die `@prisma/adapter-neon` instanziiert,
  auf Standard-`PrismaClient` ohne Adapter umstellen.
- `@neondatabase/serverless`, `@prisma/adapter-neon` aus `package.json` entfernen.
- `postgres:16`-Service in `docker-compose.yml` mit persistentem Volume.
- Migrationspfad für bestehende Neon-Daten dokumentieren (`pg_dump`/`pg_restore`
  für den einmaligen Umzug, kein Dauerbetrieb-Thema).

## Phase 3 — Auth-Umbau (Neon Auth → self-hosted better-auth)

- `src/lib/auth/server.ts`: `createNeonAuth(...)` → `betterAuth({...})` gegen
  den neuen self-hosted Postgres.
- `src/lib/auth/client.ts`, `src/proxy.ts` (Session-Refresh-Logik) entsprechend anpassen.
- `NEON_AUTH_BASE_URL`/`NEON_AUTH_COOKIE_SECRET` raus, better-auth-eigene Secrets rein.
- Google-SSO-Codepfade (falls vorhanden) entfernen, `login-log.ts`-Kommentar anpassen.

## Phase 4 — Blob-Storage-Umbau (Vercel Blob → MinIO)

- `lib/admin/blob-storage.ts` + `use-blob-upload.ts` auf `@aws-sdk/client-s3` umstellen.
- `minio`-Service in `docker-compose.yml` (Bucket-Init als Entrypoint-Schritt).
- Bestehende Tests (`blob-storage.test.ts` u. a.) auf den neuen Client anpassen.

## Phase 5 — Analytics (In-App)

- Neues Prisma-Model `PageView` (Pfad, Timestamp, Referrer, grob geparstes
  Browser/Device — **keine IP/PII**).
- Beacon-Route (`/api/analytics/collect`), Client-Snippet via `navigator.sendBeacon`
  statt `<Analytics />` in `src/app/layout.tsx`.
- Aggregations-Queries + Admin-Dashboard (`src/lib/analytics/`,
  `src/components/feature/admin-analytics/`), hinter bestehender Admin-Permission-Prüfung.

## Phase 6 — E-Mail-Umbau (Brevo → SMTP)

- `src/lib/newsletter/mailer.ts`: Brevo-REST-Call → `nodemailer`-SMTP-Client
  (`SMTP_HOST`/`PORT`/`USER`/`PASS`-Env-Vars).
- Fehlen die `SMTP_*`-Vars, degradiert der Versand kontrolliert zu No-op
  (kein Crash, klare Log-Meldung) statt einen Mailserver vorauszusetzen.
- Kein Mailserver-Container im Compose-Default — Doku empfiehlt bei Bedarf
  `docker-mailserver`, mit Warnhinweis zu IP-Reputation/Port-25-Sperren.

## Phase 7 — Cron-Alternative

- Eigenes kleines `Dockerfile` für den `alpine`+`cron`-Sidecar.
- Crontab mit den drei Zeitplänen aus `vercel.json`, `curl` mit
  `Authorization: Bearer $CRON_SECRET` gegen den App-Container.

## Phase 8 — Dockerfile (Multi-Stage, App-Image)

- `deps` → `build` → `runner`, Base `node:20-slim` (passend zu
  `.devcontainer/devcontainer.json`).
- `corepack enable` (pnpm-Version aus `packageManager` in `package.json`),
  `prisma generate` vor `next build`.
- Runner kopiert nur `.next/standalone` + `.next/static` + `public/`.
- Entrypoint-Script: `prisma migrate deploy` → Admin-Seed (falls DB leer) →
  optional Demo-Seed (`SEED_DEMO_DATA=true`) → `node server.js`.

## Phase 9 — docker-compose.yml für den Abnehmer

Services: `app`, `postgres`, `minio`, `cron-sidecar`, optional `caddy`
(Profile `with-proxy`). Eigene `.env.example` fürs Self-Hosting-Szenario
(reduzierter/geänderter Variablensatz ggü. der Vercel-`.env.example`).

## Phase 10 — Doku für den Abnehmer

`docs/deployment-docker.md`: Image bauen, Env setzen (inkl. welche Werte
Pflicht vs. optional sind), Compose starten, TLS-Profil aktivieren,
SMTP optional konfigurieren, Backup-Hinweis für den Postgres-Container,
Google-Cloud/Meta/YouTube/BGG-Credentials-Beschaffung verlinken.
