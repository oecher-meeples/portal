# Ausführungsplan — Sicherheits-Audit 2026-08-03

- **Grundlage:** [`.claude/audits/2026-08-03_AUDIT_SECURITY.md`](../audits/2026-08-03_AUDIT_SECURITY.md)
- **Repo:** `oecher-meeples/portal` · Default-Branch `develop` · Projects-v2-Board `oecher meeples portal` (`PVT_kwDOCJfCSs4BertC`)
- **Ausgangsstand:** Branch `app-akademie` @ `525f40f`
- **Umfang:** 15 Findings → 10 GitHub-Issues + 1 Epic

## Status GitHub-Pflege

⚠️ **Die Issues sind noch NICHT angelegt.** Die `gh issue create`-Aufrufe wurden in der Audit-Session vom Auto-Mode-Classifier blockiert. Label `security` (`#b60205`) wurde bereits erstellt. Schritt 0 dieses Plans legt die Issues an — die vollständigen Bodies stehen unten in Abschnitt „Issue-Definitionen" und sind ohne weiteren Kontext verwendbar.

---

## Schritt 0 — Issues in GitHub anlegen

- [ ] Epic anlegen (Labels: `epic`, `security`), Nummer notieren
- [ ] Issues 1–10 anlegen (Labels je Definition), Nummern notieren
- [ ] Epic-Body um die echten Issue-Nummern ergänzen (`gh issue edit <epic>`)
- [ ] Alle 11 Issues aufs Projects-Board legen, Spalte `Backlog` — Issue 10 nach `Blocked` (offene Klärung mit Neon)
- [ ] Optional: `/issue-refine <alle Nummern>` laufen lassen, um die Akzeptanzkriterien gegen den Live-Code zu gegenprüfen

**Commit:** kein Code — nur GitHub-Pflege.

---

## Schritt 1 — Cron-Endpoint härten (Issue 1 · F6 · Medium)

- [ ] `src/app/api/cron/instagram-queue/route.ts`: Guard für fehlendes `CRON_SECRET` → `500`, kein Seiteneffekt
- [ ] Vergleich auf `crypto.timingSafeEqual` mit vorheriger Längenprüfung umstellen
- [ ] Tests: Env fehlt, Token falsch, Token korrekt
- [ ] `pnpm run verify`

**Commit:** `fix(security): fail closed on missing CRON_SECRET and compare in constant time`

## Schritt 2 — Instagram-OAuth-Flow härten (Issue 2 · F7 + F9 · Medium)

- [ ] `src/lib/instagram/oauth-state.ts`: `Secure` in `buildStateCookie` **und** `clearStateCookie`
- [ ] State an die Session binden (signiert / HMAC über Session-Kennung + Nonce) statt nur zu vergleichen
- [ ] `src/app/api/auth/instagram/callback/route.ts`: `getCurrentUser()` + `hasPermission("instagram:connect")` **vor** dem Token-Tausch
- [ ] Tests: fehlende Berechtigung, State-Mismatch, Happy Path
- [ ] `pnpm run verify`

**Commit:** `fix(security): bind Instagram OAuth state to the session and gate the callback`

## Schritt 3 — Instagram-Access-Token verschlüsseln (Issue 3 · F2 · High)

- [ ] `encryptSecret()` beim Schreiben in `callback/route.ts`
- [ ] `decryptSecret()` an allen Lesestellen in `src/lib/instagram/queue.ts`
- [ ] Refresh-Pfad (`refreshConnectionIfNeeded`) schreibt ebenfalls verschlüsselt
- [ ] Kein Token in Logs oder in `instagramLastError`
- [ ] Migrationsweg im PR beschreiben (Re-Connect durch Admin genügt)
- [ ] Tests für Schreib- und Lesepfad
- [ ] `pnpm run verify`

**Commit:** `fix(security): encrypt the stored Instagram access token`

## Schritt 4 — Security-Header & CSP (Issue 4 · F5 · High)

