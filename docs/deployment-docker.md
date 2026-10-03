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
