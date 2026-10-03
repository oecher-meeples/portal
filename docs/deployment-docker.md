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