- [ ] `headers()` in `next.config.ts`: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`, `Permissions-Policy` (`camera=(self)` für den Scanner)
- [ ] CSP **zuerst** als `Content-Security-Policy-Report-Only` deployen, Verstöße im Preview sammeln
- [ ] `script-src` mit Nonce/Hash statt `unsafe-inline` (Next-Doku zu CSP mit Nonce beachten)
- [ ] `img-src` um die Vercel-Blob-Domain, `connect-src` um Neon Auth ergänzen — keine Wildcards
- [ ] Manuell prüfen: News-Detail, Admin-Dashboard, Kamera-Scanner, Markt-Bilder
- [ ] Erst danach auf `Content-Security-Policy` scharf schalten
- [ ] `pnpm run verify`

**Commit:** `feat(security): add security headers and a content security policy`

## Schritt 5 — Dependency-Fixes (Issue 5 · F3 + F11 + F15)

- [ ] `shadcn` von `dependencies` nach `devDependencies` verschieben → entfernt `@hono/node-server` aus der Runtime
- [ ] `sharp` auf `>=0.35.0` (ggf. `pnpm.overrides`, da transitiv über `next`)
- [ ] `postcss` auf `>=8.5.18` (ebenfalls ggf. Override)
- [ ] `pnpm audit --audit-level high`: nur noch die better-auth-Kette offen
- [ ] Production-Build + Bild-Rendering manuell verifiziert
- [ ] `pnpm run verify`

**Commit:** `chore(deps): patch sharp, postcss and move shadcn to devDependencies`

## Schritt 6 — CI: Vulnerability-Scan & Dependabot (Issue 6 · F14)

- [ ] `pnpm audit --audit-level high` als CI-Step nach `test` in `.github/workflows/ci.yml`
- [ ] Entscheidung dokumentieren: blockierend ab `high`, mit Allowlist für die bewusst offenen Funde (`brace-expansion`, better-auth solange Neon nicht nachgezogen hat)
- [ ] `.github/dependabot.yml`: `npm` + `github-actions`, wöchentlich, Ziel `develop`
- [ ] Auf einem Test-PR verifiziert
- [ ] `pnpm run verify`

**Commit:** `ci: add dependency vulnerability scan and dependabot`

## Schritt 7 — Blob-Upload härten (Issue 7 · F8 · Medium)

- [ ] Prefix serverseitig setzen: `pathname` → `${erwarteterPrefix}/${basename(pathname)}`, Client-Prefix verwerfen
- [ ] Normalisierung **einmal** nach `src/lib/utils/` (DRY — betrifft zwei Aufrufer)
- [ ] `maximumSizeInBytes` in beiden `generateClientTokenFromReadWriteToken`-Aufrufen (Vorschlag 8 MB)
- [ ] Fehlerursache in `useBlobUpload` an die UI durchreichen statt Sammel-Meldung
- [ ] Tests: Prefix-Escape normalisiert, Übergröße abgelehnt, Happy Path
- [ ] `pnpm run verify`

**Commit:** `fix(security): normalise blob upload paths server-side and cap upload size`

## Schritt 8 — Klarnamen-Preisgabe in der Gast-Action (Issue 8 · F10 · Medium)

- [ ] `getGuestGameDetail`: `eventId` validieren (läuft aktuell + öffentlich) — bestehende Helfer in `src/lib/events/` nutzen, keine neue Query
- [ ] Gleiche Prüfung für `lookupGuestGame` erwägen
- [ ] Namensumfang für Gäste entscheiden und in ADR 0005 nachtragen
- [ ] Tests: fremde/abgelaufene `eventId` → `null`, laufendes Event → Daten
- [ ] `pnpm run verify`

**Commit:** `fix(security): validate eventId before exposing explainer names to guests`

## Schritt 9 — Kleinere Härtung (Issue 9 · F13 + F12 · Low)

- [ ] `src/lib/content/calendar.ts`: Größenlimit in `fetchIcsFeed` (Vorschlag 5 MB), „never throws"-Verhalten erhalten
- [ ] `admin-preview-tier/actions.ts`: `secure: true` im Preview-Tier-Cookie
- [ ] Test: übergroße Antwort → `[]`
- [ ] `pnpm run verify`

**Commit:** `fix(security): cap ICS feed size and set Secure on the preview tier cookie`

## Schritt 10 — Neon Auth klären (Issue 10 · F1 + F4 · Critical/High, blockiert)

> Beginnt mit **Recherche**, nicht mit Code. Nicht vor Abschluss der Klärung umsetzen.

- [ ] Neon-Auth-Konfiguration klären und als Issue-Kommentar dokumentieren: serverseitige better-auth-Version, aktive Plugins, PKCE-Erzwingung, Login-Rate-Limits, Greift `GHSA-g38m-r43w-p2q7`?
- [ ] Prüfen, ob `pnpm.overrides` auf `better-auth >=1.6.22` mit `@neondatabase/auth` 0.4.2-beta funktioniert — oder ob `@neondatabase/auth` selbst aktualisiert werden muss
- [ ] Eignung von `@neondatabase/auth` **0.4.2-beta** für Produktion mitbewerten
- [ ] Google-SSO-Account-Verlinkung auf verifizierte E-Mails beschränken, falls das Advisory greift
- [ ] Rate Limiting entscheiden: Neon-seitig vorhanden → dokumentieren; sonst eigenes Limit für Login, `redeemInvite`, `revealIban`
- [ ] Nach der Klärung ggf. in eigenständige Umsetzungs-Issues aufteilen

**Commit:** abhängig vom Ergebnis der Klärung.

---

## Abschluss

- [ ] Alle Issues geschlossen bzw. mit begründetem Restrisiko kommentiert
- [ ] Epic geschlossen
- [ ] Bewusst offen gelassene Findings im Audit-Bericht als „akzeptiert" nachtragen
- [ ] Folge-Audit terminieren (Empfehlung: nach Abschluss von Schritt 10)

---

# Issue-Definitionen

Die Bodies unten sind vollständig und ohne Audit-Kontext verwendbar. Zum Anlegen jeweils den Abschnitt zwischen den Trennlinien in eine Datei schreiben und `gh issue create --title "…" --label … --body-file <datei>` aufrufen.

## Epic

- **Titel:** `Epic: Sicherheits-Audit 2026-08-03 — Findings abarbeiten`
- **Labels:** `epic`, `security`
- **Board-Spalte:** `Epics`

```markdown
Sammel-Issue für die Findings aus dem Sicherheits-Audit vom **2026-08-03**.

**Bericht:** [`.claude/audits/2026-08-03_AUDIT_SECURITY.md`](.claude/audits/2026-08-03_AUDIT_SECURITY.md)

Ergebnis: **1 critical · 11 high · 3 moderate · 1 low** (Dependencies) plus 12 Code-Level-Findings.

## Kinder-Issues (empfohlene Reihenfolge)

