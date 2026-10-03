# Deployment mit Docker (Self-Hosting)

> Work in progress — wird phasenweise mit der Migration
> (`.claude/plans/docker-self-hosted-migration.md`) erweitert.

## Datenbank (`postgres`-Service)

`docker-compose.yml` startet einen `postgres:16`-Container; die Daten liegen im
benannten Volume `postgres-data` und überleben `docker compose down`
(nur `down -v` löscht sie). Pflicht ist `POSTGRES_PASSWORD`, optional
`POSTGRES_USER`/`POSTGRES_DB` (Default jeweils `meeples`) und `POSTGRES_PORT`
(Default `5432`, nur an `127.0.0.1` gebunden). Die App verbindet sich per
Standard-TCP-Connection-String:

```bash
DATABASE_URL="postgresql://meeples:<POSTGRES_PASSWORD>@localhost:5432/meeples"
```

### Einmaliger Umzug bestehender Neon-Daten

Nur für die **einmalige** Übernahme der Bestandsdaten aus Neon — kein
Sync-Mechanismus, danach ist der Container die einzige Datenquelle. Schreibzugriffe
auf die Neon-Instanz vorher stoppen, sonst gehen Änderungen nach dem Dump verloren.

```bash
# 1. Dump aus Neon ziehen (direkter Endpoint, NICHT der "-pooler"-Host;
#    pg_dump-Major-Version >= Server-Version)
pg_dump "postgresql://<user>:<pw>@<neon-host>/<db>?sslmode=require" \
  --format=custom --no-owner --no-acl --file=neon.dump

# 2. Leeren Container starten
docker compose up -d postgres

# 3. Dump einspielen (Schema + Daten inkl. _prisma_migrations-Tabelle)
pg_restore --dbname="postgresql://meeples:<pw>@localhost:5432/meeples" \
  --no-owner --no-acl neon.dump

# 4. Prüfen, dass keine Migration fehlt
DATABASE_URL="postgresql://meeples:<pw>@localhost:5432/meeples" pnpm prisma migrate status
```

`--no-owner --no-acl` verhindert Fehler durch Neon-spezifische Rollen.
Warnungen zu Neon-eigenen Schemas/Extensions beim Restore betreffen nicht die
App-Tabellen. Das Schema `neon_auth` (Logins aus Neon Auth) wird mit
eingespielt und ist wichtig: Die Migration `self_hosted_better_auth`
übernimmt daraus einmalig alle Konten samt Passwort-Hash in die eigenen
`auth_*`-Tabellen (gleiche User-IDs, siehe [ADR 0015](adr/0015-self-hosted-better-auth-statt-neon-auth.md)).
Läuft die Migration schon vor dem Umzug gegen die Neon-Datenbank, sind die
Konten bereits im Dump enthalten. Danach kann `neon_auth` gelöscht werden.
Bestehende Sessions werden nicht übernommen — alle melden sich einmal neu an.
Google-SSO-Konten ohne Passwort gibt es nicht mehr; Betroffene setzen über
„Passwort vergessen" ein Passwort.

