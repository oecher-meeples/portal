# Sicherheits-Audit — Oecher Meeples Portal

- **Datum:** 2026-08-03
- **Branch / Stand:** `app-akademie` @ `525f40f`
- **Vorheriger Bericht:** keiner — dies ist der erste Sicherheits-Audit dieses Repos.
- **Art:** statische Analyse (Dependencies + Code-Level). Kein dynamisches Pentesting.

## Angriffsfläche (Ergebnis der Vorprüfung)

| Aspekt                            | Vorhanden? | Konsequenz für dieses Audit                                            |
| --------------------------------- | ---------- | ---------------------------------------------------------------------- |
| Backend / API-Routen              | ja         | 4 Route Handler + 25 Server-Action-Dateien → Auth/Autorisierung prüfen  |
| Persistente Datenhaltung          | ja         | Prisma + Neon Postgres, personenbezogene Daten inkl. IBAN              |
| Auth / Session                    | ja         | Neon Auth (Managed Better Auth), permission-basiertes RBAC             |
| Traffic zu Drittanbietern         | ja         | Meta Graph API, Google Calendar (ICS), BGG (XML), Vercel Blob          |
| Einlesen unvertrauenswürdiger Daten | ja       | ICS-Feeds, BGG-XML, CSV-Import, Datei-Uploads                          |
| Client-seitiges Berechtigungsmodell | nein     | keine Mobile-/Browser-Permission-Manifeste → Abschnitt entfällt        |
| Selbstverwaltete Server-Infra     | nein       | Vercel-Deployment → OS-/Netzwerk-Härtung nicht im Scope                |

---

## 1. Priorisierte Findings

Sortiert nach Schweregrad × Aufwand. `S` = Schweregrad, `A` = Aufwand.

| #   | S            | A       | Finding                                                                     | Ort                                             |
| --- | ------------ | ------- | --------------------------------------------------------------------------- | ----------------------------------------------- |
| F1  | **Critical** | mittel  | `better-auth` 1.4.18: 1 critical + 8 high Advisories, u. a. Account-Takeover | `package.json` (dependencies + transitiv)       |
| F2  | **High**     | gering  | Instagram-Access-Token unverschlüsselt in der DB                            | `prisma/schema.prisma:544`                      |
| F3  | **High**     | mittel  | `sharp` 0.34.5: libvips-CVEs, verarbeitet Nutzer-Uploads über `next/image`  | transitiv über `next`                           |
| F4  | **High**     | gering  | Kein Rate Limiting — nirgends (Login, Invite-Einlösung, IBAN-Reveal)        | projektweit                                     |
| F5  | **High**     | gering  | Keine Security-Header / keine CSP konfiguriert                              | `next.config.ts`                                |
| F6  | **Medium**   | trivial | Cron-Secret-Vergleich nicht konstant-zeitig, kein Guard gegen fehlendes Env | `src/app/api/cron/instagram-queue/route.ts:7`   |
| F7  | **Medium**   | trivial | OAuth-State-Cookie ohne `Secure`-Flag, Wert nicht signiert                  | `src/lib/instagram/oauth-state.ts:8,12`         |
| F8  | **Medium**   | gering  | Blob-Upload: Client kontrolliert `pathname` vollständig, kein Größenlimit   | `markt/actions.ts:104`, `admin-news/actions.ts:129` |
| F9  | **Medium**   | gering  | Instagram-Callback ohne eigene Berechtigungsprüfung                         | `src/app/api/auth/instagram/callback/route.ts:23` |
| F10 | **Medium**   | gering  | Unauth. Gast-Action gibt Klarnamen von Mitgliedern für beliebige `eventId` heraus | `guest-area/actions.ts:60`                 |
| F11 | **Medium**   | mittel  | `@hono/node-server` Path Traversal — über `shadcn` in **prod**-Dependencies | `package.json:26`                               |
| F12 | **Low**      | trivial | Preview-Tier-Cookie ohne `Secure`-Flag                                      | `admin-preview-tier/actions.ts:21`              |
| F13 | **Low**      | gering  | ICS-Feed wird ohne Größenlimit gelesen (`response.text()`)                  | `src/lib/content/calendar.ts:57`                |
| F14 | **Low**      | gering  | Keine automatisierte Vulnerability-Prüfung in CI, kein Dependabot           | `.github/workflows/ci.yml`, `.github/`          |
| F15 | **Low**      | trivial | `postcss` 8.4.31: drei Advisories — real nur Build-Zeit relevant            | transitiv über `next`                           |