1. Cron-Endpoint härten — F6 · #TBD
2. Instagram-OAuth-Flow härten — F7, F9 · #TBD
3. Instagram-Access-Token verschlüsseln — F2 · #TBD
4. Security-Header & CSP — F5 · #TBD
5. Dependency-Fixes (sharp, postcss, shadcn) — F3, F11, F15 · #TBD
6. CI: Vulnerability-Scan & Dependabot — F14 · #TBD
7. Blob-Upload härten — F8 · #TBD
8. Klarnamen-Preisgabe in der Gast-Action — F10 · #TBD
9. Kleinere Härtung (ICS-Limit, Preview-Cookie) — F13, F12 · #TBD
10. Neon Auth klären: better-auth-Version & Rate Limiting — F1, F4 · #TBD

## Was das Audit ausdrücklich nicht abdeckt

Rein statisches Audit. Kein dynamisches Pentesting, keine Prüfung der serverseitigen Neon-Auth-Konfiguration, kein Reverse Engineering des Bundles. Details im Abschnitt „Nicht abgedeckt" des Berichts.
```

---

## Issue 1 — Cron-Endpoint härten

- **Titel:** `security: Cron-Endpoint fail-closed machen und konstant-zeitig vergleichen`
- **Labels:** `security`, `bug`, `backend`, `ready`

```markdown
**Finding F6 · Medium** — aus dem Sicherheits-Audit vom 2026-08-03.

## Problem