Pflicht-Variablen für den Login: `BETTER_AUTH_URL` (öffentliche URL der App)
und `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), siehe `.env.example`.

## Blob-Storage (`minio`-Service)

Uploads (Bilder, PDFs, Downloads, Anhänge) und serverseitig erzeugte Bilder
liegen in einem S3-kompatiblen **MinIO**-Container statt in Vercel Blob. Die App
spricht ihn über `@aws-sdk/client-s3` an (`src/lib/utils/s3.ts`, path-style
Adressierung). Daten im Volume `minio-data`; API (`9000`) und Web-Konsole
(`9001`) sind nur an `127.0.0.1` gebunden.

**Bucket-Init:** Der One-Shot-Service `minio-init` (`minio/mc`) läuft bei jedem
`docker compose up` idempotent nach dem Healthcheck und

1. legt den Bucket `S3_BUCKET` an (falls nicht vorhanden),
2. setzt ihn auf anonymes Lesen (`mc anonymous set download`) — gespeicherte
   Blob-URLs sind wie bisher öffentlich, aber nicht auflistbar,
3. legt einen eigenen App-User `S3_ACCESS_KEY`/`S3_SECRET_KEY` mit
   `readwrite`-Policy an, damit die App nicht mit den Root-Credentials läuft.

Bewusst kein Lazy-`CreateBucket` im App-Code: Bucket-Policy und User-Anlage
brauchen ohnehin Admin-Rechte, die die App nicht haben soll.

**Upload-Ablauf:** Der Browser lädt direkt in den Bucket hoch (kein Umweg über
den App-Server). Die jeweilige `get…UploadToken`-Server-Action prüft die
Berechtigung und stellt einen **Presigned POST** aus (`blob-upload-token.ts`),
dessen Policy Maximalgröße (`content-length-range`) und Content-Type festlegt —
MinIO selbst lehnt zu große oder falsch typisierte Dateien ab, wie vorher die
Vercel-Client-Tokens.

| Variable                                | Zweck                                                                                                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `S3_ENDPOINT`                           | Endpoint für die App (im Compose-Netz `http://minio:9000`)                                                                                |
| `S3_PUBLIC_ENDPOINT`                    | Endpoint für Browser (Bild-URLs, Uploads); optional, Default `S3_ENDPOINT`. Gespeicherte URLs enthalten ihn — später nicht mehr ändern. |
| `S3_REGION`                             | Optional, Default `us-east-1` (MinIO ignoriert sie)                                                                                       |
| `S3_BUCKET`                             | Bucket-Name (Compose-Default `meeples`)                                                                                                   |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY`       | App-Credentials, legt `minio-init` an                                                                                                     |
| `S3_STORAGE_LIMIT_BYTES`                | Optional, Soft-Quota der Admin-Füllstandskarte (Default 1 GB)                                                                             |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | Nur für Compose (`minio`, `minio-init`)                                                                                                 |
| `MINIO_CORS_ALLOW_ORIGIN`               | Optional, Default `*`; in Produktion auf die App-URL setzen                                                                               |

`S3_PUBLIC_ENDPOINT` muss vom Browser **und** vom App-Container aus erreichbar
sein (die PDF-Textextraktion lädt Rechtsdokumente über ihre öffentliche URL).
Die CSP erlaubt den Origin automatisch in `img-src` und `connect-src`.

### Bestehende Vercel-Blob-Dateien

Nicht automatisch migriert. Alte `*.public.blob.vercel-storage.com`-URLs in der
Datenbank funktionieren nur, solange der Vercel-Store existiert; `deleteBlobs()`
überspringt sie (nichts im eigenen Bucket zu löschen). Für einen vollständigen
Umzug: Dateien aus Vercel herunterladen, mit `mc cp` in den Bucket legen und
die URL-Spalten per SQL-`replace()` auf `S3_PUBLIC_ENDPOINT/S3_BUCKET/…`
umschreiben.

> MinIO veröffentlicht seit Ende 2025 keine neuen Community-Images mehr
> (nur noch Quellcode). `docker-compose.yml` nutzt vorerst `:latest` — vor dem
> Produktivbetrieb einen getesteten Tag pinnen oder einen Fork/Alternative
> (z. B. Garage, SeaweedFS) prüfen; die App braucht nur die S3-API.

## Analytics (In-App, kein eigener Service)

Vercel Web Analytics (`@vercel/analytics`) ist durch ein eigenes, schlankes
Seitenaufruf-Tracking ersetzt — kein zusätzlicher Container, keine Env-Vars,
die Daten liegen in der bestehenden Postgres-Datenbank (Tabelle `page_views`,
angelegt per `prisma migrate deploy`).

- Der Browser meldet jeden Seitenaufruf per `navigator.sendBeacon` an
  `POST /api/analytics/collect` (`components/layout/page-view-beacon.tsx`).
- Gespeichert werden nur Pfad (ohne Query-String), Host einer externen
  Herkunftsseite sowie eine grobe Browser-/Geräteklasse (z. B. „Chrome" /
  „Mobil"). **Keine IP-Adresse, kein roher User-Agent, keine Cookies**, keine
  Besucher-Kennung. Bots sowie Besucher mit „Do Not Track"/GPC werden nicht
  gezählt.
- Auswertung unter **`/admin/analytics`** (Navigation „Seitenaufrufe"), nur
  mit der Berechtigung `admin:access`.
- Hinter einem Reverse Proxy muss der `Host`- bzw. `X-Forwarded-Host`-Header
  durchgereicht werden, sonst wird eigene Navigation fälschlich als externe
  Herkunft gezählt.
- Keine automatische Löschfrist: die Zeilen sind nicht personenbezogen. Wer
  die Tabelle klein halten will, dünnt sie per SQL aus, z. B.
  `DELETE FROM page_views WHERE "createdAt" < now() - interval '1 year';`.
- Alte Vercel-Analytics-Daten werden nicht übernommen.

## E-Mail (SMTP, kein eigener Service)

Alle Mails der App — Newsletter, Double-Opt-in, „Passwort vergessen"-Codes,
Reset-Links, Mitglieder-Benachrichtigungen, Jahreswechsel-Cron,
Flohmarkt-Verkäufer — laufen über `sendTransactionalEmail`
(`src/lib/newsletter/mailer.ts`), einen provider-neutralen SMTP-Client auf
Basis von `nodemailer`. **`docker-compose.yml` bringt bewusst keinen
Mailserver-Container mit.**

| Variable    | Zweck                                                                                 |
| ----------- | ------------------------------------------------------------------------------------- |
| `SMTP_HOST` | SMTP-Server. **Leer = Versand deaktiviert** (siehe unten)                              |
| `SMTP_PORT` | Optional, Default `587` (STARTTLS); `465` schaltet auf implizites TLS                  |
| `SMTP_USER` | Optional; leer = ohne Authentifizierung (z. B. interner Relay)                         |
| `SMTP_PASS` | Passwort/App-Token zu `SMTP_USER`                                                      |
| `SMTP_FROM` | Optional, Default `"Oecher Meeples" <newsletter@oecher-meeples.org>`; muss vom Provider als Absender erlaubt sein |

**Ohne `SMTP_HOST`** ist der Versand ein kontrollierter No-op: Die App startet
und läuft normal, beim ersten Mailversuch erscheint einmalig die Warnung
`[mailer] SMTP_HOST ist nicht gesetzt — E-Mail-Versand ist deaktiviert` im Log,
danach pro verworfener Mail eine Info-Zeile mit dem Betreff (ohne Empfänger).
Die Aufrufer behandeln die Mail dabei als erfolgreich verschickt — Newsletter-
Jobs landen z. B. auf `SENT`, und „Passwort vergessen" sowie Einladungen von
Systemkonten funktionieren nicht. Für den Produktivbetrieb SMTP also
konfigurieren.

**Empfehlung:** einen bestehenden Mail-Provider bzw. dessen SMTP-Relay nutzen
(Hoster-Postfach der Vereinsdomain, Brevo/Mailjet/Postmark/Amazon SES per
SMTP-Zugang …). SPF/DKIM für die Absender-Domain einrichten.

> **Eigener Mailserver (z. B. [`docker-mailserver`](https://github.com/docker-mailserver/docker-mailserver)):**
> möglich, aber bewusst nicht Teil des Defaults. Mails von einem selbst
> betriebenen Server landen schnell im Spam oder werden abgelehnt, wenn die
> **IP-Reputation** des Servers schlecht ist (typisch bei VPS-/Heim-IPs, fehlendem
> Reverse-DNS/PTR, fehlendem SPF/DKIM/DMARC). Viele Hoster und Heimanschlüsse
> **sperren ausgehenden Port 25**, ohne den ein eigener Server gar nicht an
> fremde Mailserver zustellen kann. Wer das trotzdem will, betreibt den
> Mailserver separat und trägt ihn hier nur als `SMTP_HOST` ein.

Prüfen lässt sich die Konfiguration mit `pnpm run test:live` (verschickt eine
Testmail an `SMTP_LIVE_TEST_TO`, liest `.env.local`). Zum lokalen Entwickeln
eignet sich ein Mail-Catcher wie Mailpit
(`docker run -p 1025:1025 -p 8025:8025 axllent/mailpit`, `SMTP_HOST=localhost`,
`SMTP_PORT=1025`, Weboberfläche auf `http://localhost:8025`).