---

## Stand der Umsetzung (2026-08-04)

13 von 15 Findings behoben. F1 und F4 bleiben laut Plan **absichtlich blockiert** — sie hängen an einer serverseitigen Neon-Auth-Konfiguration, die aus diesem Repo nicht einsehbar ist.

| Finding | Issue | Status |
| --- | --- | --- |
| F1 (critical) | [#61](https://github.com/oecher-meeples/portal/issues/61) | **Blockiert.** Recherche ohne Dashboard-Zugang durchgeführt: better-auth-Version 1.4.18 per Neons eigener Doku bestätigt; der Auto-Linking-Mechanismus hinter `GHSA-g38m-r43w-p2q7` ist über die better-auth-Doku auf eine einzige offene Konfigurationsfrage (`trustedProviders`) eingegrenzt. Braucht Antwort von Neon-Support. |
| F2 (high) | [#54](https://github.com/oecher-meeples/portal/issues/54) | ✅ Behoben — Instagram-Access-Token verschlüsselt |
| F3 (high) | [#56](https://github.com/oecher-meeples/portal/issues/56) | ✅ Behoben — `sharp` gepatcht |
| F4 (high) | [#61](https://github.com/oecher-meeples/portal/issues/61) | **Blockiert**, gleicher Grund wie F1 — kein Rate Limiting umgesetzt, da unklar ist, was Neon Auth serverseitig bereits abdeckt |
| F5 (high) | [#55](https://github.com/oecher-meeples/portal/issues/55) | ✅ Behoben — Security-Header + CSP Report-Only mit Nonce |
| F6 (medium) | [#52](https://github.com/oecher-meeples/portal/issues/52) | ✅ Behoben — Cron-Endpoint fail-closed, konstant-zeitiger Vergleich |
| F7 (medium) | [#53](https://github.com/oecher-meeples/portal/issues/53) | ✅ Behoben — OAuth-State an Session gebunden |
| F8 (medium) | [#58](https://github.com/oecher-meeples/portal/issues/58) | ✅ Behoben — Blob-Upload-Pfad normalisiert, Größenlimit |
| F9 (medium) | [#53](https://github.com/oecher-meeples/portal/issues/53) | ✅ Behoben — Instagram-Callback-Berechtigung (zusammen mit F7) |
| F10 (medium) | [#59](https://github.com/oecher-meeples/portal/issues/59) | ✅ Behoben — Gast-Action prüft `eventId` |
| F11 (medium) | [#56](https://github.com/oecher-meeples/portal/issues/56) | ✅ Behoben — `shadcn` nach `devDependencies` |
| F12 (low) | [#60](https://github.com/oecher-meeples/portal/issues/60) | ✅ Behoben — Preview-Tier-Cookie `Secure` |
| F13 (low) | [#60](https://github.com/oecher-meeples/portal/issues/60) | ✅ Behoben — ICS-Feed-Größenlimit |
| F14 (low) | [#57](https://github.com/oecher-meeples/portal/issues/57) | ✅ Behoben — `pnpm audit` blockierend in CI, Dependabot |
| F15 (low) | [#56](https://github.com/oecher-meeples/portal/issues/56) | ✅ Behoben — `postcss` gepatcht |

Zusätzlich seit dem Audit-Zeitpunkt neu aufgetreten (nicht im ursprünglichen Scan, siehe #57-Kommentar): 8 weitere better-auth-Advisories inkl. eines zweiten kritischen Fundes (`GHSA-pw9m-5jxm-xr6h`, Refresh-Token-Replay) und eine transitiv über `@neondatabase/auth` gezogene `fast-uri`-Schwachstelle. Alle hängen an derselben Neon-Auth-Klärung wie F1 und sind in der CI-Allowlist (`pnpm-workspace.yaml`) explizit benannt, nicht pauschal unterdrückt.

---

## 2. Dependency-Vulnerability-Scan

`pnpm audit` — 1157 Dependencies (782 prod / 281 dev / 137 optional).

**Gesamt: 1 critical · 11 high · 3 moderate · 1 low.**

### 2.1 `better-auth` 1.4.18 → benötigt `>=1.6.22` (F1)

Der Löwenanteil aller Findings. `better-auth` steht in `devDependencies`, ist aber über `@neondatabase/auth` **auch Runtime-Dependency** — `pnpm audit` weist es korrekt als `dev: false` aus. Es landet also im Deployment.

| Advisory              | S        | Betrifft                                                            | Für dieses Projekt relevant?                                                                 |
| --------------------- | -------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `GHSA-pw9m-5jxm-xr6h` | critical | OAuth-Refresh-Token-Replay, fehlende Client-Auth (oidc-provider/mcp) | nur bei aktivem `oidcProvider`/`mcp`-Plugin — hier **nicht** genutzt → latent                |
| `GHSA-g38m-r43w-p2q7` | high     | **Account-Takeover via OAuth-Auto-Link auf unverifizierte E-Mail**   | **ja** — Credentials + Google SSO laufen hier parallel (ADR 0002). Der scharfe Fund.          |
| `GHSA-qq9h-g4jm-xgf3` | high     | Account-Takeover via Pre-Account-Hijacking (magic-link / email-OTP)  | nur bei aktivem Magic-Link/OTP → prüfen, was Neon Auth serverseitig aktiviert hat             |
| `GHSA-9h47-pqcx-hjr4` | high     | `alg=none` beworben, Plain-PKCE akzeptiert (oidcProvider)            | nur bei `oidcProvider` → latent                                                              |
| `GHSA-86j7-9j95-vpqj` | high     | Stored XSS via `javascript:`-`redirect_uri` (oidc-provider/mcp)      | latent                                                                                       |
| `GHSA-7w99-5wm4-3g79` | high     | Concurrent Redemption des Authorization-Code-Grants                 | latent                                                                                       |
| `GHSA-392p-2q2v-4372` | high     | Refresh-Token-Rotation forkt Token-Familie                          | latent                                                                                       |
| `GHSA-fmh4-wcc4-5jm3` | high     | Unautorisierte Einladungsannahme (organization-Plugin)              | organization-Plugin hier nicht genutzt → latent                                               |
| `GHSA-wxw3-q3m9-c3jr` | moderate | OAuth-Callback akzeptiert `state`-Mismatch ohne PKCE                | abhängig von Neon-Auth-Config — nicht statisch verifizierbar, da serverseitig gemanagt        |
| `GHSA-2vg6-77g8-24mp` | low      | Sessions überleben Nutzerlöschung                                   | **ja, teilweise abgefedert** — `anonymiseMeeple` löscht Sessions per Raw-SQL (`actions.ts:90`) |

> **Einordnung:** Die meisten Advisories betreffen `oidcProvider`/`mcp`/`organization`-Plugins, die dieses Projekt nicht nutzt — sie sind latent, nicht akut. **Akut ist `GHSA-g38m-r43w-p2q7`**: Google-SSO-Auto-Link auf eine unverifizierte, vorregistrierte E-Mail erlaubt Account-Takeover, und genau diese Kombination ist hier produktiv.
>
> **Einschränkung:** Die Version ist über `@neondatabase/auth` (0.4.2-beta) gepinnt und wird serverseitig von Neon gemanagt. Ein Upgrade auf `>=1.6.22` ist nicht durch eine lokale Versionsanhebung allein zu erledigen — es hängt an `@neondatabase/auth`. Das ist der Grund für Aufwand „mittel" und muss mit Neon abgeklärt bzw. über ein `pnpm.overrides` evaluiert werden.

### 2.2 Übrige Findings

| Paket               | Installiert | Patched   | S        | Runtime? | Advisory              | Bewertung                                                                                                    |
| ------------------- | ----------- | --------- | -------- | -------- | --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `sharp`             | 0.34.5      | >=0.35.0  | high     | **ja**   | `GHSA-f88m-g3jw-g9cj` | libvips-CVEs (2026-33327/33328/35590/35591). `sharp` verarbeitet über `next/image` **nutzer-hochgeladene** Bilder → realer Pfad. Auto-Fix möglich. |
| `postcss`           | 8.4.31      | >=8.5.18  | high ×2, moderate ×1 | formal ja | `GHSA-6g55-p6wh-862q`, `GHSA-r28c-9q8g-f849`, `GHSA-qx2v-qp2m-jg93` | Arbitrary File Read via `sourceMappingURL` + XSS im Stringify-Output. Greift nur, wo PostCSS **fremdes** CSS verarbeitet — hier nur eigenes CSS zur Build-Zeit. **Real geringes Risiko**, trotzdem trivial per Auto-Fix behebbar. |
| `@hono/node-server` | 1.19.15     | >=2.0.5   | moderate | **ja**   | `GHSA-frvp-7c67-39w9` | Path Traversal in `serve-static` (Windows, `%5C`). Kommt über `shadcn` → `@modelcontextprotocol/sdk`. **`shadcn` ist ein CLI und steht fälschlich in `dependencies`** (`package.json:26`) — nach `devDependencies` verschieben entfernt diesen Fund komplett aus der Runtime. |
| `brace-expansion`   | 1.1.16      | >=1.1.17  | high     | nein (dev) | `GHSA-mh99-v99m-4gvg` | DoS via unbounded expansion. Kette: `eslint-config-prettier` → `eslint` → `minimatch`. **Nur Tooling** — kein Laufzeitrisiko. |

---

## 3. Code-Level-Findings

### F2 — Instagram-Access-Token im Klartext (High)

`prisma/schema.prisma:544`

```prisma
model InstagramConnection {
  accessToken         String   // ← Klartext
```

Geschrieben in `src/app/api/auth/instagram/callback/route.ts:44,48`.

Es handelt sich um ein **Long-Lived Page Access Token** (60 Tage, `getLongLivedToken`) mit `instagram_content_publish` — wer es liest, kann im Namen des Vereins posten. Das Projekt hat mit `src/lib/utils/crypto.ts` (`encryptSecret`/`decryptSecret`) bereits eine korrekte AES-256-GCM-Implementierung für IBANs; der Instagram-Token nutzt sie nicht. Die Inkonsistenz ist das Finding: gleicher Schutzbedarf, ungleicher Schutz. Ein DB-Dump oder ein versehentliches Logging exponiert Publishing-Rechte.

**Empfehlung:** `accessToken` über `encryptSecret()` ablegen, beim Lesen in `src/lib/instagram/queue.ts` entschlüsseln. Kein neues Schlüsselmaterial nötig.

### F4 — Kein Rate Limiting (High)

Projektweit kein Treffer für `rateLimit`/`throttle`. Betroffene Pfade:

- `src/app/api/auth/[...path]/route.ts` — Login. Credential Stuffing unbegrenzt möglich. (Neon Auth bringt evtl. serverseitige Limits mit — **statisch nicht verifizierbar**, muss aktiv geklärt werden.)
- `src/components/feature/registrieren/actions.ts` → `redeemInvite` — unauthentifiziert per Design. Token-Entropie ist mit `randomBytes(24)` (192 bit, `invite-actions.ts:14`) unbrute-forcebar, das Finding ist also nicht Token-Raten, sondern die fehlende Bremse für automatisierte Versuche.
- `src/components/feature/admin-bank/actions.ts` → `revealIban` — berechtigt, aber unbegrenzt: ein kompromittierter `bank:read`-Account kann in Sekunden alle IBANs einzeln abziehen. Das Zugriffsprotokoll (`logBankDataAccess`) erkennt das nachträglich, verhindert es aber nicht.

### F5 — Keine Security-Header / keine CSP (High)

`next.config.ts` enthält ausschließlich `allowedDevOrigins`. Es fehlen `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.

Verstärkend: Das Projekt rendert Markdown (`react-markdown`) mit Inhalten aus DB **und** aus dem externen ICS-Feed (`calendar.ts:38` → `body`). Aktuell ist das ungefährlich (siehe „Verified clean"), aber eine CSP ist die Schicht, die einen künftigen Fehler dort abfängt. Ohne CSP existiert diese Schicht nicht.

### F6 — Cron-Endpoint (Medium)

`src/app/api/cron/instagram-queue/route.ts:7`

```ts
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
```

Zwei Probleme:

1. **Nicht konstant-zeitig.** `!==` auf Strings bricht beim ersten abweichenden Byte ab. Über HTTP mit Vercel-Jitter praktisch schwer auszunutzen, aber die Korrektur (`crypto.timingSafeEqual`) ist trivial.
2. **Kein Guard gegen fehlendes `CRON_SECRET`.** Ist die Variable nicht gesetzt, wird gegen den String `"Bearer undefined"` verglichen — ein Angreifer, der diesen Header sendet, bekommt Zugriff. Der Endpoint löst Instagram-Posts aus **und** löscht Bankdaten-Zugriffsprotokolle (`deleteExpiredBankDataAccessLogs`, Zeile 13) — Letzteres ist ein Audit-Trail. Fail-Closed statt Fail-Open ist hier Pflicht.

**Empfehlung:** Bei fehlendem `CRON_SECRET` mit 500 abbrechen, Vergleich über `timingSafeEqual` mit Längenprüfung.

### F7 — OAuth-State-Cookie (Medium)

`src/lib/instagram/oauth-state.ts:8`

```ts
return `${STATE_COOKIE_NAME}=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`;
```

- **`Secure` fehlt** → Übertragung über HTTP möglich. Auf Vercel greift HSTS-Preload für die Domain nicht automatisch; explizit setzen.
- **Wert ist unsigniert.** `crypto.randomUUID()` ist als Zufallswert in Ordnung, aber der Server verifiziert bei der Rückkehr nur „Cookie == Query-Parameter". Es gibt keine kryptografische Bindung an die Session, die das Cookie gesetzt hat. Bei Cookie-Tossing von einer Subdomain kann ein Angreifer beide Seiten kontrollieren und die CSRF-Prüfung leerlaufen lassen.

### F8 — Blob-Upload (Medium)

`src/components/feature/markt/actions.ts:104` und `src/components/feature/admin-news/actions.ts:129`

Beide Token-Ausgaben sind korrekt berechtigungsgeprüft (`requireMeeple()` bzw. `hasPermission("posts:write")`) und beschränken `allowedContentTypes` auf drei Bildtypen mit `addRandomSuffix: true`. Zwei Lücken bleiben:

1. **`pathname` kommt ungeprüft vom Client.** In `src/lib/utils/use-blob-upload.ts:24` baut der Client `${pathPrefix}/${file.name}`, der Server signiert das unverändert. Ein Mitglied kann per direktem Server-Action-Aufruf einen beliebigen Pfad signieren lassen und damit den vorgesehenen Prefix verlassen (z. B. in den `posts/`-Namespace schreiben, obwohl es nur `markt:` darf). `addRandomSuffix: true` verhindert das Überschreiben bestehender Blobs, nicht das Ablegen am fremden Ort.
2. **Kein `maximumSizeInBytes`.** Ein Mitglied kann beliebig große Dateien hochladen → Kostenschaden statt Datenschaden.

**Empfehlung:** Prefix serverseitig setzen statt vom Client übernehmen (`pathname` auf `${erwarteterPrefix}/${basename(pathname)}` normalisieren) und `maximumSizeInBytes` ergänzen.

### F9 — Instagram-Callback ohne eigene Berechtigungsprüfung (Medium)

`src/app/api/auth/instagram/callback/route.ts:23` prüft ausschließlich `state`. `src/app/api/auth/instagram/connect/route.ts:8` prüft dagegen korrekt `hasPermission(user.id, "instagram:connect")`.

Da der Callback die vereinsweite `InstagramConnection` überschreibt (`findFirst` → Singleton), hängt die gesamte Autorisierung an dem unsignierten State-Cookie aus F7. Defense in Depth: die Berechtigung im Callback erneut prüfen. Kostet zwei Zeilen.

### F10 — Klarnamen-Preisgabe über die Gast-Action (Medium)

`src/components/feature/guest-area/actions.ts:60` — `getGuestGameDetail(eventId, boardGameId)`

Die Action ist bewusst unauthentifiziert (ADR 0005, im Code dokumentiert). Sie gibt jedoch `attendingExplainers` mit `displayName` zurück, und **beide Parameter sind frei wählbar**: es wird nicht geprüft, ob `eventId` ein aktuelles, öffentliches Event ist. Ein unauthentifizierter Aufrufer kann so über beliebige Event-IDs Klarnamen von Mitgliedern samt Anwesenheit auslesen — personenbezogene Daten, DSGVO-relevant.

**Empfehlung:** `eventId` gegen „läuft aktuell / ist öffentlich" validieren; alternativ nur Vornamen ausliefern.

### F12 — Preview-Tier-Cookie ohne `Secure` (Low)

`src/components/feature/admin-preview-tier/actions.ts:21` — `httpOnly`, `sameSite: "lax"`, aber kein `secure: true`.

Keine Privilege Escalation: `setPreviewTier` verlangt `realTier === "admin"` und validiert gegen `TIER_ORDER`, die Vorschau kann Rechte nur **herabsetzen**. Reines Cookie-Hardening.

### F13 — ICS-Feed ohne Größenlimit (Low)

`src/lib/content/calendar.ts:57` — `await response.text()` ohne Cap, danach `ical.parseICS()` über den gesamten String.

Kein SSRF (die URLs stammen aus `PUBLIC_CALENDAR_ICS_URL` / `ICS_FEED_URL_INTERNAL`, nie aus Nutzereingabe) und die Quelle ist Google Calendar. Risiko daher gering — aber ein kompromittierter oder umgezogener Feed kann den Render-Prozess über Speicher erschöpfen. `fetchIcsFeed` fängt Fehler ab (`catch { return [] }`), ein OOM nicht.

### F14 — Keine automatisierte Vulnerability-Prüfung (Low)

`.github/workflows/ci.yml` führt format/typecheck/lint/test/dup aus — **kein `pnpm audit`**. Kein `.github/dependabot.yml`. Dass sich 1 critical und 11 high ansammeln konnten, ohne dass es auffiel, ist die direkte Folge. Ein nicht-blockierender `pnpm audit --audit-level high`-Step plus Dependabot schließt die Lücke.

---

## 4. Verified clean

Geprüft und unauffällig:

- **Keine hartcodierten Secrets** in `src/`, `prisma/`, `scripts/` oder `.github/`. `.env.example` enthält ausschließlich Platzhalter.
- **`.gitignore` deckt `.env*` ab** (mit `!.env.example`). `git log --all --diff-filter=A` über die gesamte History zeigt: außer `.env.example` wurde nie eine `.env`-Datei committed.
- **CI nutzt überhaupt keine Secrets** — kein Inline-Secret, keine falsch referenzierte Variable.
- **AES-256-GCM korrekt implementiert** (`src/lib/utils/crypto.ts`): frischer 12-Byte-IV pro Verschlüsselung via `randomBytes`, Auth-Tag wird gesetzt **und** bei der Entschlüsselung verifiziert, Versionspräfix `v1` für künftige Rotation, IV-/Tag-Längen werden geprüft, Schlüssel ausschließlich aus Env mit 32-Byte-Längenprüfung. Kein ECB, keine statische IV, kein hartcodierter Fallback-Schlüssel.
- **IBAN-Handling** (`crypto.ts:91-146`): mod-97-Prüfsumme nach ISO 13616 plus länderspezifische Längen, Anzeige nie mehr als die letzten vier Stellen. Das Klartext-Feld `ibanLast4` ist in ADR 0003 dokumentiert und bewusst in Kauf genommen — kein unreflektierter Default.
- **Bankdaten-Zugriff ist protokolliert**: `revealIban` und `exportBankDataCsv` schreiben beide `logBankDataAccess`, mit Aufbewahrungs-Cleanup über den Cron-Job.
- **Kein SQL-Injection-Vektor.** Alle vier Raw-SQL-Stellen (`admin-mitglieder/actions.ts:90-92`, `prisma/seed.ts`, `scripts/migrate-boardgames-to-holdings.ts`) nutzen Tagged Templates (`$executeRaw\`…${var}\``) → parametrisiert. Kein `$queryRawUnsafe`/`$executeRawUnsafe` im Repo.
- **Autorisierung konsistent durchgezogen.** Alle 25 `"use server"`-Dateien wurden gelesen: jede mutierende Action läuft über `requirePermission(<key>)`, `requireMeeple()` oder einen lokalen Helfer darüber (`requireBankReader`, `requireCashierRights`, `requireGamesManage`, `requireMembersManage`, `requireActingMeeple`). `hasFleaMarketRights` bindet Kassen-Rechte an eine gebuchte Schicht (ADR 0006). Die einzigen unauthentifizierten Actions sind bewusst so gebaut und im Code begründet: `guest-area/*` (ADR 0005 — siehe F10 für die Einschränkung) und `redeemInvite` (der Invite-Token *ist* das Credential).
- **Keine XSS-Sinks.** Kein `dangerouslySetInnerHTML`, kein `eval`, kein `new Function` im gesamten `src/`. `react-markdown` wird an beiden Einsatzstellen (`post-detail-view.tsx:67`, `post-form.tsx:220`) **ohne `rehype-raw`** verwendet → eingebettetes HTML wird escaped; die Default-`urlTransform` blockt `javascript:`-URLs. Damit ist der Pfad „ICS-Description → `body` → Markdown" aktuell nicht ausnutzbar.
- **Kein Open Redirect.** Keine Verwendung von `searchParams.get("redirect"/"next")` o. Ä.; der Instagram-Callback redirectet auf einen fest kodierten Pfad.
- **Invite-Tokens kryptografisch sicher**: `randomBytes(24).toString("hex")` = 192 bit (`invite-actions.ts:14`). Kein `Math.random()` in sicherheitsrelevantem Code.
- **XML-Parsing ohne XXE.** `fast-xml-parser` v5 (`src/lib/bgg/client.ts:73`) lädt keine externen Entities und verarbeitet kein DOCTYPE — die bekannte XXE-Klasse ist hier nicht anwendbar.
- **Kein SSRF.** Alle ausgehenden Fetches (ICS, Meta Graph, BGG) verwenden Basis-URLs aus Env-Variablen oder Konstanten, nie aus Nutzereingabe zusammengesetzte Hosts.
- **Blob-Uploads inhaltlich beschränkt**: beide Token-Ausgaben setzen `allowedContentTypes` auf `image/png|jpeg|webp` und `addRandomSuffix: true` (Einschränkungen siehe F8).
- **Preview-Tier kann Rechte nicht erhöhen** (`admin-preview-tier/actions.ts:14`): Gate auf `realTier === "admin"`, Allowlist über `TIER_ORDER`.

---

## 5. Nicht abgedeckt

Dieses Audit ist rein statisch. Ausdrücklich **nicht** geprüft:

- **Dynamisches Pentesting einer laufenden Instanz** — Traffic-Interception, Session-Manipulation zur Laufzeit, echte Auth-Bypass-Versuche gegen den deployten Endpoint. Bräuchte eine Preview-Umgebung plus Burp/mitmproxy.
- **Die serverseitige Neon-Auth-Konfiguration.** Neon Auth ist ein *managed* Better-Auth: welche Plugins aktiv sind, ob PKCE erzwungen wird, wie Cookie-Flags gesetzt werden und ob Rate Limiting existiert, ist aus diesem Repo **nicht** ablesbar. Das ist die größte offene Unsicherheit dieses Audits und der Grund, warum F1 und F4 teilweise unbewertet bleiben — beides muss mit Neon bzw. im Neon-Dashboard geklärt werden.
- **Reverse Engineering des Build-Artefakts** — was landet im Client-Bundle, leaken Server-Konstanten in JS-Chunks. Separater Schritt über Bundle-Analyse.
- **Konfiguration der Fremdsysteme** — Neon-Postgres-Netzwerkregeln und Rollen, Vercel-Projekt-Env-Scoping (Preview vs. Production), Vercel-Blob-Store-Zugriff, Berechtigungen der Meta-App, Sichtbarkeit des „internen" ICS-Feeds (die URL ist ein Bearer-Äquivalent — wer sie hat, liest die internen Termine).
- **Klassische Server-Härtung** (OS, Reverse Proxy, TLS-Ciphers) — entfällt, Deployment läuft auf Vercel.
- **Lizenz- und Datenschutz-Compliance** → `/compliance-audit`. F10 berührt DSGVO, ist hier aber nur als technische Preisgabe bewertet, nicht rechtlich.
- **Code-Qualität, Architektur, Performance** → `/code-architecture-audit`.

---

## 6. Empfohlene Reihenfolge

1. **F6, F7, F9, F12** — Härtung, zusammen unter einer Stunde, keine Abhängigkeiten.
2. **F2** — Instagram-Token verschlüsseln; die Bausteine liegen bereits vor.
3. **F5** — Security-Header inkl. CSP in `next.config.ts`.
4. **F14** — `pnpm audit` in CI + Dependabot, damit Punkt 5 nicht wiederkehrt.
5. **F3, F11, F15** — Dependency-Fixes: `sharp` und `postcss` per Auto-Fix, `shadcn` nach `devDependencies`.
6. **F8, F10, F13** — Eingabe-/Ausgabe-Härtung an den Rändern.
7. **F1, F4** — Klärung mit Neon nötig (Better-Auth-Version, Rate Limiting). Zuerst Rückfrage, dann Umsetzung.