[`src/app/api/cron/instagram-queue/route.ts:7`](src/app/api/cron/instagram-queue/route.ts#L7)

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {

Zwei Schwächen:

1. **Fail-Open bei fehlendem Env.** Ist `CRON_SECRET` nicht gesetzt, wird gegen den String `"Bearer undefined"` verglichen — wer diesen Header sendet, kommt durch.
2. **Nicht konstant-zeitiger Vergleich.** `!==` bricht beim ersten abweichenden Byte ab.

Der Endpoint löst Instagram-Posts aus **und** löscht Bankdaten-Zugriffsprotokolle (`deleteExpiredBankDataAccessLogs`, Zeile 13) — also einen Audit-Trail. Fail-Closed ist hier Pflicht.

## Akzeptanzkriterien

**Given** `CRON_SECRET` ist in der Umgebung nicht gesetzt
**When** ein beliebiger Request auf `/api/cron/instagram-queue` trifft — auch mit `Authorization: Bearer undefined`
**Then** antwortet die Route mit `500` und führt **keine** der drei Aktionen aus

**Given** `CRON_SECRET` ist gesetzt
**When** ein Request mit falschem oder fehlendem Bearer-Token eintrifft
**Then** antwortet die Route mit `401`, und der Vergleich erfolgt konstant-zeitig

**Given** `CRON_SECRET` ist gesetzt
**When** Vercel Cron mit korrektem Bearer-Token aufruft
**Then** läuft der Job unverändert wie bisher durch

### Checkliste

- [ ] Guard: fehlendes `CRON_SECRET` → `500`, kein Seiteneffekt
- [ ] Vergleich über `crypto.timingSafeEqual` mit vorheriger Längenprüfung (`timingSafeEqual` wirft bei ungleicher Länge)
- [ ] Tests für alle drei Fälle: Env fehlt, Token falsch, Token korrekt
- [ ] `pnpm run verify` grün
```

---

## Issue 2 — Instagram-OAuth-Flow härten

- **Titel:** `security: Instagram-OAuth-State an die Session binden und Callback berechtigen`
- **Labels:** `security`, `bug`, `backend`, `ready`

```markdown
**Findings F7 + F9 · Medium** — aus dem Sicherheits-Audit vom 2026-08-03.

## Problem

### F7 — State-Cookie schwach

[`src/lib/instagram/oauth-state.ts:8`](src/lib/instagram/oauth-state.ts#L8)

    return `${STATE_COOKIE_NAME}=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`;

- **`Secure` fehlt** → Cookie geht auch über HTTP.
- **Wert ist unsigniert.** Verifiziert wird nur „Cookie == Query-Parameter", ohne kryptografische Bindung an die Session, die das Cookie gesetzt hat. Bei Cookie-Tossing von einer Subdomain kontrolliert ein Angreifer beide Seiten und die CSRF-Prüfung läuft leer.

### F9 — Callback ohne Berechtigungsprüfung

[`src/app/api/auth/instagram/callback/route.ts:23`](src/app/api/auth/instagram/callback/route.ts#L23) prüft ausschließlich `state`, während [`connect/route.ts:8`](src/app/api/auth/instagram/connect/route.ts#L8) korrekt `hasPermission(user.id, "instagram:connect")` prüft. Der Callback überschreibt die vereinsweite `InstagramConnection` — die gesamte Autorisierung hängt damit am Cookie aus F7.

## Akzeptanzkriterien

**Given** der Nutzer startet den Instagram-Connect-Flow
**When** das State-Cookie gesetzt wird
**Then** trägt es `Secure`, `HttpOnly` und `SameSite=Lax`, und sein Wert ist an die Session des Nutzers gebunden (signiert oder als HMAC über Session-Kennung + Nonce)

**Given** ein Nutzer **ohne** `instagram:connect`-Berechtigung
**When** er `/api/auth/instagram/callback` mit gültigem `code` und passendem State-Cookie aufruft
**Then** antwortet die Route mit `403` und die `InstagramConnection` bleibt unverändert

**Given** ein Admin mit `instagram:connect`
**When** er den Flow regulär durchläuft
**Then** wird die Verbindung wie bisher gespeichert und auf `/admin/einstellungen/instagram` weitergeleitet

### Checkliste

- [ ] `Secure` in `buildStateCookie` **und** `clearStateCookie`
- [ ] State an die Session binden statt nur zu vergleichen
- [ ] `getCurrentUser()` + `hasPermission("instagram:connect")` im Callback, vor dem Token-Tausch
- [ ] Tests: fehlende Berechtigung, State-Mismatch, Happy Path
- [ ] `pnpm run verify` grün
```

---

## Issue 3 — Instagram-Access-Token verschlüsseln

- **Titel:** `security: Instagram-Access-Token verschlüsselt speichern`
- **Labels:** `security`, `bug`, `backend`, `ready`

```markdown
**Finding F2 · High** — aus dem Sicherheits-Audit vom 2026-08-03.

## Problem

[`prisma/schema.prisma:544`](prisma/schema.prisma#L544)

    model InstagramConnection {
      accessToken         String   // ← Klartext

Geschrieben in [`callback/route.ts:44`](src/app/api/auth/instagram/callback/route.ts#L44).

Es ist ein **Long-Lived Page Access Token** (60 Tage) mit `instagram_content_publish` — wer es liest, kann im Namen des Vereins posten. Das Projekt hat mit [`src/lib/utils/crypto.ts`](src/lib/utils/crypto.ts) bereits eine im Audit als korrekt bestätigte AES-256-GCM-Implementierung (`encryptSecret`/`decryptSecret`), die für IBANs genutzt wird. Der Instagram-Token nutzt sie nicht — gleicher Schutzbedarf, ungleicher Schutz.

Kein neues Schlüsselmaterial nötig: `MEMBER_DATA_ENCRYPTION_KEY` existiert bereits.

## Akzeptanzkriterien

**Given** ein Admin verbindet den Instagram-Account
**When** die `InstagramConnection` gespeichert wird
**Then** enthält `accessToken` einen Wert im Format `v1:<iv>:<tag>:<ciphertext>` und nirgends das Klartext-Token

**Given** eine gespeicherte, verschlüsselte Verbindung
**When** `processQueue()` oder `refreshConnectionIfNeeded()` das Token braucht
**Then** wird es über `decryptSecret()` entschlüsselt und der Instagram-Post gelingt wie bisher

**Given** eine bestehende Verbindung mit Klartext-Token in der Produktions-DB
**When** die Änderung deployt wird
**Then** ist der Migrationsweg dokumentiert (Re-Connect durch den Admin genügt — kein Datenverlust außer der Notwendigkeit, einmal neu zu verbinden)

### Checkliste

- [ ] `encryptSecret()` beim Schreiben in `callback/route.ts`
- [ ] `decryptSecret()` an allen Lesestellen in [`src/lib/instagram/queue.ts`](src/lib/instagram/queue.ts)
- [ ] Prüfen, ob das Token beim Refresh (`refreshConnectionIfNeeded`) erneut verschlüsselt geschrieben wird
- [ ] Kein Token in Logs oder Fehlermeldungen — `instagramLastError` prüfen
- [ ] Migrationsweg im PR beschrieben
- [ ] Tests für Verschlüsseln beim Schreiben und Entschlüsseln beim Lesen
- [ ] `pnpm run verify` grün
```

---

## Issue 4 — Security-Header & CSP

- **Titel:** `security: Security-Header und Content-Security-Policy ergänzen`
- **Labels:** `security`, `enhancement`, `ready`

```markdown
**Finding F5 · High** — aus dem Sicherheits-Audit vom 2026-08-03.

## Problem

[`next.config.ts`](next.config.ts) enthält ausschließlich `allowedDevOrigins`. Es fehlen sämtliche Security-Header:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Frame-Options` bzw. `frame-ancestors`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`

Verstärkend: Das Projekt rendert Markdown (`react-markdown`) mit Inhalten aus der DB **und** aus dem externen ICS-Feed ([`calendar.ts:38`](src/lib/content/calendar.ts#L38) → `body`). Aktuell ist das nicht ausnutzbar, weil `rehype-raw` nicht verwendet wird und HTML dadurch escaped bleibt — eine CSP ist aber die Schicht, die einen künftigen Fehler an dieser Stelle abfängt. Ohne CSP existiert diese Schicht nicht.

`Permissions-Policy` ist hier zusätzlich relevant, weil `<CodeScanner>` die Kamera nutzt: die Freigabe sollte explizit und minimal sein, statt implizit alles zu erlauben.

## Akzeptanzkriterien

**Given** die App läuft im Production-Build
**When** eine beliebige Seite ausgeliefert wird
**Then** enthält die Response `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` und `Permissions-Policy`

**Given** die CSP ist aktiv
**When** ein Nutzer eine News-Detailseite, das Admin-Dashboard, den Kamera-Scanner und eine Seite mit Blob-Bildern öffnet
**Then** funktionieren alle vier ohne CSP-Verstoß in der Browser-Konsole

**Given** die CSP ist aktiv
**When** externe Ressourcen geladen werden (Vercel Blob für Bilder, Neon Auth für Login)
**Then** sind deren Origins explizit in der Policy erlaubt und nicht per Wildcard

### Checkliste

- [ ] `headers()` in `next.config.ts` ergänzen
- [ ] CSP zunächst als `Content-Security-Policy-Report-Only` deployen, Verstöße im Preview sammeln, dann scharf schalten
- [ ] `script-src` mit Nonce oder Hash statt `unsafe-inline` — Next.js benötigt hier Sorgfalt, siehe Next-Doku zu CSP mit Nonce
- [ ] `img-src` um die Vercel-Blob-Domain ergänzen
- [ ] `frame-ancestors 'none'`
- [ ] `Permissions-Policy`: `camera=(self)` für den Scanner, alles Übrige aus
- [ ] Manuell geprüft: News-Detail, Admin, Scanner, Markt-Bilder
- [ ] `pnpm run verify` grün
```

---

## Issue 5 — Dependency-Fixes

- **Titel:** `chore(deps): sharp, postcss patchen und shadcn nach devDependencies verschieben`
- **Labels:** `security`, `chore`, `ready`

```markdown
**Findings F3 + F11 + F15 · High / Medium / Low** — aus dem Sicherheits-Audit vom 2026-08-03.

## Problem

### F3 — `sharp` 0.34.5 (High, Runtime)

`GHSA-f88m-g3jw-g9cj` — geerbte libvips-CVEs (CVE-2026-33327, -33328, -35590, -35591). Patched ab `>=0.35.0`. Kommt transitiv über `next`.

**Real relevant**, weil `sharp` über `next/image` **nutzer-hochgeladene** Bilder verarbeitet (Markt-Anzeigen, News-Cover). Ein manipuliertes Bild trifft damit direkt auf verwundbaren Code.

### F11 — `@hono/node-server` 1.19.15 (Moderate, Runtime)

`GHSA-frvp-7c67-39w9` — Path Traversal in `serve-static` (Windows, encoded Backslash `%5C`). Patched ab `>=2.0.5`.

Kette: `shadcn` → `@modelcontextprotocol/sdk` → `@hono/node-server`. **Ursache ist ein Verpackungsfehler:** `shadcn` ist ein CLI-Werkzeug, steht aber in [`package.json:26`](package.json#L26) unter `dependencies` statt `devDependencies`. Das Verschieben entfernt diesen Fund komplett aus der Runtime — die bessere Lösung als ein Upgrade.

### F15 — `postcss` 8.4.31 (High ×2, Moderate ×1)

`GHSA-6g55-p6wh-862q` (Arbitrary File Read via `sourceMappingURL`), `GHSA-r28c-9q8g-f849` (Path Traversal beim Source-Map-Autoload), `GHSA-qx2v-qp2m-jg93` (XSS im Stringify-Output). Patched ab `>=8.5.18`.

**Real geringes Risiko**: greift nur, wo PostCSS *fremdes* CSS verarbeitet — hier nur eigenes CSS zur Build-Zeit. Trivial mitzunehmen.

## Akzeptanzkriterien

**Given** die Dependencies sind aktualisiert
**When** `pnpm audit --audit-level high` läuft
**Then** erscheinen `sharp`, `postcss` und `@hono/node-server` nicht mehr in der Ausgabe

**Given** `shadcn` steht in `devDependencies`
**When** ein Production-Build erzeugt wird
**Then** gelingt `pnpm build` und `@hono/node-server` ist nicht mehr Teil des Production-Dependency-Baums

**Given** die Upgrades sind eingespielt
**When** `pnpm run verify` und ein Production-Build laufen
**Then** sind beide grün und Bild-Rendering (`next/image`) sowie Tailwind-Ausgabe funktionieren unverändert

### Checkliste

- [ ] `shadcn` von `dependencies` nach `devDependencies` verschieben
- [ ] `sharp` auf `>=0.35.0` heben — ggf. per `pnpm.overrides`, da transitiv über `next`
- [ ] `postcss` auf `>=8.5.18` heben — ebenfalls ggf. per Override
- [ ] `pnpm audit --audit-level high` prüfen: nur noch die better-auth-Kette offen (separates Issue)
- [ ] Production-Build + Bild-Rendering manuell verifiziert
- [ ] `pnpm run verify` grün

> **Hinweis:** `brace-expansion` (`GHSA-mh99-v99m-4gvg`, high) bleibt bewusst offen — reine Dev-Dependency über `eslint`, kein Laufzeitrisiko. Wenn es beim Upgrade kostenlos mitkommt, gern mitnehmen.
```

---

## Issue 6 — CI: Vulnerability-Scan & Dependabot

- **Titel:** `ci: Dependency-Vulnerability-Scan und Dependabot einrichten`
- **Labels:** `security`, `chore`, `ready`

```markdown
**Finding F14 · Low (aber Ursache für alle Dependency-Findings)** — aus dem Sicherheits-Audit vom 2026-08-03.

## Problem

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) führt `format:check`, `typecheck`, `lint`, `test` und `dup` aus — **kein `pnpm audit`**. Es existiert auch kein `.github/dependabot.yml`.

Dass sich **1 critical und 11 high** Advisories ansammeln konnten, ohne dass es auffiel, ist die direkte Folge. Ohne diesen Schritt wiederholt sich der Zustand nach dem Aufräumen aus dem Dependency-Issue innerhalb weniger Monate.

## Akzeptanzkriterien

**Given** ein Pull Request wird geöffnet
**When** die CI läuft
**Then** existiert ein Schritt, der `pnpm audit` ausführt und dessen Ergebnis im Log sichtbar ist

**Given** eine neue Dependency mit `high`- oder `critical`-Advisory kommt hinzu
**When** die CI läuft
**Then** ist das Ergebnis sichtbar, ohne dass der Build für bekannte, bewusst akzeptierte Findings dauerhaft rot bleibt (Allowlist oder `continue-on-error` mit Kommentar — Entscheidung im PR begründen)

**Given** Dependabot ist konfiguriert
**When** eine Dependency ein Sicherheitsupdate erhält
**Then** öffnet Dependabot automatisch einen PR gegen `develop`

### Checkliste

- [ ] `pnpm audit --audit-level high` als CI-Step ergänzen — Platzierung nach `test`, analog zum bestehenden nicht-blockierenden `dup`-Step
- [ ] Entscheidung dokumentieren: blockierend oder informativ. Empfehlung: blockierend ab `high`, mit expliziter Allowlist für die bewusst offenen Funde (`brace-expansion`, better-auth-Kette solange Neon nicht nachgezogen hat)
- [ ] `.github/dependabot.yml` anlegen: `package-ecosystem: npm`, `directory: /`, wöchentlich, Ziel `develop`
- [ ] `github-actions`-Ecosystem in Dependabot mit aufnehmen (Actions sind ebenfalls Supply Chain)
- [ ] CI-Lauf auf einem Test-PR grün bzw. mit erwarteter Ausgabe verifiziert
```

---

## Issue 7 — Blob-Upload härten

- **Titel:** `security: Blob-Upload-Pfad serverseitig normalisieren und Größe begrenzen`
- **Labels:** `security`, `bug`, `backend`, `ready`

```markdown
**Finding F8 · Medium** — aus dem Sicherheits-Audit vom 2026-08-03.

## Problem

[`src/components/feature/markt/actions.ts:104`](src/components/feature/markt/actions.ts#L104) und [`src/components/feature/admin-news/actions.ts:129`](src/components/feature/admin-news/actions.ts#L129)

Beide Token-Ausgaben sind korrekt berechtigungsgeprüft (`requireMeeple()` bzw. `hasPermission("posts:write")`) und beschränken `allowedContentTypes` auf `image/png|jpeg|webp` mit `addRandomSuffix: true`. Zwei Lücken bleiben:

1. **`pathname` kommt ungeprüft vom Client.** In [`src/lib/utils/use-blob-upload.ts:24`](src/lib/utils/use-blob-upload.ts#L24) baut der Client `${pathPrefix}/${file.name}`, der Server signiert das unverändert. Ein Mitglied kann per direktem Server-Action-Aufruf einen beliebigen Pfad signieren lassen und den vorgesehenen Prefix verlassen — etwa in den `posts/`-Namespace schreiben, obwohl es nur Markt-Rechte hat. `addRandomSuffix: true` verhindert das Überschreiben bestehender Blobs, nicht das Ablegen am fremden Ort.
2. **Kein `maximumSizeInBytes`.** Ein Mitglied kann beliebig große Dateien hochladen → Kostenschaden statt Datenschaden.

## Akzeptanzkriterien

**Given** ein Mitglied ruft `getMarketListingUploadToken` mit `pathname = "posts/../../evil.png"` oder `"posts/foo.png"` auf
**When** das Token erzeugt wird
**Then** ist der signierte Pfad auf den für diese Action vorgesehenen Prefix normalisiert (`markt/<basename>`), nicht der vom Client gelieferte

**Given** ein Nutzer versucht eine Datei über dem Limit hochzuladen
**When** der Upload läuft
**Then** lehnt Vercel Blob ihn anhand von `maximumSizeInBytes` ab und die UI zeigt eine verständliche Fehlermeldung

**Given** ein regulärer Upload innerhalb des Limits
**When** ein Mitglied ein Markt-Bild bzw. ein Admin ein News-Cover hochlädt
**Then** funktioniert der Upload wie bisher

### Checkliste

- [ ] Prefix serverseitig setzen: `pathname` auf `${erwarteterPrefix}/${basename(pathname)}` normalisieren, Prefix nicht vom Client übernehmen
- [ ] `maximumSizeInBytes` in beiden `generateClientTokenFromReadWriteToken`-Aufrufen (Vorschlag: 8 MB, an den Bildbedarf angepasst)
- [ ] Fehlerfall in `useBlobUpload` sinnvoll an die UI durchreichen — die aktuelle Sammel-Meldung verschluckt die Ursache
- [ ] DRY prüfen: die Normalisierung gehört einmal nach `src/lib/utils/`, nicht zweimal in die Feature-Actions
- [ ] Tests: Prefix-Escape wird normalisiert, Übergröße abgelehnt, Happy Path
- [ ] `pnpm run verify` grün
```

---

## Issue 8 — Klarnamen-Preisgabe in der Gast-Action

- **Titel:** `security: Gast-Action gibt Klarnamen für beliebige eventId heraus`
- **Labels:** `security`, `bug`, `backend`, `ready`

```markdown
**Finding F10 · Medium** — aus dem Sicherheits-Audit vom 2026-08-03.

## Problem

[`src/components/feature/guest-area/actions.ts:60`](src/components/feature/guest-area/actions.ts#L60) — `getGuestGameDetail(eventId, boardGameId)`

Die Action ist bewusst unauthentifiziert (ADR 0005, im Code dokumentiert) — das ist nicht das Problem. Das Problem: sie gibt `attendingExplainers` mit `displayName` zurück, und **beide Parameter sind frei wählbar**. Es wird nicht geprüft, ob `eventId` ein aktuelles, öffentliches Event ist.

Ein unauthentifizierter Aufrufer kann so über beliebige Event-IDs Klarnamen von Mitgliedern samt ihrer Anwesenheit auslesen. Das sind personenbezogene Daten — DSGVO-relevant, und zusätzlich ein Anwesenheitsprofil über die Zeit.

## Akzeptanzkriterien

**Given** ein unauthentifizierter Aufrufer
**When** er `getGuestGameDetail` mit einer `eventId` aufruft, die kein aktuell laufendes, öffentliches Event ist
**Then** gibt die Action `null` zurück und gibt keine Mitgliedsdaten heraus

**Given** ein Gast im Gastbereich eines laufenden Events
**When** er ein Spiel scannt und die Detailansicht öffnet
**Then** sieht er die Erklärer wie bisher — jedoch nur mit dem für Gäste vorgesehenen Namensumfang

**Given** die Änderung ist umgesetzt
**When** entschieden wird, welcher Namensumfang für Gäste gilt
**Then** ist die Entscheidung dokumentiert (Vorname statt vollem Klarnamen, oder unveränderter `displayName` als bewusste Abwägung — dann in ADR 0005 nachtragen)

### Checkliste

- [ ] `eventId` validieren: läuft das Event aktuell und ist es öffentlich? Bestehende Helfer in [`src/lib/events/`](src/lib/events/) prüfen, statt eine eigene Query zu schreiben
- [ ] Gleiche Prüfung für `lookupGuestGame` erwägen — dort werden zwar keine Personendaten zurückgegeben, aber der Bestand ist ebenfalls unauth. enumerierbar
- [ ] Entscheidung zum Namensumfang treffen und in ADR 0005 festhalten
- [ ] Tests: fremde/abgelaufene `eventId` → `null`, laufendes Event → Daten
- [ ] `pnpm run verify` grün
```

---

## Issue 9 — Kleinere Härtung

- **Titel:** `security: ICS-Feed-Größe begrenzen und Preview-Tier-Cookie auf Secure setzen`
- **Labels:** `security`, `chore`, `ready`

```markdown
**Findings F13 + F12 · Low** — aus dem Sicherheits-Audit vom 2026-08-03. Zwei kleine, unabhängige Härtungen.

## F13 — ICS-Feed ohne Größenlimit

[`src/lib/content/calendar.ts:57`](src/lib/content/calendar.ts#L57)

    const icsText = await response.text();
    return parseCalendarEvents(icsText, options);

Kein Cap auf die Antwortgröße, danach `ical.parseICS()` über den gesamten String.

Kein SSRF — die URLs stammen aus `PUBLIC_CALENDAR_ICS_URL` / `ICS_FEED_URL_INTERNAL`, nie aus Nutzereingabe — und die Quelle ist Google Calendar. Risiko daher gering. Aber: `fetchIcsFeed` fängt bewusst alle Fehler ab (`catch { return [] }`), damit ein Feed-Ausfall die Seite nicht bricht. Ein OOM fängt es **nicht** ab. Ein kompromittierter oder umgezogener Feed kann den Render-Prozess über Speicher erschöpfen.

## F12 — Preview-Tier-Cookie ohne `Secure`

[`src/components/feature/admin-preview-tier/actions.ts:21`](src/components/feature/admin-preview-tier/actions.ts#L21) — `httpOnly` und `sameSite: "lax"` sind gesetzt, `secure: true` fehlt.

Keine Privilege Escalation: `setPreviewTier` verlangt `realTier === "admin"` und validiert gegen `TIER_ORDER`, die Vorschau kann Rechte nur **herabsetzen**. Reines Cookie-Hardening.

## Akzeptanzkriterien

**Given** ein ICS-Feed liefert eine übergroße Antwort
**When** `fetchIcsFeed` sie liest
**Then** bricht die Funktion nach dem Limit ab und gibt `[]` zurück, ohne den Prozess zu belasten — das bestehende „never throws"-Verhalten bleibt erhalten

**Given** ein Admin setzt einen Preview-Tier
**When** das Cookie gesetzt wird
**Then** trägt es `secure: true` zusätzlich zu `httpOnly` und `sameSite: "lax"`

**Given** beide Änderungen sind umgesetzt
**When** Kalenderansichten (öffentlich und intern) und der Tier-Umschalter genutzt werden
**Then** funktionieren sie unverändert

### Checkliste

- [ ] Größenlimit in `fetchIcsFeed` — z. B. `Content-Length` prüfen und den Body-Stream nach N Bytes abbrechen (Vorschlag: 5 MB)
- [ ] `secure: true` in `setPreviewTier`
- [ ] Test: übergroße Antwort → `[]`, normale Antwort → Events
- [ ] `pnpm run verify` grün
```

---

## Issue 10 — Neon Auth klären

- **Titel:** `security: better-auth-Advisories und fehlendes Rate Limiting mit Neon Auth klären`
- **Labels:** `security`, `bug`, `backend`, `blocked`, `needs-refinement`
- **Board-Spalte:** `Blocked`

```markdown
**Findings F1 + F4 · Critical / High — blockiert durch offene Klärung** — aus dem Sicherheits-Audit vom 2026-08-03.

> ⚠️ **Dieses Issue beginnt mit einer Recherche, nicht mit Code.** Beide Findings hängen an der serverseitigen Neon-Auth-Konfiguration, die aus diesem Repo **nicht** ablesbar ist. Erst klären, dann umsetzen.

## F1 — `better-auth` 1.4.18 mit 1 critical + 8 high Advisories

`better-auth` steht in `devDependencies`, ist über `@neondatabase/auth` (0.4.2-beta) aber **auch Runtime-Dependency** — `pnpm audit` weist es als `dev: false` aus. Benötigt wird `>=1.6.22`.

Die meisten Advisories betreffen die Plugins `oidcProvider`, `mcp` und `organization`, die dieses Projekt nicht nutzt — sie sind **latent, nicht akut**. Akut ist einer:

- **`GHSA-g38m-r43w-p2q7` (high) — Account-Takeover via OAuth-Auto-Link auf eine unverifizierte, vorregistrierte E-Mail.** Genau die hier produktive Kombination: Credentials-Login und Google SSO laufen parallel (ADR 0002).

Weitere ggf. relevante Funde, abhängig davon, was Neon serverseitig aktiviert hat:

- `GHSA-qq9h-g4jm-xgf3` (high) — Pre-Account-Hijacking über Magic-Link / E-Mail-OTP
- `GHSA-wxw3-q3m9-c3jr` (moderate) — OAuth-Callback akzeptiert `state`-Mismatch ohne PKCE
- `GHSA-2vg6-77g8-24mp` (low) — Sessions überleben Nutzerlöschung. **Teilweise abgefedert**: `anonymiseMeeple` löscht Sessions per Raw-SQL ([`admin-mitglieder/actions.ts:90`](src/components/feature/admin-mitglieder/actions.ts#L90))
- `GHSA-pw9m-5jxm-xr6h` (**critical**) — Refresh-Token-Replay, fehlende Client-Auth in `oidcProvider`/`mcp`. Latent, solange diese Plugins nicht aktiv sind

Die Version ist über `@neondatabase/auth` gepinnt und wird serverseitig von Neon gemanagt — eine lokale Versionsanhebung allein löst es nicht.

## F4 — Kein Rate Limiting

Projektweit kein Treffer für `rateLimit`/`throttle`. Betroffen:

- [`src/app/api/auth/[...path]/route.ts`](src/app/api/auth/) — Login. Credential Stuffing unbegrenzt. **Neon Auth bringt möglicherweise serverseitige Limits mit — statisch nicht verifizierbar.**
- [`registrieren/actions.ts`](src/components/feature/registrieren/actions.ts) → `redeemInvite`, unauthentifiziert per Design. Token-Entropie ist mit `randomBytes(24)` (192 bit) unbrute-forcebar; das Finding ist die fehlende Bremse für automatisierte Versuche, nicht das Raten des Tokens.
- [`admin-bank/actions.ts`](src/components/feature/admin-bank/actions.ts) → `revealIban`, berechtigt aber unbegrenzt: ein kompromittierter `bank:read`-Account kann in Sekunden alle IBANs einzeln abziehen. `logBankDataAccess` erkennt das nachträglich, verhindert es nicht.

## Akzeptanzkriterien

**Given** die Klärung mit Neon bzw. im Neon-Dashboard ist erfolgt
**When** die Ergebnisse festgehalten werden
**Then** ist dokumentiert: (a) welche better-auth-Version Neon Auth serverseitig fährt, (b) welche Plugins aktiv sind, (c) ob PKCE erzwungen wird, (d) ob und mit welchen Grenzen Login-Rate-Limiting existiert, (e) ob `GHSA-g38m-r43w-p2q7` in dieser Konfiguration greift

**Given** `GHSA-g38m-r43w-p2q7` greift in dieser Konfiguration
**When** die Gegenmaßnahme umgesetzt ist
**Then** kann ein Google-SSO-Login **nicht** automatisch auf einen bestehenden Account mit unverifizierter E-Mail verlinken

**Given** Neon Auth stellt kein Login-Rate-Limiting bereit
**When** die Gegenmaßnahme umgesetzt ist
**Then** greift ein eigenes Limit auf dem Login-Pfad, und wiederholte Fehlversuche werden gebremst statt nur protokolliert

**Given** ein Konto mit `bank:read`
**When** `revealIban` in kurzer Folge sehr häufig aufgerufen wird
**Then** greift eine Bremse, und der Vorgang ist über `logBankDataAccess` nachvollziehbar

### Checkliste

- [ ] **Zuerst:** Neon-Auth-Konfiguration klären (Version, Plugins, PKCE, Rate Limits) und Ergebnis hier als Kommentar dokumentieren
- [ ] Prüfen, ob `pnpm.overrides` auf `better-auth >=1.6.22` mit `@neondatabase/auth` 0.4.2-beta funktioniert, oder ob ein Update von `@neondatabase/auth` selbst nötig ist
- [ ] `@neondatabase/auth` ist eine **Beta**-Version (0.4.2-beta) — Eignung für Produktion mitbewerten
- [ ] Account-Verlinkungsverhalten bei Google SSO prüfen und ggf. auf verifizierte E-Mails beschränken
- [ ] Rate Limiting entscheiden: Neon-seitig vorhanden → dokumentieren; nicht vorhanden → eigenes Limit (Login, `redeemInvite`, `revealIban`)
- [ ] Nach der Klärung ggf. in eigenständige Umsetzungs-Issues aufteilen
- [ ] `pnpm run verify` grün
```