## Cron (`cron-sidecar`-Service)

Ersetzt Vercel Cron. Ein kleiner `alpine`-Container (`docker/cron/`) mit
busybox-`crond` (bringt alpine selbst mit) und `curl` ruft die bestehenden,
per Bearer-Token geschützten Routen der App auf — derselbe `GET`-Request mit
`Authorization: Bearer $CRON_SECRET`, den Vercel Cron schickt. Kein
Docker-Socket-Zugriff nötig.

| Route                        | Zeitplan (UTC) |
| ---------------------------- | -------------- |
| `/api/cron/instagram-queue`  | `0 5 * * *`    |
| `/api/cron/market-digest`    | `0 17 * * *`   |
| `/api/cron/year-turn`        | `0 2 2 1 *`    |

| Variable       | Zweck                                                                        |
| -------------- | ---------------------------------------------------------------------------- |
| `CRON_SECRET`  | Pflicht; **dieselbe** Variable, die auch die App liest                       |
| `CRON_APP_URL` | Optional, Default `http://app:3000` (Service-Name + Port im Compose-Netz)    |

Cron-Jobs erben die Container-Umgebung nicht. Das Entrypoint-Script schreibt
deshalb beim Start den fertigen Header in `/run/cron/auth-header` (nur für
`nobody` lesbar); `run-cron-job` übergibt ihn per `curl -H @datei` — das
Secret steht so weder in der Crontab noch in der Prozessliste. `crond` läuft
als root (muss es, um Jobs auszuführen), `curl` selbst als `nobody`. Fehlt
`CRON_SECRET`, startet der Container gar nicht erst.

**Prüfen:**

```bash
docker compose logs -f cron-sidecar   # Start-Zeile + pro Lauf: GET …, HTTP-Status, exit=…
# Einen Job sofort auslösen, ohne auf den Zeitplan zu warten:
docker compose exec cron-sidecar run-cron-job market-digest
docker compose logs cron-sidecar | tail
```

`exit=0` heißt HTTP 2xx; `exit=22` heißt die Route hat mit ≥ 400 geantwortet
(z. B. 401 bei falschem Secret), `exit=6/7` heißt die App war nicht erreichbar.

**Zeitpläne ändern:** in `docker/cron/crontab` (danach
`docker compose up -d --build cron-sidecar`). Solange die App parallel noch auf
Vercel läuft, gleichzeitig in `vercel.json` — sonst laufen die beiden
Deployments auseinander. `vercel.json` bleibt bis zur Abschaltung des
Vercel-Deployments bewusst im Repo; erst danach kann es entfallen.
