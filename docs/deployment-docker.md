# Deployment mit Docker (Self-Hosting)

Diese Anleitung richtet sich an Betreiber, die das Portal komplett selbst
hosten — ohne Vercel, Neon oder andere Plattformbindung. Alle Bausteine laufen
als Container aus [`docker-compose.yml`](../docker-compose.yml); externe Dienste
(Mail-Provider, Instagram, BGG, YouTube) sind optional und werden mit eigenen
Zugangsdaten angebunden.

Maßgeblich sind immer die Dateien im Repo — bei Abweichungen gilt der Code:
`docker-compose.yml`, [`docker/.env.example`](../docker/.env.example),
`Dockerfile`, `docker/app/entrypoint.sh`, `docker/cron/`, `docker/caddy/Caddyfile`.

## Inhalt

1. [Überblick](#1-überblick)
2. [Voraussetzungen](#2-voraussetzungen)
3. [Kurzfassung](#3-kurzfassung)
4. [Image bauen](#4-image-bauen)
5. [Konfiguration (`.env`)](#5-konfiguration-env)
6. [Stack starten](#6-stack-starten)
7. [Erster Start: Migration und Seed](#7-erster-start-migration-und-seed)
8. [Reverse Proxy und TLS](#8-reverse-proxy-und-tls)
9. [Die Dienste im Detail](#9-die-dienste-im-detail)
10. [Externe Zugangsdaten beschaffen](#10-externe-zugangsdaten-beschaffen)
11. [Backup und Wiederherstellung](#11-backup-und-wiederherstellung)
12. [Updates einspielen](#12-updates-einspielen)
13. [Umzug von Vercel/Neon](#13-umzug-von-vercelneon)
14. [Fehlerbehebung](#14-fehlerbehebung)

## 1. Überblick

| Service        | Image / Build                | Aufgabe                                                                                             | Host-Port (nur `127.0.0.1`)        |
| -------------- | ---------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `app`          | `Dockerfile` (Repo-Wurzel)   | Next.js-Server; führt bei jedem Start Migrationen und ggf. den Seed aus                             | `3000` (`APP_PORT`)                |
| `postgres`     | `postgres:16`                | Datenbank, Volume `postgres-data`                                                                   | `5432` (`POSTGRES_PORT`)           |
| `minio`        | `minio/minio:latest`         | S3-kompatibler Datei-Speicher (Uploads, erzeugte Bilder), Volume `minio-data`                       | `9000` API, `9001` Konsole         |
| `minio-init`   | `minio/mc:latest`            | One-Shot: legt Bucket und App-Zugang an, beendet sich danach                                        | —                                  |
| `cron-sidecar` | `docker/cron/Dockerfile`     | Ruft die geplanten Hintergrund-Jobs der App auf                                                     | —                                  |
| `caddy`        | `caddy:2`                    | **Optional** (Profil `with-proxy`): TLS-Reverse-Proxy mit Let's-Encrypt-Zertifikaten                | `80`, `443` (öffentlich)           |

Alles außer `caddy` ist nur an `127.0.0.1` gebunden. Ins Internet zeigt
ausschließlich ein Reverse Proxy — entweder der mitgelieferte Caddy oder ein
bereits vorhandener (nginx, Traefik, …). Er braucht **zwei** Hostnamen: einen
für das Portal und einen für den Datei-Speicher (siehe
[Abschnitt 8](#8-reverse-proxy-und-tls)).

## 2. Voraussetzungen

- **Docker Engine ≥ 23** (BuildKit ist dort Standard; das `Dockerfile` nutzt
  `RUN --mount=type=cache`).
- **Docker Compose v2** — also `docker compose` (Plugin), nicht das alte
  Python-`docker-compose` v1. Genutzt werden Profile und
  `depends_on`-Bedingungen (`service_healthy`, `service_completed_successfully`).
- Ein Checkout dieses Repos auf dem Server (gebaut wird lokal, es gibt kein
  vorgefertigtes Image).
- Für den Produktivbetrieb: **zwei DNS-Namen** (z. B. `portal.example.org` und
  `files.portal.example.org`), die auf den Server zeigen, und — mit dem
  Caddy-Profil — offene Ports **80 und 443**.
- `openssl` (oder ein anderer Zufallsgenerator) zum Erzeugen der Secrets.
- Optional: ein SMTP-Zugang für den Mailversand ([9.3](#93-e-mail-smtp)).

Der `next build` im Image braucht spürbar Arbeitsspeicher. Scheitert der Build
auf einem kleinen VPS, das Image auf einem stärkeren Rechner bauen (siehe
[4](#4-image-bauen)).

## 3. Kurzfassung

```bash
git clone <repo-url> oecher-meeples-portal && cd oecher-meeples-portal
cp docker/.env.example .env
# .env ausfüllen: alle mit REQUIRED markierten Werte + SEED_ADMIN_* (Abschnitt 5)

# a) Es gibt schon einen Reverse Proxy auf dem Host:
docker compose up -d --build
# b) Kein Proxy vorhanden — Caddy holt TLS-Zertifikate selbst:
docker compose --profile with-proxy up -d --build

docker compose ps            # app sollte nach ≤ 60 s "healthy" sein
docker compose logs -f app   # Migration, Seed, Serverstart verfolgen
```

Danach mit `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` unter `BETTER_AUTH_URL`
anmelden.

## 4. Image bauen

```bash
docker compose build              # baut app (Dockerfile) und cron-sidecar (docker/cron/)
```

`docker compose up -d --build` baut implizit mit; ein separater Build lohnt
sich nur, um Build-Fehler getrennt vom Start zu sehen. Die übrigen Images
(`postgres`, `minio`, `minio/mc`, `caddy`) werden beim ersten `up` gezogen.

Das App-Image ist ein Multi-Stage-Build (`node:22-slim`):

| Stage        | Inhalt                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `deps`       | `pnpm install --frozen-lockfile` (pnpm-Version per corepack aus `packageManager` in `package.json`)                  |
| `build`      | `prisma generate`, `next build` (Standalone-Output), Seed als eine gebündelte Datei `seed.cjs`                       |
| `prisma-cli` | nur die Prisma-CLI in exakt der Version aus `package.json`, für `migrate deploy`                                     |
| `runner`     | Laufzeit-Image: `server.js` + getracte `node_modules`, `.next/static`, `public/`, Migrationen, Seed, Entrypoint      |

Das Laufzeit-Image enthält weder Quellcode noch Dev-Dependencies, läuft als
unprivilegierter User `node` und bringt einen `HEALTHCHECK` gegen
`/api/health` mit. Secrets landen nicht im Image: `.env*` ist per
`.dockerignore` aus dem Build-Kontext ausgeschlossen, und die beim Build
nötigen Auth-Werte sind Platzhalter, die zur Laufzeit durch die echten aus der
Container-Umgebung ersetzt werden.

**Build auf einem anderen Rechner:** `docker build -t meeples-app .` baut
dasselbe App-Image ohne Compose. Um es auf dem Server zu nutzen, per Registry
oder `docker save | ssh … docker load` übertragen und in einer
`docker-compose.override.yml` beim Service `app` `image: meeples-app`
eintragen (dann `docker compose up -d` ohne `--build`).

## 5. Konfiguration (`.env`)

```bash
cp docker/.env.example .env      # in der Repo-Wurzel, neben docker-compose.yml
```

Docker Compose liest `.env` im Projektverzeichnis automatisch. `.env` nie
committen (ist per `.gitignore` ausgeschlossen). Die Datei
`docker/.env.example` ist kommentiert und listet jede Variable mit dem
passenden `openssl`-Befehl; die Wurzel-`.env.example` ist dagegen für die
lokale Entwicklung (`pnpm dev` auf dem Host) gedacht und **nicht** für den
Container-Betrieb.

### Pflicht-Variablen

In `docker-compose.yml` mit `${VAR:?…}` markiert. Fehlt eine davon (oder ist
sie leer), verweigert **`docker compose` selbst jeden Befehl** — auch
`docker compose up -d postgres` oder `docker compose config` — mit
`required variable VAR is missing a value: VAR must be set`. Es startet also
gar kein Container, nicht nur die App nicht.

| Variable                     | Inhalt                                                                                                         | Erzeugen / Beispiel                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `BETTER_AUTH_URL`            | Öffentliche Basis-URL des Portals, ohne `/` am Ende, ohne `/api/auth`                                          | `https://portal.example.org`        |
| `PUBLIC_SITE_URL`            | Basis-URL für Links in Mails, Instagram-Captions, Kalender-Abos — normalerweise identisch mit `BETTER_AUTH_URL` | `https://portal.example.org`        |
| `S3_PUBLIC_ENDPOINT`         | Öffentlicher Origin des Datei-Speichers (Bilder, Browser-Uploads). **Später nicht mehr ändern**, siehe 9.2     | `https://files.portal.example.org`  |
| `BETTER_AUTH_SECRET`         | Signiert Sessions, Reset-Tokens, Instagram-OAuth-State. Wechsel meldet alle ab                                 | `openssl rand -base64 32`           |
| `MEMBER_DATA_ENCRYPTION_KEY` | AES-256-GCM-Schlüssel für gespeicherte IBANs ([ADR 0003](adr/0003-bankdaten-verschluesselt-mit-protokolliertem-leseweg.md)). **Außerhalb des Servers sichern**, siehe 11   | `openssl rand -base64 32`           |
| `CRON_SECRET`                | Bearer-Token zwischen `cron-sidecar` und `/api/cron/*`                                                         | `openssl rand -hex 32`              |
| `POSTGRES_PASSWORD`          | Passwort des DB-Users; landet in der `DATABASE_URL`, daher URL-sicher halten                                   | `openssl rand -hex 24`              |
| `MINIO_ROOT_PASSWORD`        | Root-Passwort von MinIO (Konsole, `minio-init`) — die App nutzt es nicht                                       | `openssl rand -hex 20`              |
| `S3_ACCESS_KEY`              | Name des App-Zugangs zu MinIO; `minio-init` legt ihn an                                                        | `meeples-app`                       |
| `S3_SECRET_KEY`              | Secret dazu                                                                                                    | `openssl rand -hex 20`              |

### Bedingt Pflicht

Nicht per `:?` erzwungen (sonst ginge `docker compose` ohne sie gar nicht),
aber in der jeweiligen Situation nötig:

| Variable                                  | Wann                                     | Was passiert ohne                                                                                                                      |
| ----------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Erster Start auf **leerer** Datenbank    | Der App-Container bricht nach der Migration ab ([7](#7-erster-start-migration-und-seed)). Danach werden sie ignoriert                    |
| `APP_DOMAIN`, `S3_DOMAIN`                 | Nur mit `--profile with-proxy`           | Caddy kann keine Site konfigurieren und startet nicht. Reine Hostnamen ohne `https://`, passend zu `BETTER_AUTH_URL`/`S3_PUBLIC_ENDPOINT` |
| `SEED_DEMO_PASSWORD`                      | Nur mit `SEED_DEMO_DATA=true`            | Die Demo-Konten bekommen ein leeres Passwort und sind nicht nutzbar. Mindestens 8 Zeichen                                              |

### Optional (mit funktionierendem Default)

| Variable                                          | Default                                            | Zweck                                                                                     |
| ------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `ENVIRONMENT`                                     | `production`                                       | Andere Werte werden im Header-Logo-Tooltip angezeigt                                       |
| `POSTGRES_USER`, `POSTGRES_DB`                    | `meeples`                                          | DB-User und -Name                                                                         |
| `DATABASE_URL`                                    | aus `POSTGRES_*` gebaut, Host `postgres:5432`      | Nur setzen, um statt des Containers eine **externe** Postgres-Instanz zu nutzen           |
| `BETTER_AUTH_TRUSTED_ORIGINS`                     | leer                                               | Weitere Origins (kommagetrennt), die `/api/auth` aufrufen dürfen                          |
| `SEED_DEMO_DATA`                                  | `false`                                            | `true` = Demo-Daten beim ersten Start ([7](#7-erster-start-migration-und-seed))            |
| `MINIO_ROOT_USER`                                 | `minio-admin`                                      | Root-Login der MinIO-Konsole                                                              |
| `S3_BUCKET`                                       | `meeples`                                          | Bucket-Name                                                                               |
| `S3_ENDPOINT`                                     | `http://minio:9000`                                | Endpoint, über den die **App** MinIO im Compose-Netz erreicht                             |
| `S3_REGION`                                       | `us-east-1`                                        | Nur für das AWS-SDK, MinIO ignoriert sie                                                  |
| `S3_STORAGE_LIMIT_BYTES`                          | 1 GB                                               | Soft-Quota der Füllstandskarte im Admin-Dashboard                                         |
| `MINIO_CORS_ALLOW_ORIGIN`                         | `*`                                                | CORS für Browser-Uploads; produktiv auf `BETTER_AUTH_URL` setzen (so in `docker/.env.example`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | leer bzw. Port `587`                 | Mailversand, ohne `SMTP_HOST` deaktiviert ([9.3](#93-e-mail-smtp))                        |
| `PUBLIC_CALENDAR_ICS_URL`, `ICS_FEED_URL_INTERNAL` | leer                                              | Öffentlicher bzw. interner Kalender-Feed (ICS-URL, kein API-Key)                          |
| `META_*`, `BGG_BEARER_TOKEN`, `YOUTUBE_API_KEY`, `GITHUB_TOKEN`, `TRANSLATION_CONTACT_EMAIL` | leer (`META_GRAPH_API_VERSION`: `v21.0`) | Externe Dienste, je Feature optional ([10](#10-externe-zugangsdaten-beschaffen)) |
| `APP_PORT`, `POSTGRES_PORT`, `MINIO_API_PORT`, `MINIO_CONSOLE_PORT` | `3000`, `5432`, `9000`, `9001`  | Host-Ports (immer nur auf `127.0.0.1`)                                                    |
| `CRON_APP_URL`                                    | `http://app:3000`                                  | Ziel des Cron-Sidecars, nur bei umbenanntem App-Service                                   |

Fehlt ein optionaler Schlüssel eines externen Dienstes, startet die App
trotzdem; nur die betroffene Funktion meldet beim Benutzen einen Fehler.

### Probelauf ohne Domain

Zum Ausprobieren auf dem eigenen Rechner geht es auch ohne Proxy und TLS:
`BETTER_AUTH_URL` und `PUBLIC_SITE_URL` auf `http://localhost:3000`,
`S3_PUBLIC_ENDPOINT` auf `http://localhost:9000`, `MINIO_CORS_ALLOW_ORIGIN`
auf `http://localhost:3000`, dann `docker compose up -d --build`.
Einschränkung: Die Textextraktion von hochgeladenen Rechtliches-PDFs lädt die
Datei über `S3_PUBLIC_ENDPOINT` — aus dem App-Container heraus zeigt
`localhost` aber auf den Container selbst, das schlägt in diesem Modus fehl.
Für eine echte Instanz nicht übernehmen (gespeicherte Datei-URLs enthalten
`S3_PUBLIC_ENDPOINT` dauerhaft).

## 6. Stack starten

**Variante A — es gibt schon einen Reverse Proxy** (nginx, Traefik, Apache, ein
Proxy des Hosters …):

```bash
docker compose up -d --build
```

Startet `postgres`, `minio`, `minio-init`, `app` und `cron-sidecar`. Der
vorhandene Proxy wird auf `127.0.0.1:3000` (Portal) und `127.0.0.1:9000`
(Datei-Speicher) gerichtet, siehe [8.2](#82-variante-a-vorhandener-reverse-proxy).

**Variante B — kein Proxy vorhanden**, Caddy soll TLS übernehmen:

```bash
docker compose --profile with-proxy up -d --build
```

Startet zusätzlich `caddy` auf den Ports 80/443. `--profile` ist eine Option
von `docker compose` selbst und steht daher **vor** `up`. Wer das Profil nicht
bei jedem Befehl angeben will, setzt `COMPOSE_PROFILES=with-proxy` in `.env`.
Voraussetzungen siehe [8.1](#81-variante-b-mitgelieferter-caddy-profil-with-proxy).

Startreihenfolge (automatisch über `depends_on`):

1. `postgres` und `minio` starten; ihre Healthchecks (`pg_isready`,
   `mc ready`) melden Bereitschaft.
2. `minio-init` läuft einmal durch und beendet sich mit Exit-Code 0
   (in `docker compose ps -a` als `exited (0)` — das ist korrekt).
3. Erst dann startet `app`. Ein „DB noch nicht bereit"-Fehler beim ersten
   Start ist dadurch ausgeschlossen.
4. `cron-sidecar` startet nach `app`; mit Profil wartet `caddy`, bis `app`
   **healthy** ist (bis zu ca. 60 s nach dem Start).

Alle Dienste haben `restart: unless-stopped` und laufen nach einem
Server-Neustart von selbst wieder an.

```bash
docker compose ps                # Status + Health
docker compose logs -f app       # Logs eines Dienstes
docker compose down              # stoppen; Daten in den Volumes bleiben
```

> `docker compose down -v` löscht zusätzlich **alle Volumes** — Datenbank,
> Dateien und Caddy-Zertifikate. Nur für einen bewussten Neuanfang.

## 7. Erster Start: Migration und Seed

Der Entrypoint des App-Containers (`docker/app/entrypoint.sh`) führt bei
**jedem** Start nacheinander aus:

1. **`prisma migrate deploy`** — spielt alle noch fehlenden Migrationen ein.
   Idempotent; nach einem Update kommen neue Migrationen so automatisch.
   Schlägt sie fehl, beendet sich der Container (und wird neu gestartet).
2. **Seed, nur bei leerer Datenbank.** Maßgeblich ist, ob es schon einen
   Login (Tabelle der Auth-User) gibt:
   - **Es gibt schon User** → Seed wird übersprungen
     (`Seed übersprungen: Datenbank enthält bereits Auth-User.`). Ein Neustart
     überschreibt also weder Daten noch das Admin-Passwort.
   - **Leere DB, `SEED_ADMIN_EMAIL` oder `SEED_ADMIN_PASSWORD` fehlt** →
     Abbruch mit
     `Leere Datenbank: SEED_ADMIN_EMAIL und SEED_ADMIN_PASSWORD müssen für den ersten Start gesetzt sein.`
     Der Container startet nicht. Es gibt bewusst kein Default-Passwort.
   - **Leere DB, beide gesetzt** → Grundbestand: Admin-Konto mit der Rolle
     `sysadmin`, alle Rechte und Rollen, Spieleigenschafts-Texte sowie die
     Rechtliches-Seiten und Downloads.
   - Zusätzlich mit **`SEED_DEMO_DATA=true`**: Demo-Spiele, -Mitglieder,
     -Beiträge, Demo-Konten (Passwort `SEED_DEMO_PASSWORD`) usw. Nur für
     Test-/Vorführinstanzen, nie für eine echte Vereinsdatenbank. Achtung:
     Der Seed prüft auf den exakten Wert `false` — **jeder andere Wert**
     (auch `0`, `no`, `FALSE`) aktiviert die Demo-Daten. Nur `true` oder
     `false` eintragen.
3. **`node server.js`** — der Next.js-Server übernimmt als Hauptprozess.

Ablauf im Log (`docker compose logs app`):

```text
[entrypoint] prisma migrate deploy
… N migrations found … / No pending migrations to apply.
[entrypoint] seed (only if database is empty, SEED_DEMO_DATA=false)
…
[entrypoint] starting Next.js on 0.0.0.0:3000
```

Nach dem ersten Login das Admin-Passwort im Portal ändern und
`SEED_ADMIN_PASSWORD` aus `.env` entfernen — es wird ab jetzt ohnehin
ignoriert, und eine Änderung dort ändert **nicht** das bestehende Passwort.
Demo-Daten lassen sich nicht nachträglich auf eine schon genutzte Datenbank
seeden; dafür braucht es eine leere DB.

## 8. Reverse Proxy und TLS

Das Portal braucht zwei öffentliche Hostnamen:

- **Portal** (`BETTER_AUTH_URL`/`PUBLIC_SITE_URL`) → App auf Port 3000.
- **Datei-Speicher** (`S3_PUBLIC_ENDPOINT`) → MinIO auf Port 9000. Bilder
  werden direkt von dort geladen, Uploads gehen direkt vom Browser dorthin.
  Eigener Hostname, weil die Datei-URLs pfadbasiert sind
  (`https://<host>/<bucket>/<key>`) und nicht mit App-Routen kollidieren
  dürfen.

Die App setzt einen HSTS-Header (`includeSubDomains`). Produktiv also von
Anfang an unter HTTPS betreiben.

### 8.1 Variante B: mitgelieferter Caddy (Profil `with-proxy`)

`docker/caddy/Caddyfile` leitet `APP_DOMAIN` an `app:3000` und `S3_DOMAIN` an
`minio:9000` weiter und holt/erneuert Let's-Encrypt-Zertifikate selbst.

Vor dem Start:

1. **DNS:** A-/AAAA-Records für `APP_DOMAIN` und `S3_DOMAIN` zeigen auf den
   Server — **bevor** Caddy startet, sonst scheitert die ACME-Challenge (und
   wiederholte Fehlversuche laufen in die Let's-Encrypt-Rate-Limits).
2. **Ports 80 und 443** (TCP, 443 zusätzlich UDP für HTTP/3) sind von außen
   erreichbar und nicht von einem anderen Webserver auf dem Host belegt.
3. In `.env` passen die Werte zusammen:

   ```bash
   APP_DOMAIN="portal.example.org"
   S3_DOMAIN="files.portal.example.org"
   BETTER_AUTH_URL="https://portal.example.org"
   PUBLIC_SITE_URL="https://portal.example.org"
   S3_PUBLIC_ENDPOINT="https://files.portal.example.org"
   MINIO_CORS_ALLOW_ORIGIN="https://portal.example.org"
   ```

4. `docker compose --profile with-proxy up -d --build`, dann
   `docker compose logs -f caddy` — dort erscheint die Zertifikatsausstellung.

Zertifikate und ACME-Konto liegen im Volume `caddy-data`. Geht es verloren,
stellt Caddy neu aus (Rate-Limits beachten).

### 8.2 Variante A: vorhandener Reverse Proxy

Ohne Profil startet kein Caddy. Der eigene Proxy auf demselben Host zeigt auf:

| Hostname                                 | Ziel             |
| ---------------------------------------- | ---------------- |
| Portal (`BETTER_AUTH_URL`)               | `127.0.0.1:3000` |
| Datei-Speicher (`S3_PUBLIC_ENDPOINT`)    | `127.0.0.1:9000` |

Worauf es ankommt:

- `Host` bzw. `X-Forwarded-Host` und `X-Forwarded-Proto`/`-For` an die App
  durchreichen — sonst zählt u. a. das Seitenaufruf-Tracking eigene Navigation
  als externe Herkunft ([9.5](#95-analytics-in-app-kein-eigener-service)).
- Request-Body-Limit am Datei-Host auf **mindestens 25 MB** anheben; die
  größten Uploads (PDFs, Anhänge) dürfen 20 MB haben. nginx erlaubt
  standardmäßig nur 1 MB.
- TLS terminiert der eigene Proxy; App und MinIO sprechen intern nur HTTP.

Beispiel nginx (Zertifikats-Direktiven weggelassen):

```nginx
server {
    server_name portal.example.org;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
server {
    server_name files.portal.example.org;
    client_max_body_size 25m;
    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
    }
}
```

Läuft der Proxy auf **einem anderen Rechner**, reicht die
`127.0.0.1`-Bindung nicht. Dann in einer `docker-compose.override.yml`
zusätzliche Port-Bindungen auf eine interne IP ergänzen (z. B.
`"10.0.0.5:3000:3000"` bei `app`, `"10.0.0.5:9000:9000"` bei `minio`) und
per Firewall auf den Proxy beschränken.

Der Proxy-Host muss außerdem selbst `S3_PUBLIC_ENDPOINT` erreichen können:
Die App lädt Rechtliches-PDFs zur Textextraktion über diese öffentliche URL,
und Instagram holt Beitragsbilder darüber ab. Löst der Hostname auf dem
Server zur eigenen öffentlichen IP auf und unterstützt das Netz kein
Hairpin-NAT, schlägt das fehl (siehe [14](#14-fehlerbehebung)).

## 9. Die Dienste im Detail

### 9.1 Datenbank (`postgres`)

`postgres:16`, Daten im Volume `postgres-data` — überleben
`docker compose down`, nur `down -v` löscht sie. Die App bekommt
automatisch

```text
DATABASE_URL=postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>
```

(Hostname `postgres` = Service-Name im Compose-Netz). Für Werkzeuge auf dem
Host (`psql`, `pg_dump`, `pg_restore`, `prisma migrate status`) ist der Port an
`127.0.0.1:5432` gebunden:

```bash
psql "postgresql://meeples:<POSTGRES_PASSWORD>@localhost:5432/meeples"
# oder ohne lokale Postgres-Tools:
docker compose exec postgres psql -U meeples -d meeples
```

`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` wirken nur beim **allerersten**
Start auf ein leeres Volume. Ein später geändertes `POSTGRES_PASSWORD` ändert
nicht das Passwort in der Datenbank, sondern nur das, was die App versucht
(siehe [14](#14-fehlerbehebung)).

Eine externe Postgres-Instanz (≥ 16) ist möglich: `DATABASE_URL` setzen
(ggf. mit `?sslmode=require`). Der `postgres`-Container läuft dann trotzdem
mit (`POSTGRES_PASSWORD` bleibt Pflicht), wird aber nicht benutzt.

### 9.2 Datei-Speicher (`minio`, `minio-init`)

Uploads (Bilder, PDFs, Downloads, Anhänge) und serverseitig erzeugte Bilder
liegen in einem S3-kompatiblen **MinIO**-Container, Volume `minio-data`. Die
App spricht ihn über `@aws-sdk/client-s3` an (`src/lib/utils/s3.ts`,
pfadbasierte Adressierung) — intern über `S3_ENDPOINT`, Browser über
`S3_PUBLIC_ENDPOINT`.

**Bucket-Init:** `minio-init` läuft bei jedem `docker compose up` idempotent
nach dem MinIO-Healthcheck und

1. legt den Bucket `S3_BUCKET` an (falls nicht vorhanden),
2. setzt ihn auf anonymes Lesen (`mc anonymous set download`) — Datei-URLs
   sind öffentlich abrufbar, der Bucket aber nicht auflistbar,
3. legt den App-Zugang `S3_ACCESS_KEY`/`S3_SECRET_KEY` mit `readwrite`-Policy
   an, damit die App nicht mit den Root-Credentials läuft.

Bewusst kein automatisches Bucket-Anlegen im App-Code: Bucket-Policy und
User-Anlage brauchen Admin-Rechte, die die App nicht haben soll.

**Upload-Ablauf:** Der Browser lädt direkt in den Bucket hoch, nicht über den
App-Server. Die zugehörige Server-Action prüft die Berechtigung und stellt
einen **Presigned POST** aus (`src/lib/utils/blob-upload-token.ts`), dessen
Policy Maximalgröße und Content-Type festlegt — MinIO selbst lehnt zu große
oder falsch typisierte Dateien ab. Deshalb muss `MINIO_CORS_ALLOW_ORIGIN` den
Portal-Origin erlauben.

**`S3_PUBLIC_ENDPOINT` nicht nachträglich ändern:** Gespeicherte Datei-URLs
enthalten ihn. Ein Wechsel lässt alle bisherigen Bilder/Dateien ins Leere
zeigen (Reparatur nur per SQL-`replace()` auf den URL-Spalten). Die
Content-Security-Policy erlaubt den Origin automatisch.

**MinIO-Konsole:** `http://127.0.0.1:9001` auf dem Server, Login
`MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`. Von außen per SSH-Tunnel:
`ssh -L 9001:127.0.0.1:9001 <server>`.

> **Image-Pinning:** MinIO veröffentlicht seit Ende 2025 keine neuen
> Community-Images mehr (nur noch Quellcode). `docker-compose.yml` nutzt
> `minio/minio:latest` und `minio/mc:latest` — vor dem Produktivbetrieb einen
> getesteten Tag pinnen oder eine Alternative (z. B. Garage, SeaweedFS)
> prüfen; die App braucht nur die S3-API.

### 9.3 E-Mail (SMTP)

Alle Mails — Newsletter, Double-Opt-in, „Passwort vergessen"-Codes,
Reset-Links, Mitglieder-Benachrichtigungen, Jahreswechsel-Cron,
Flohmarkt-Verkäufer — laufen über `sendTransactionalEmail`
(`src/lib/newsletter/mailer.ts`), einen provider-neutralen SMTP-Client auf
Basis von `nodemailer`. **Der Stack bringt bewusst keinen Mailserver mit.**

| Variable    | Zweck                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `SMTP_HOST` | SMTP-Server. **Leer = Versand deaktiviert** (siehe unten)                                                        |
| `SMTP_PORT` | Default `587` (STARTTLS); `465` schaltet auf implizites TLS                                                      |
| `SMTP_USER` | Leer = ohne Authentifizierung (z. B. interner Relay)                                                             |
| `SMTP_PASS` | Passwort/App-Token zu `SMTP_USER`                                                                                |
| `SMTP_FROM` | Absender; leer = `"Oecher Meeples" <newsletter@oecher-meeples.org>`. Muss vom Provider als Absender erlaubt sein — **eigenen Wert setzen** |

**Ohne `SMTP_HOST`** ist der Versand ein kontrollierter No-op: Die App startet
und läuft normal, beim ersten Mailversuch erscheint einmalig
`[mailer] SMTP_HOST ist nicht gesetzt — E-Mail-Versand ist deaktiviert, Mails werden verworfen.`
im Log, danach pro verworfener Mail
`[mailer] Nicht versendet (SMTP aus): "<Betreff>"` (ohne Empfänger). Die Aufrufer behandeln die Mail dabei als verschickt —
Newsletter-Jobs landen z. B. auf `SENT`, und „Passwort vergessen" sowie
Einladungen von Systemkonten funktionieren nicht. Für den Produktivbetrieb
SMTP also konfigurieren.

**Empfehlung:** einen bestehenden Mail-Provider bzw. dessen SMTP-Relay nutzen
(Hoster-Postfach der Vereinsdomain, Brevo/Mailjet/Postmark/Amazon SES per
SMTP-Zugang …) und SPF/DKIM für die Absender-Domain einrichten.

> **Eigener Mailserver (z. B. [`docker-mailserver`](https://github.com/docker-mailserver/docker-mailserver)):**
> möglich, aber bewusst nicht Teil des Defaults. Mails von einem selbst
> betriebenen Server landen schnell im Spam oder werden abgelehnt, wenn die
> **IP-Reputation** des Servers schlecht ist (typisch bei VPS-/Heim-IPs,
> fehlendem Reverse-DNS/PTR, fehlendem SPF/DKIM/DMARC). Viele Hoster und
> Heimanschlüsse **sperren ausgehenden Port 25**, ohne den ein eigener Server
> gar nicht an fremde Mailserver zustellen kann. Wer das trotzdem will,
> betreibt den Mailserver separat und trägt ihn hier nur als `SMTP_HOST` ein.

Für Entwickler mit Repo-Checkout: `pnpm run test:live` verschickt eine
Testmail an `SMTP_LIVE_TEST_TO` (liest `.env.local`, nicht `.env`). Lokal
eignet sich ein Mail-Catcher wie Mailpit
(`docker run -p 1025:1025 -p 8025:8025 axllent/mailpit`, `SMTP_HOST=localhost`,
`SMTP_PORT=1025`, Weboberfläche auf `http://localhost:8025`).

### 9.4 Geplante Jobs (`cron-sidecar`)

Ein kleiner `alpine`-Container (`docker/cron/`) mit busybox-`crond` und `curl`
ruft die per Bearer-Token geschützten Cron-Routen der App auf
(`GET` mit `Authorization: Bearer $CRON_SECRET`). Kein Docker-Socket-Zugriff
nötig.

| Route                       | Zeitplan (UTC) | Aufgabe                                                                                                              |
| --------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `/api/cron/instagram-queue` | `0 5 * * *`    | Täglicher Sammel-Job: Instagram-Queue + Token-Refresh, **Newsletter-Versand**, Aufräumen alter Login-/Bankdaten-Zugriffsprotokolle, Erklärer-Anwesenheit zurücksetzen |
| `/api/cron/market-digest`   | `0 17 * * *`   | Flohmarkt-Digest-Mail                                                                                                |
| `/api/cron/year-turn`       | `0 2 2 1 *`    | Jahreswechsel der Mitgliedschaften (2. Januar)                                                                       |

Trotz des Namens läuft `instagram-queue` also auch ohne Instagram-Anbindung
und ist für den Newsletter nötig. Der Newsletter-Versand ist dabei auf
**300 Mails pro Tag** begrenzt (fest im Code, ein Erbe des früheren
Brevo-Gratis-Kontingents); größere Verteiler verteilen sich auf mehrere Tage.

`CRON_SECRET` ist **dieselbe** Variable, die auch die App liest — ein Secret,
nicht zwei. `CRON_APP_URL` (Default `http://app:3000`) muss nur bei
umbenanntem App-Service angepasst werden.

Cron-Jobs erben die Container-Umgebung nicht. Der Entrypoint schreibt deshalb
beim Start den fertigen Header nach `/run/cron/auth-header` (nur für `nobody`
lesbar); `run-cron-job` übergibt ihn per `curl -H @datei` — das Secret steht
so weder in der Crontab noch in der Prozessliste. `crond` läuft als root (muss
es), `curl` selbst als `nobody`. Fehlt `CRON_SECRET`, startet der Container
nicht.

**Zeitpläne ändern:** in `docker/cron/crontab`, danach
`docker compose up -d --build cron-sidecar`. Läuft parallel noch ein
Vercel-Deployment, gleichzeitig `vercel.json` anpassen ([13.3](#133-vercel-cron-und-verceljson)).

Prüfen, ob die Jobs laufen: [14](#cron-jobs-laufen-nicht-oder-schlagen-fehl).

### 9.5 Analytics (In-App, kein eigener Service)

Statt Vercel Web Analytics zählt die App Seitenaufrufe selbst — kein
zusätzlicher Container, keine Env-Vars; die Daten liegen in der Tabelle
`page_views` der bestehenden Datenbank.

- Der Browser meldet jeden Seitenaufruf per `navigator.sendBeacon` an
  `POST /api/analytics/collect` (`components/layout/page-view-beacon.tsx`).
- Gespeichert werden nur Pfad (ohne Query-String), Host einer externen
  Herkunftsseite sowie eine grobe Browser-/Geräteklasse (z. B. „Chrome" /
  „Mobil"). **Keine IP-Adresse, kein roher User-Agent, keine Cookies**, keine
  Besucher-Kennung. Bots sowie Besucher mit „Do Not Track"/GPC werden nicht
  gezählt.
- Auswertung unter **`/admin/analytics`** (Navigation „Seitenaufrufe"), nur
  mit der Berechtigung `admin:access`.
- Hinter einem eigenen Reverse Proxy `Host`/`X-Forwarded-Host` durchreichen
  ([8.2](#82-variante-a-vorhandener-reverse-proxy)).
- Keine automatische Löschfrist (die Zeilen sind nicht personenbezogen).
  Ausdünnen per SQL, z. B.
  `DELETE FROM page_views WHERE "createdAt" < now() - interval '1 year';`.

### 9.6 Healthcheck

`GET /api/health` antwortet mit `{"status":"ok"}`, sobald der Next.js-Server
läuft. Er prüft **nicht** Datenbank oder MinIO — er ist ein
Lebenszeichen-Check, den Docker und Caddy nutzen (`interval 30s`,
`start_period 60s`). Externe Monitoring-Dienste können dieselbe URL abfragen.

## 10. Externe Zugangsdaten beschaffen

Alle optional — ohne Schlüssel fällt nur die jeweilige Funktion aus. Die
Schlüssel sind auf den Betreiber ausgestellt; die des bisherigen Betriebs
werden nicht übergeben.

| Dienst                     | Variablen                                                | Wofür                                              | Wo beschaffen                                                                                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Cloud (YouTube)     | `YOUTUBE_API_KEY`                                        | Video-Suche zu Spielen                             | [Google Cloud Console → Anmeldedaten](https://console.cloud.google.com/apis/credentials): Projekt anlegen, „YouTube Data API v3" aktivieren, API-Key erstellen. Kostenloses Kontingent (100 Suchen/Tag), kein Abrechnungskonto nötig |
| Google Kalender            | `PUBLIC_CALENDAR_ICS_URL`, `ICS_FEED_URL_INTERNAL`       | Termin-Kalender                                    | Kein Schlüssel: in den Kalender-Einstellungen die öffentliche bzw. geheime iCal-Adresse kopieren                                                                                                                                    |
| Meta (Instagram)           | `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `META_GRAPH_API_VERSION` | Cross-Posting von Beiträgen        | [Meta Developer Portal](https://developers.facebook.com/apps) → App anlegen → App-Einstellungen → Basis. Schritt-für-Schritt (Business-Account, App-Review, OAuth-Verbindung): [instagram-setup.md](instagram-setup.md). API-Versionen: [Graph-API-Changelog](https://developers.facebook.com/docs/graph-api/changelog) |
| BoardGameGeek              | `BGG_BEARER_TOKEN`                                       | Spiele-Import per BGG-ID                           | Mit einem BGG-Konto die eigene Anwendung für die XML API2 registrieren und den Bearer-Token erzeugen (Pflicht bei BGG seit Juli 2025)                                                                                             |
| MyMemory                   | `TRANSLATION_CONTACT_EMAIL`                              | Übersetzung von BGG-Beschreibungen                 | Kein Schlüssel, keine Registrierung. Eine Kontakt-Mail hebt das Tageslimit von 5.000 auf 50.000 Zeichen ([API-Doku](https://mymemory.translated.net/doc/spec.php))                                                                   |
| GitHub                     | `GITHUB_TOKEN`                                           | Feedback-Button im Header                          | Fine-grained Personal Access Token mit „Issues: Read and write" — siehe Hinweis unten                                                                                                                                               |

Hinweise:

- **Google-SSO gibt es nicht mehr.** Die Anmeldung läuft ausschließlich über
  E-Mail/Passwort im Portal selbst (better-auth, [ADR 0015](adr/0015-self-hosted-better-auth-statt-neon-auth.md));
  es ist kein Google-OAuth-Client einzurichten.
- **Instagram:** `META_REDIRECT_URI` ist
  `<BETTER_AUTH_URL>/api/auth/instagram/callback` und muss exakt so in der
  Meta-App registriert sein. Instagram lädt die Beitragsbilder selbst von
  `S3_PUBLIC_ENDPOINT` — der Datei-Speicher muss also öffentlich aus dem
  Internet erreichbar sein. Den täglichen Versand übernimmt der
  `cron-sidecar` (die Erwähnung von Vercel Cron in `instagram-setup.md`
  entspricht dem früheren Hosting).
- **GitHub-Feedback:** Ziel-Repository (`oecher-meeples/portal`) und
  Feedback-Epic (#281) sind im Code fest verdrahtet
  (`src/lib/feedback/github-client.ts`). Der Token muss Schreibrechte auf
  Issues **dieses** Repositorys haben; ein Token für ein eigenes Repository
  reicht ohne Code-Anpassung nicht. Ohne Token den Wert leer lassen — der
  Button meldet dann beim Absenden einen Fehler.

## 11. Backup und Wiederherstellung

Drei Dinge sind zu sichern — fehlt eines, ist die Instanz nicht vollständig
wiederherstellbar:

1. **Datenbank** (Volume `postgres-data`),
2. **Dateien** im MinIO-Bucket (Volume `minio-data`) — alle hochgeladenen
   Bilder, PDFs, Anhänge; die Datenbank enthält nur deren URLs,
3. **`.env`**, vor allem `MEMBER_DATA_ENCRYPTION_KEY`: Ohne diesen Schlüssel
   sind alle gespeicherten IBANs auch aus einem intakten Datenbank-Backup
   nicht mehr lesbar (nur die letzten vier Ziffern liegen im Klartext).
   `.env` getrennt von den Daten-Backups und **außerhalb des Servers**
   aufbewahren.

Backups regelmäßig (z. B. per Host-Cron nachts) und auf einem anderen System
ablegen; eine Wiederherstellung einmal probeweise durchspielen.

### Datenbank

Konsistenter Dump im laufenden Betrieb, ohne lokale Postgres-Tools:

```bash
docker compose exec -T postgres \
  pg_dump -U meeples -d meeples --format=custom > meeples-$(date +%F).dump
```

(`-T` ist nötig, damit der Binär-Dump unverändert in die Datei geht.
Alternativ mit lokalem `pg_dump` ≥ 16 gegen `localhost:5432`.)

Wiederherstellen — in eine leere bzw. zu überschreibende Datenbank, App
vorher stoppen:

```bash
docker compose stop app cron-sidecar
docker compose exec -T postgres \
  pg_restore -U meeples -d meeples --clean --if-exists --no-owner < meeples-2026-10-01.dump
docker compose start app cron-sidecar
```

### Dateien (MinIO)

Den Bucket über den `minio/mc`-Container des Stacks in ein Host-Verzeichnis
spiegeln (`minio-init` hat bereits alle nötigen Variablen):

```bash
docker compose run --rm -v "$PWD/minio-backup:/backup" minio-init \
  'mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" && mc mirror --overwrite "local/$S3_BUCKET" /backup'
```

`mc mirror` überträgt bei Folgeläufen nur neue/geänderte Dateien. Das
Verzeichnis `minio-backup/` anschließend wie jedes andere Backup wegsichern.
Wiederherstellen in umgekehrter Richtung:
`… mc mirror --overwrite /backup "local/$S3_BUCKET"`.

Alternativ das Volume `minio-data` bei gestopptem `minio` als Ganzes
archivieren (Volume-Name mit Projekt-Präfix, siehe `docker volume ls`).

Das Volume `caddy-data` (Zertifikate) muss nicht gesichert werden; Caddy
stellt bei Verlust neu aus.

## 12. Updates einspielen

```bash
git pull
docker compose up -d --build            # ggf. mit --profile with-proxy
docker image prune -f                   # alte Image-Schichten aufräumen
```

Der neue App-Container spielt fehlende Migrationen beim Start automatisch ein
([7](#7-erster-start-migration-und-seed)). Vor einem Update ein
Datenbank-Backup ziehen ([11](#11-backup-und-wiederherstellung)) — Migrationen
lassen sich nicht automatisch zurückdrehen. Fremd-Images (`postgres`,
`minio`, `caddy`) aktualisiert `docker compose pull` gefolgt von
`docker compose up -d`; die Postgres-**Major**-Version (`postgres:16`) nur mit
Dump/Restore wechseln, nie durch bloßes Ändern des Tags.

## 13. Umzug von Vercel/Neon

Nur relevant für die **einmalige** Übernahme einer bestehenden
Vercel/Neon-Instanz. Eine Neuinstallation überspringt diesen Abschnitt.

**Reihenfolge ist wichtig:** Die Bestandsdaten müssen in die Datenbank,
**bevor** der App-Container zum ersten Mal startet. Sonst legt der erste Start
Schema und Admin-Konto auf der leeren DB an, und der Restore kollidiert damit.
Falls das schon passiert ist: `docker compose down`, Volume `postgres-data`
löschen (`docker volume rm <projekt>_postgres-data`), neu beginnen.

### 13.1 Datenbank (Neon → `postgres`)

Kein Sync-Mechanismus — danach ist der Container die einzige Datenquelle.
Schreibzugriffe auf die alte Instanz vorher stoppen, sonst gehen Änderungen
nach dem Dump verloren.

```bash
# 1. Dump aus Neon ziehen (direkter Endpoint, NICHT der "-pooler"-Host;
#    pg_dump-Major-Version >= Neon-Server-Version)
pg_dump "postgresql://<user>:<pw>@<neon-host>/<db>?sslmode=require" \
  --format=custom --no-owner --no-acl --file=neon.dump

# 2. Nur die Datenbank starten (.env muss bereits vollständig sein, siehe 5)
docker compose up -d postgres

# 3. Dump einspielen (Schema + Daten inkl. _prisma_migrations-Tabelle)
docker compose exec -T postgres \
  pg_restore -U meeples -d meeples --no-owner --no-acl < neon.dump

# 4. Gesamten Stack starten — fehlende Migrationen spielt der Entrypoint ein,
#    der Seed wird übersprungen, weil es schon Konten gibt
docker compose up -d --build
```

Hinweise:

- `--no-owner --no-acl` verhindert Fehler durch Neon-spezifische Rollen.
  Warnungen zu Neon-eigenen Schemas/Extensions beim Restore betreffen nicht
  die App-Tabellen.
- **Versionen:** Das Ziel ist `postgres:16`. Ein Dump aus einem neueren
  pg_dump (z. B. 17, weil das Neon-Projekt auf Postgres 17 läuft) lässt sich
  mit `pg_restore` 16 nicht einlesen. Neon-Version vorher prüfen
  (`SELECT version();`); läuft Neon auf 17, muss auch der Container auf
  `postgres:17` laufen.
- **Logins:** Das Schema `neon_auth` (Konten aus Neon Auth) wird mit
  eingespielt und ist wichtig: Die Migration `self_hosted_better_auth`
  übernimmt daraus einmalig alle Konten samt Passwort-Hash in die eigenen
  `auth_*`-Tabellen (gleiche User-IDs, siehe
  [ADR 0015](adr/0015-self-hosted-better-auth-statt-neon-auth.md)). Lief die
  Migration schon vorher gegen Neon, sind die Konten bereits im Dump. Danach
  kann `neon_auth` gelöscht werden.
- Bestehende Sessions werden nicht übernommen — alle melden sich einmal neu
  an. Konten, die nur per Google-SSO angemeldet waren (ohne Passwort), setzen
  über „Passwort vergessen" ein Passwort — dafür muss SMTP konfiguriert sein.
- Alte Vercel-Analytics-Daten werden nicht übernommen.

Optional prüfen (mit Repo-Checkout und pnpm auf dem Host):
`DATABASE_URL="postgresql://meeples:<pw>@localhost:5432/meeples" pnpm prisma migrate status`.

### 13.2 Dateien (Vercel Blob → MinIO)

Nicht automatisch migriert. Alte `*.public.blob.vercel-storage.com`-URLs in
der Datenbank funktionieren weiter, **solange der Vercel-Blob-Store
existiert**; `deleteBlobs()` überspringt sie (im eigenen Bucket gibt es nichts
zu löschen). Für einen vollständigen Umzug:

1. Dateien aus dem Vercel-Blob-Store herunterladen (Pfade beibehalten).
2. Mit `mc cp --recursive` (z. B. über den `minio-init`-Container wie in
   [11](#dateien-minio)) in den Bucket `S3_BUCKET` legen.
3. Die URL-Spalten per SQL-`replace()` von
   `https://<store>.public.blob.vercel-storage.com/` auf
   `<S3_PUBLIC_ENDPOINT>/<S3_BUCKET>/` umschreiben.

Erst danach den Vercel-Blob-Store löschen.

### 13.3 Vercel Cron und `vercel.json`

Die Zeitpläne in `docker/cron/crontab` spiegeln `vercel.json`. Solange die App
parallel noch auf Vercel läuft, beide synchron halten — und beachten, dass
dann **beide** Deployments die Jobs ausführen (z. B. doppelte
Instagram-Posts, wenn beide auf dieselbe Datenbank zeigen). `vercel.json`
bleibt bis zur Abschaltung des Vercel-Deployments im Repo.

## 14. Fehlerbehebung

### `docker compose` bricht sofort ab: `required variable … is missing a value`

Eine [Pflicht-Variable](#pflicht-variablen) fehlt in `.env` oder ist leer. Das
betrifft jeden Compose-Befehl, auch für einzelne Dienste. `.env` muss in
der Repo-Wurzel neben `docker-compose.yml` liegen (nicht in `docker/`).
`docker compose config` zeigt die aufgelöste Konfiguration.

### App-Container startet immer wieder neu

`docker compose logs app` zeigt, in welchem Schritt es scheitert:

- **`Leere Datenbank: SEED_ADMIN_EMAIL und SEED_ADMIN_PASSWORD müssen …`** —
  beide in `.env` setzen, `docker compose up -d`.
- **Fehler bei `prisma migrate deploy`** (z. B. `P1000 Authentication failed`)
  — meist wurde `POSTGRES_PASSWORD` nach dem ersten Start geändert. Das
  Passwort in der DB gilt weiter; entweder den alten Wert zurück in `.env`
  oder in der DB ändern
  (`docker compose exec postgres psql -U meeples -d meeples -c "ALTER USER meeples PASSWORD '<neu>';"`).
  Enthält das Passwort Zeichen wie `@`, `/`, `:`, zerbricht die
  `DATABASE_URL` — URL-sicher erzeugen (`openssl rand -hex 24`).
- **Ein „DB noch nicht bereit"-Fehler** sollte nicht vorkommen: `app` startet
  erst, wenn der `postgres`-Healthcheck (`pg_isready`) grün ist und
  `minio-init` erfolgreich war. Tritt er doch auf (z. B. externe
  `DATABASE_URL`), startet Docker den Container einfach neu.

### `app` wartet ewig / startet gar nicht

`minio-init` ist fehlgeschlagen, `app` hängt an
`service_completed_successfully`. `docker compose logs minio-init` prüfen —
häufig ein falsches `MINIO_ROOT_PASSWORD` gegenüber dem ersten Start oder ein
`S3_SECRET_KEY` unter 8 Zeichen (MinIO verlangt mindestens 8).

### `app` ist `unhealthy`, Caddy startet nicht

Caddy wartet auf `app: healthy`. In den ersten 60 s ist `health: starting`
normal (Migration + Seed). Bleibt es `unhealthy`, `docker compose logs app`
prüfen.

### Caddy bekommt kein Zertifikat

`docker compose logs caddy`. Ursachen: DNS für `APP_DOMAIN`/`S3_DOMAIN` zeigt
(noch) nicht auf den Server, Port 80/443 von außen nicht erreichbar oder von
einem anderen Dienst belegt, `APP_DOMAIN`/`S3_DOMAIN` leer oder mit `https://`
eingetragen.

### Login schlägt fehl / „Invalid origin"

`BETTER_AUTH_URL` muss exakt der URL entsprechen, unter der das Portal im
Browser aufgerufen wird (Schema, Host, ohne `/` am Ende). Weitere Origins in
`BETTER_AUTH_TRUSTED_ORIGINS`.

### Bilder fehlen oder Uploads schlagen fehl

- `S3_PUBLIC_ENDPOINT` ist im Browser nicht erreichbar → Proxy-Eintrag für
  den Datei-Host prüfen; `https://<S3_DOMAIN>/<S3_BUCKET>/` sollte ein
  XML-`AccessDenied` liefern (Bucket ist nicht auflistbar — das ist korrekt).
- Upload bricht mit CORS-Fehler ab → `MINIO_CORS_ALLOW_ORIGIN` auf den
  Portal-Origin setzen, `docker compose up -d minio`.
- Upload > 1 MB scheitert mit `413` → Body-Limit des eigenen Proxys anheben
  ([8.2](#82-variante-a-vorhandener-reverse-proxy)).
- PDF-Textextraktion oder Instagram-Posting scheitert, Bilder im Browser gehen
  aber → der Server erreicht seinen eigenen `S3_PUBLIC_ENDPOINT` nicht
  (fehlendes Hairpin-NAT). Abhilfe z. B. über einen DNS-Eintrag im lokalen
  Resolver bzw. `extra_hosts` in einer `docker-compose.override.yml`, der den
  Datei-Host auf die interne Proxy-Adresse auflöst.

### Mails kommen nicht an

Ohne `SMTP_HOST` steht im App-Log
`[mailer] SMTP_HOST ist nicht gesetzt — E-Mail-Versand ist deaktiviert`.
Mit `SMTP_HOST`: Lehnt der Server ab oder ist er nicht erreichbar (Timeout
8 s), schlägt die auslösende Aktion mit `SMTP-Versand fehlgeschlagen: …` fehl.
Zugangsdaten, Port (`587` STARTTLS vs. `465` TLS), Absender (`SMTP_FROM`) und
SPF/DKIM prüfen ([9.3](#93-e-mail-smtp)). Newsletter gehen erst mit dem
täglichen Cron-Lauf um 05:00 UTC raus, nicht sofort.

### Cron-Jobs laufen nicht oder schlagen fehl

```bash
docker compose logs -f cron-sidecar
```

Beim Start erscheint `[cron] starting crond (TZ=UTC, target http://app:3000)`,
pro Lauf ein Block wie:

```text
[cron] 2026-10-03T17:00:00Z GET http://app:3000/api/cron/market-digest
<Antwort der Route>
[cron] HTTP 200
[cron] market-digest exit=0
```

Einen Job sofort auslösen, ohne auf den Zeitplan zu warten:

```bash
docker compose exec cron-sidecar run-cron-job market-digest
docker compose logs --tail 20 cron-sidecar
```

(Die Ausgabe von `exec` landet im Container-Log, nicht im Terminal.)

| Log-Zeile                     | Bedeutung                                                              |
| ----------------------------- | ---------------------------------------------------------------------- |
| `exit=0`                      | HTTP 2xx, Job erfolgreich                                              |
| `exit=22` + `HTTP 401`        | `CRON_SECRET` von App und Sidecar unterscheiden sich — nach Änderung beide neu erstellen: `docker compose up -d` |
| `exit=22` + anderer 4xx/5xx   | Route meldet einen Fehler → `docker compose logs app` zur selben Zeit  |
| `exit=6` / `exit=7`           | App nicht erreichbar (Name nicht auflösbar / Verbindung abgelehnt) — läuft `app`? stimmt `CRON_APP_URL`? |

Alle Zeitpläne sind **UTC** (`0 17 * * *` = 18:00 MEZ bzw. 19:00 MESZ).
