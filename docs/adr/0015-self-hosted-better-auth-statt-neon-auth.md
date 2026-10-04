---
status: accepted
supersedes: 0007-neondatabase-auth-agpl-huelle-dokumentiert.md
---

# Self-hosted better-auth statt Neon Auth

Das Portal soll komplett selbst hostbar sein — als Docker-Setup, das 1:1 an einen Dritten übergeben werden kann, **ohne jede Vercel- oder Neon-Plattformbindung** (`.claude/plans/docker-self-hosted-migration.md`). Neon Auth (`@neondatabase/auth`) widerspricht dem direkt: Login, Session-Prüfung, Passwort-Reset und OTP-Versand liefen als HTTP-Aufrufe gegen einen von Neon gehosteten Auth-Endpunkt (`NEON_AUTH_BASE_URL`), die Konten lagen im von Neon verwalteten Schema `neon_auth`, die Konfiguration (Trusted Origins, Sign-up, E-Mail-Versand) in Neons Konsole.

**Wir ersetzen Neon Auth durch eine in-app betriebene `better-auth`-Instanz** (`betterAuth({…})` in `src/lib/auth/server.ts`, Optionen in `src/lib/auth/config.ts`) mit Prismas eigenem Client als Datenbank-Adapter — kein eigener Auth-Service, keine zweite Datenbankverbindung. `@neondatabase/auth` war ohnehin nur eine Hülle um better-auth (Server-API-Proxy, eigener Session-Cache-Cookie, React-UI-Paket); better-auth war bereits Projekt-Dependency.

## Was sich ändert

- **Tabellen**: `auth_users`/`auth_accounts`/`auth_sessions`/`auth_verifications` als Prisma-Modelle (`AuthUser` …). UUIDs wie bei Neon. Fachtabellen verweisen weiter **ohne** Fremdschlüssel über `neonAuthUserId` (Name historisch — eine Umbenennung ist ein eigener, rein mechanischer Refactor).
- **Datenübernahme**: Die Migration `20261003200000_self_hosted_better_auth` kopiert, falls `neon_auth` existiert (Neon-DB selbst oder `pg_restore` eines Neon-Dumps), alle User und Passwort-Konten mit unveränderten IDs. Beide Seiten nutzen better-auths scrypt-Hashformat — bestehende Passwörter bleiben gültig. Sessions werden nicht übernommen (neues Cookie-Secret): alle melden sich einmal neu an.
- **Env**: `NEON_AUTH_BASE_URL`/`NEON_AUTH_COOKIE_SECRET` entfallen. Neu: `BETTER_AUTH_URL` (öffentliche App-URL), `BETTER_AUTH_SECRET` (≥ 32 Zeichen, signiert Session-Cookies/Tokens und — wie zuvor das Neon-Cookie-Secret — das Instagram-OAuth-State-Cookie), optional `BETTER_AUTH_TRUSTED_ORIGINS`.
- **E-Mails** (OTP für „Passwort vergessen", Reset-Link fürs Systemkonto) verschickt jetzt die App selbst über `sendTransactionalEmail` — vorher Neons „shared" E-Mail-Provider.
- **Session-Prüfung** ist ein indizierter Lookup in `auth_sessions` statt ein HTTP-Hop zu Neon. Neons ~5-min-Session-Data-Cache-Cookie entfällt (better-auths `cookieCache` bleibt aus) — damit auch der in #242 bewusst akzeptierte „Gast"-Flicker auf öffentlichen Seiten. Session-Refresh (`expiresAt` gleitend verlängern) passiert weiterhin nur im Proxy für `/admin` (#242-Entscheidung: kein Session-Lookup pro anonymem Seitenaufruf); im Server-Component-Render bleibt `disableRefresh` gesetzt. Der Neon-Workaround im Proxy (Session-Probe immer per GET klonen) entfällt, weil kein Upstream-Aufruf mehr stattfindet.

## Bewusste Verschärfungen gegenüber der Neon-Konfiguration

Neons gehostete Konfiguration (ausgelesen aus `neon_auth.project_config`) hatte öffentliches Sign-up aktiv, Google als „shared" Social Provider und das Organization-Plugin eingeschaltet — nichts davon nutzt das Portal. Wir übernehmen das **nicht**:

- **Kein öffentliches Sign-up** (`disableSignUp`, `/sign-up/email` per `disabledPaths` gesperrt). Konten entstehen nur serverseitig über `createLoginAccount()` — Einladung (`redeemInvite`) und Systemkonto. Bewusst nicht über `auth.api.signUpEmail`: mit `autoSignIn: false` antwortet better-auth auf eine schon vergebene E-Mail mit einem *synthetischen* Erfolgs-User (Enumeration-Schutz), der Aufrufer würde Rollen/Meeple an eine nicht existierende ID hängen; mit `autoSignIn: true` würde der Browser des einladenden Admins als neues Konto angemeldet.
- **Google SSO entfällt ersatzlos** (war nie aktiv im Einsatz, keine Credentials im Repo). Kein Social Provider konfiguriert.
- **Kein Admin-Plugin**: das Systemkonto braucht nur „User ohne Session anlegen"; das Plugin brächte better-auths eigenes `role`-Rollenmodell plus öffentliche `/admin/*`-Endpunkte neben unserem Permission-Modell.
- **OTP-Seiteneingänge gesperrt**: das email-OTP-Plugin bringt neben dem Passwort-Reset auch OTP-Login (der Konten anlegen und das Login-Rate-Limit aus #326 umgehen würde), OTP-E-Mail-Verifizierung und -Änderung mit. Gesperrt sind außerdem die gleichwertigen Reset-Anforderungen (`/forget-password/email-otp`, `/request-password-reset`), damit nur der vom IP-Cooldown in `src/app/api/auth/[...path]/route.ts` abgedeckte Pfad (`/email-otp/request-password-reset`) offen ist. `disabledPaths` sperrt nur den HTTP-Router; serverseitige `auth.api.*`-Aufrufe (Systemkonto-Reset-Link) funktionieren weiter.
- **Telemetrie aus** (`telemetry.enabled: false`), unabhängig von Env-Variablen.

## Folgen für ADR 0007

Mit `@neondatabase/auth` verschwindet die gesamte AGPL-verdächtige Kette (`@neondatabase/auth-ui` → `@daveyplate/better-auth-ui` → `@triplit/*`) aus dem Dependency-Baum. ADR 0007 ist damit **überholt**; die dort offenen Lizenzfragen zu `@triplit/db`/`@triplit/logger` stellen sich nicht mehr. Der LICENSE-Widerspruch (public Repo vs. „All rights reserved") bleibt davon unberührt.

## Consequences

- Betreiber:innen müssen `BETTER_AUTH_URL` und `BETTER_AUTH_SECRET` setzen; ohne `BREVO_API_KEY` (bzw. nach Phase 6 ohne SMTP) kommen keine Reset-Codes/-Links an.
- Login-Sicherheit (Hashing, Session-Lebensdauer, CSRF-Origin-Check, better-auths eingebautes Rate-Limit) liegt jetzt vollständig in unserer Konfiguration und Versionspflege von `better-auth`, nicht mehr bei Neon.
- Die Datenschutzerklärung nennt bisher Neon Auth als Cookie-Setzer; der Cookie heißt jetzt `better-auth.session_token` (unter HTTPS mit `__Secure-`-Präfix) und wird von der App selbst gesetzt — der Rechtstext muss nachgezogen werden.
- Tests: `src/lib/auth/config.test.ts` prüft die echte Konfiguration end-to-end gegen better-auths In-Memory-Adapter (Login, Session, Sign-out, gesperrte Pfade, OTP- und Link-Reset). Der frühere `server.live.test.ts` gegen Neons Endpunkt entfällt — es gibt keine Fremd-API mehr.
