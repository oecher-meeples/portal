# Code- & Architektur-Audit — 2026-11-17

**Repo:** oecher-meeples-portal · **Branch:** `develop` · **Head:** `6e5d00a` (nach Merge von Epic #490 / PR #517)
**Stack:** Next.js 16 (App Router, Server Actions, kein `cacheComponents`) · React 19 · TypeScript 5 · Prisma (Postgres, `adapter-pg`) · Tailwind v4 · vitest · Docker-Self-Hosting
**Vorheriger Bericht:** [2026-08-03_AUDIT_CODE.md](2026-08-03_AUDIT_CODE.md)

**Tooling-Ergebnis:**

| Befehl                                    | Ergebnis                                                         | Vorher (08-03) |
| ----------------------------------------- | ---------------------------------------------------------------- | -------------- |
| `pnpm run typecheck`                      | ✅ Exit 0                                                         | ✅             |
| `pnpm run lint`                           | ✅ Exit 0, keine Warnungen                                        | ✅             |
| `pnpm run dup` (jscpd)                    | ⚠️ **9 Klone**, 253 Zeilen (0,37 %)                               | 0              |
| `npx madge --circular` (1054 Dateien)     | ⚠️ **12 Zyklen** — 11 reine `import type`, 1 Laufzeit-Zyklus      | 0              |

Lint, Typecheck und Layer-Zonen sind weiter sauber, die Codebasis ist aber seit August um knapp das Doppelte gewachsen (317 → 610 analysierte Dateien) und dabei an drei Stellen gedriftet: **Server-Action-Autorisierung**, **Wiederverwendung der dokumentierten Bausteine** (`useAction`, `Field`, `NativeSelect`) und **Skalierung von Listen/Bildern**. Vier High-Findings, alle selbst am Code gegengelesen.

> **Hinweis zum Scope:** Findings 1–3 sind sicherheitsrelevant und gehören formal zu `/security-audit`. Sie wurden hier als Nebenfund der Architektur-Prüfung (Guard-Konsistenz) entdeckt und verifiziert — wegen ihrer Schwere stehen sie trotzdem oben.

---

## Abgleich mit dem Vor-Audit (2026-08-03)

| Vor-Finding | Status |
| --- | --- |
| #42 `ZUSTAND`-Map doppelt | ✅ behoben — keine fremden Label-/Tone-Maps für die gelisteten Pills gefunden |
| #43 Ludothek-Actions ohne `revalidatePath` | ✅ behoben (`board-games.ts:221-223`) |
| #44 `getAllContent()` ohne `where`/`select` | ✅ behoben — paginiert mit `take`/`cursor` (`content.ts:83-104`) |
| #45 `useAction()` neu erfunden | ⚠️ **wieder offen** — alte Stellen behoben, aber neue Kopien (u. a. im #490-Code), siehe Finding 9 |
| #46 Fetch-Timeouts / Indizes | ✅ Timeouts überall gesetzt (BGG, ICS, Instagram, MyMemory, YouTube, UPC); Ausnahme `legal/pdf-extract.ts:10` (Low) |
| #47 `cn()` / Debug-Log / `!`-Env | ✅ Debug-Log + `process.env.X!` weg; ⚠️ neue Template-Literal-Klassen (Finding 21) |
| F5 `CoverMedia` rohes `<img>`, kein `remotePatterns` (→ #28) | ❌ **weiterhin offen und verschärft** → jetzt High, Finding 5 |

---

## Issues (angelegt 2026-11-17, alle `ready`, Board „oecher meeples portal")

| Issue | Findings | Stand 2026-11-19 |
| --- | --- | --- |
| #519 | 1, 2, 5 — Bring&Buy-Actions: Auth, verschluckte Redirects, Guard-Reihenfolge | ✅ gemergt (PR #530) |
| #520 | 3 — Mitwirkende-Admin O(N²) | ✅ #535 `6f1e201` |
| #521 | 4 — CoverMedia → `next/image` + `remotePatterns` (Entscheidung im Refinement) | ✅ #535 `3097885` |
| #522 | 6, 7 — Guard-Konsolidierung, `PermissionKey` | ✅ #535 `d6ce50a` |
| #523 | 8 — Coverage-Glob | ✅ #535 `65f6446` |
| #524 | 9, 19 — `useAction`/`NativeSelect`/`Field`, `post-form`-Zerlegung | ✅ #535 `84e0e8e` |
| #525 | 10, 12 — `React.cache`, `ensureMeeple`, Doppel-Refresh | ✅ #535 `ddd1924` |
| #526 | 11, 13 — Detailseite + Display-Mapping | ✅ #535 `caa1fd7` |
| #527 | 14 — duplizierte Fachlogik | ✅ #535 `d075402` |
| #528 | 15 — Logik aus `feature/scan`, `contact-dialog` | ✅ #535 `d4c5d01` |
| #529 | 16 (+ Teile 23) — dynamische Imports | ✅ #535 `ac50531` (Markdown `/news` offen) |
| #461 (ergänzt) | 17 — Ludothek-Serialisierung | ⏳ offen |
| #513 (bestehend) | 18 — jscpd-Klone | ⏳ offen — 7 Klone, davon 1 durch #520 erledigt |

### Stand nach dem Sprint (2026-11-19, PR #535)

Umgesetzt: Findings 1–16, 18 (teilweise), 19. **Offen, ohne Issue:**

- **Finding 17** (Ludothek-Serialisierung) — hängt an #461.
- **Finding 18** — 7 jscpd-Klone bleiben (#513).
- **Finding 20** — Domänenwissen in `lib/utils` (`format.ts`-Labels, `nav-config`-Permission-Sets, Mailer-Ort).
- **Finding 21** — Hygiene (Template-Literal statt `cn()`, Datum an `format.ts` vorbei, stilles Write-Catch in `bringbuy/actions.ts`, `unit-label-sheet` Deps, `oauth-state` leeres Secret, toter Code, Mini-Dateien). Erledigt daraus: „Abbrechen"-Button der Mitwirkenden-Zeile (#520).
- **Finding 22** — Tag-`displayName` als Auflöseschlüssel.
- **Finding 23** — Rest: Dashboard-/Statistik-Queries, sequentielle Writes, `react-markdown` in `/news` (Bundle 570 → 547 kB, Markdown bleibt), `page_views`-Retention, `pdf-extract` ohne Timeout, ungeschütztes `verifyLinkedEventOrUnpublish`. Erledigt: `qrcode`/ZXing lazy (#529).
- **Finding 24** — Doku-Drift, `app/**` nicht in der lib-Lint-Zone. Erledigt daraus: Plural-Tag-Labels (#527).
- **Empfehlung weiterhin:** `/security-audit` über alle `"use server"`-Dateien; Findings 6/7 sind nun als Input umgesetzt (`action-guards.ts`).

## Prioritized Findings

| #  | Finding | Dimension | Schwere | Aufwand | Nutzen |
| -- | ------- | --------- | ------- | ------- | ------ |
| 1  | `own-items.ts`: `"use server"`-Actions ohne jede Auth, Verkäufer nur per `.bind` | Architektur (Sicherheit) | **High** | S | sehr hoch |
| 2  | `redirect()` aus `requireMeeple()` wird in catch-all-Blöcken verschluckt → „NEXT_REDIRECT" in der UI | Statisch | **High** | S | hoch |
| 3  | Mitwirkende-Admin rendert O(N²) `<option>`-Knoten | Performance | **High** | S | hoch |
| 4  | Ludothek-Raster lädt BGG-`__original`-Bilder eager, ohne `next/image` | Performance | **High** | S–M | hoch |
| 5  | Guard-Reihenfolge / ungeschützte Lese-Action in `bringbuy/actions.ts` | Statisch (Sicherheit) | Medium | S | hoch |
| 6  | Mitgliedsstatus + 12-h-Admin-Session nur in Page-Guards, nicht in Actions | Architektur | Medium | M | hoch |
| 7  | ~28 Guard-Helfer mit abweichender Semantik, Permission-Keys als freie Strings | Architektur | Medium | M | mittel |
| 8  | Coverage-Glob `components/**/actions.ts` erfasst 25 `*-actions.ts` nicht | Architektur | Medium | S | mittel |
| 9  | `useAction()` / `<Field>` / `<NativeSelect>` erneut umgangen (inkl. #490-Code) | Statisch | Medium | M | mittel |
| 10 | Auth-/Permission-Lookups ohne `React.cache()`, `ensureMeeple` schreibt pro Request | Performance | Medium | S | mittel |
| 11 | Spiel-Detailseite baut den kompletten Bestand (`buildLudothekGames()` + `find`) | Performance | Medium | M | mittel |
| 12 | Doppeltes Server-Render nach Mutation (`revalidatePath` + `router.refresh()`) | Performance | Medium | S | mittel |
| 13 | Board-Game-Display-Mapping 3× nahezu identisch (`query`/`private-collection`/`admin-bestand-rows`) | Statisch | Medium | M | mittel |
| 14 | Kleinere Duplikate in `lib/`: `escapeHtml` 3×, Unit-Kettenaufstieg 4×, Profil-Revalidate 6×, ContentType-Labels 3× | Architektur | Medium | S | mittel |
| 15 | Geschäftslogik in `feature/scan/` + Entity lädt selbst Daten (`contact-dialog`) | Architektur | Medium | S | mittel |
| 16 | `@zxing` statisch im öffentlichen Ludothek-Bundle | Performance | Medium | S | mittel |
| 17 | Ludothek-Übersicht serialisiert alle Exemplare inkl. `description`/`notes` | Performance | Medium | M | mittel |
| 18 | jscpd-Klone (9) und 12 madge-Zyklen | Statisch | Low | S | mittel |
| 19 | God-Komponente `post-form.tsx` (22 `useState`) | Architektur | Low–Med | M | mittel |
| 20 | Domänen-Labels in `lib/utils/format.ts`, Permission-Sets in `nav-config.ts` | Architektur | Low | S | niedrig |
| 21 | Hygiene: Template-Literal-Klassen, `toLocaleDateString`, stilles `.catch(()=>{})`, `eslint-disable` mit falschen Deps | Statisch | Low | S | niedrig |
| 22 | Tag-`displayName` als Auflöseschlüssel ohne Eindeutigkeit | Architektur | Low | S | niedrig |
| 23 | Kleinere Perf-Punkte (Dashboard/Statistik in JS, Upserts in Schleifen, Bundle `react-markdown`/`qrcode`, Retention) | Performance | Low | S–M | niedrig |
| 24 | Doku-Drift `docs/project-structure.md`, Lint-Zone `lib` → `app` fehlt | Architektur | Low | S | niedrig |

---

## 1. Architektur-Audit

Maßstab: [CLAUDE.md](../../CLAUDE.md), [docs/project-structure.md](../../docs/project-structure.md), [CONTEXT.md](../../CONTEXT.md).

### Finding 1 — `own-items.ts`: Server Actions ohne Autorisierung (High / S) ✔ gegengelesen

[src/lib/bringbuy/own-items.ts](../../src/lib/bringbuy/own-items.ts) ist `"use server"` und exportiert `createOwnFleaMarketItem` (Z. 32), `updateOwnFleaMarketItem` (Z. 69) und `listOwnFleaMarketItems` (Z. 119) — **keine** davon ruft `requireMeeple`/`requireMember`/einen Token-Check auf. Die Verkäufer-Identität wird ausschließlich in der Seite fixiert:

- [src/app/events/[slug]/verkauf/page.tsx:37-38](../../src/app/events/[slug]/verkauf/page.tsx#L37-L38) — `createOwnFleaMarketItem.bind(null, event.id, sellerRef)`
- analog `src/app/bringbuy/verkaeufer/[token]/page.tsx:40-41`

Der Kommentar in `own-items.ts:64-68` nimmt an, `.bind` sei serverseitig „fest". Gebundene Argumente werden aber an den Client serialisiert und beim Aufruf zurückgeschickt; jede Server Action ist zudem per direktem POST erreichbar (`node_modules/next/dist/docs/01-app/02-guides/data-security.md`, Abschnitt „Server Actions" — Auth-Check gehört in jede Action). **Folge:** Artikel im Namen beliebiger `sellerMeepleId`/`externalSellerId` anlegen, fremde PENDING-Artikel ändern; die Marktöffnung (`isBringAndBuyMarketOpen`) prüft nur die Seite.

**Fix:** In der Action selbst die Identität auflösen — `requireMeeple()` für Mitglieder bzw. Token als Argument + `findExternalSellerByToken()` erneut prüfen; Marktöffnung in `createOwn…`/`updateOwn…` prüfen; reine Lesefunktionen (`listOwnFleaMarketItems`, `findExternalSellerByToken` in `external-sellers.ts:73`) in eine Datei **ohne** `"use server"` verschieben.

### Finding 6 — Mitgliedsstatus/Admin-Session-Frische nur in Page-Guards (Medium / M)

`requireMember()`/`requireAdminPermission()` ([src/lib/auth/session.ts:117-150, 168-213](../../src/lib/auth/session.ts#L117-L150)) prüfen ausgetreten/anonymisiert bzw. die 12-h-Admin-Session. Server Actions nutzen überwiegend `requirePermission`/`hasPermission` ([permissions.ts:52](../../src/lib/auth/permissions.ts#L52)) — `requireMember()` kommt in den 69 `"use server"`-Dateien nur 3× vor. Laut `ausgetreten-role.ts:6-10` behält ein Ausgetretener Zusatzrollen (z. B. „Vorstand") und kann damit Actions aufrufen, deren Seiten ihn abweisen. Außerdem: `app/admin/bank/page.tsx:16` (IBAN-Seite!) nutzt `requirePermission` statt `requireAdminPermission`; `app/admin/einheiten/page.tsx:30-37` hat einen eigenen Guard.

**Fix:** Ein Action-Guard `requireActionPermission(key)` = Mitgliedsstatus + Permission; Bank- und Einheiten-Seite auf `requireAdminPermission`.

### Finding 7 — Guard-Wildwuchs, Permission-Keys untypisiert (Medium / M)

Drei fast gleichnamige Guards für `games:manage` mit unterschiedlicher Semantik: `lib/ludothek/permissions.ts:4` (gibt `null` zurück), `lib/ludothek/storage-units.ts:13` (Redirect + Meeple), `feature/admin-settings/board-game-trait-texts-actions.ts:8` (lokal, Redirect + User). `requireMembersManage` existiert 3× (`admin-mitglieder/actions.ts:31`, `member-actions.ts:22`, `admin-settings/tshirt-size-actions.ts:13`), `requireManagePermission` 3× (`lib/downloads/actions.ts:14`, `lib/legal/actions.ts:28`, `lib/links/actions.ts:13`). Insgesamt ~28 Guard-Funktionen. Permission-Keys sind freie Strings (`"admin:access"` 20× außerhalb von Tests) — Seed und Code stimmen heute überein (21 Keys gegen `prisma/seed-roles.ts` geprüft), ein Tippfehler fiele aber erst zur Laufzeit auf.

**Fix:** Pro Rückgabe-Semantik genau ein Helfer in `lib/auth/`; `PermissionKey`-Union-Typ, aus dem auch der Seed liest. Zusammen mit Finding 6 umsetzen.

### Finding 8 — Coverage-Scope erfasst die meisten Feature-Actions nicht (Medium / S)

[vitest.config.ts:27](../../vitest.config.ts#L27): `include: ["src/lib/**", "src/components/**/actions.ts"]`. CLAUDE.md/`project-structure.md:205` versprechen Coverage für „Server Actions" — der Glob trifft aber nur Dateien namens exakt `actions.ts`. **25 `"use server"`-Dateien** fallen heraus, u. a. `admin-events/shift-actions.ts`, `mitglied-profil/stammdaten-actions.ts`, `scan/inventory-actions.ts`, `widgets/private-collection/private-collection-actions.ts`.

**Fix:** Glob `src/components/**/*actions.ts`, Baseline neu messen, Schwelle ggf. auf Basis der neuen Messung setzen (analog #38).

### Finding 14 — Duplizierte Fachlogik in `lib/` (Medium / S)

- **Unit-Kettenaufstieg** mit Tiefenlimit 20 4×, `MAX_UNIT_CHAIN_DEPTH` 2× separat: `lib/events/guest-area.ts:23,48`, `lib/ludothek/holdings-lookup.ts:17,60,245`, `app/admin/einheiten/page.tsx:12-27` (Literal `20`, gleiches `" → "`-Format wie `holdings-lookup.ts:72`). → `walkUnitChain`/`unitChainLabel` in `lib/ludothek/`.
- **Profil-Revalidate** (Slug laden → `revalidatePath('/profil/${slug}')`) 6× in zwei Varianten: `mitglied-profil/{bankverbindung,kalender-token,stammdaten,meeple-daten,meeple-profile-picture}-actions.ts`, `lib/members/pending-change-actions.ts:21`. → `revalidateMemberProfile()` in `lib/members/`.
- **ContentType-Labels** 3×: `admin-news/admin-news-view.tsx:44-49`, `admin-news/post-form.tsx:36-41`, `entities/content-type-badge.tsx:3-9`; `guest-area-view.tsx:29` kopiert `EXPLAINER_EXPERIENCE_LEVEL_LABELS` untypisiert. → `CONTENT_TYPE_LABELS` nach `lib/content/content-types.ts`.
- **`escapeHtml`** 3× identisch: `members/pending-change-mail.ts:4-9`, `selbstauskunft-mail.ts:7-12`, `year-turn-cron.ts:113-118` (maskiert `"` nicht, wird aber in `href` genutzt — heute harmlos, Token ist hex). → `lib/utils/escape-html.ts`.
- **IBAN-Reveal-Actions** 2× (`mitglied-profil/bankverbindung-actions.ts:28-43` vs. `admin-bank/actions.ts:20-28`) — Kommentar begründet Kopie mit Cross-Feature-Verbot; laut CLAUDE.md gehört geteilter Code dann nach `lib/`.
- Kleinere: `PUBLIC_SITE_URL ?? ""` 7×, CRON_SECRET-Prüfung 3× (`app/api/cron/*/route.ts:6-17`), Vor-/Nachname-Verkettung 5×, `BoardGameKind`-Labels 2× in Widgets.

### Finding 15 — Fehlplatzierte Logik (Medium / S)

- [feature/scan/game-issue-labels.ts:6-12](../../src/components/feature/scan/game-issue-labels.ts#L6-L12) + [inventory-actions.ts:30-60](../../src/components/feature/scan/inventory-actions.ts#L30-L60): Statusübergang `ACTIVE↔MAINTENANCE` (sonst nirgends geschrieben) und das Label als Präfix im persistierten Feld `condition` — Geschäftsregel + Datenformat in `components/feature`. `kind` vom Client wird nicht validiert. → `lib/ludothek/`, `kind` per Whitelist.
- [entities/contact-dialog.tsx:73-75](../../src/components/entities/contact-dialog.tsx#L73-L75) lädt per dynamischem `import()` eine Server Action nach — Entities betreiben laut `project-structure.md:114` keine Datenbeschaffung; der dynamische Import entzieht sich zudem der Lint-Prüfung. → nach `widgets/` oder Daten im Aufrufer auflösen.

### Finding 19 — God-Komponente `post-form.tsx` (Low–Medium / M)

[feature/admin-news/post-form.tsx:65-107](../../src/components/feature/admin-news/post-form.tsx#L65-L107): 22 `useState`, eigenes `isSubmitting`/`setError` (Z. 93-94), sieben Verantwortlichkeiten (Formular, Vorschau, Cover, Umfrage, Instagram-Retry, Newsletter, Entwurf kopieren). Weitere echte Teilungskandidaten (Komplexität, nicht nur Länge): `admin-mitglieder/vereinsmitglieder-table.tsx` (382 Z., Einrücktiefe 38), `widgets/game-holding/game-holding-panel.tsx` (374 Z., 10 State), `feature/scan/scan-view.tsx` (≈400, am Limit). Lang, aber flach/unkritisch: `lib/ludothek/holdings.ts`, `lib/bgg/client.ts`, `lib/ludothek/browser.ts`.

**Fix:** `post-form` in Abschnitts-Hooks (`usePostSurvey`, `usePostInstagram`) oder Reducer zerlegen, Submit via `useAction`.

### Finding 20 — Domänenwissen in `lib/utils` (Low / S)

[lib/utils/format.ts:5-6,13-26,143-160](../../src/lib/utils/format.ts#L5-L26) enthält `MEMBERSHIP_STATE_LABELS`, `INVITE_STATUS_LABELS`, `EXPLAINER_…`, `FLEA_MARKET_…` und importiert Typen aus `lib/members/*`. Da `components/ui` `format.ts` importieren darf (`ui/date-picker.tsx`, `date-range-picker.tsx`), ist `ui` transitiv an Domänentypen gekoppelt — Lint sieht das nicht (nur direkte Importe, nur Typen). Das erzeugt auch madge-Zyklus 1 (`format → invites → invite-format → format`). Analog liegen Seiten-Permission-Sets in [lib/utils/nav-config.ts:130-152](../../src/lib/utils/nav-config.ts#L130-L152), laut Kommentar „per Hand synchron zu halten". Weitere Domänenkopplung: `members ↔ ludothek` beidseitig, `ANONYMER_MEEPLE_NAME` in `lib/ludothek/`, Mailer in `lib/newsletter/` als Querschnitt für auth/members/bringbuy.

**Fix:** Labels in ihre Domänen (`lib/members/labels.ts` …), Permission-Sets nach `lib/auth/`, `anonymer-meeple` → `lib/members`, Mailer → `lib/mail/`.

### Finding 22 — Tag-`displayName` als Auflöseschlüssel (Low / S)

[lib/ludothek/taxonomy/tags.ts:79-85](../../src/lib/ludothek/taxonomy/tags.ts#L79-L85) löst beim Editor-Speichern Tags über `displayName` auf; `displayName` ist nicht eindeutig (`schema.prisma:1003`), der Admin-Rename (`tag-admin-actions.ts:9-23`) prüft keine Kollision. Zwei Tags mit gleichem deutschen Namen → beim nächsten Speichern wird still einer entfernt (`findFirst` nach `bggId asc`). Widerspricht `CONTEXT.md:98` („Anzeigenamen nicht als Schlüssel"). **Fix:** Eindeutigkeit je `type` beim Rename prüfen oder Editor überträgt Tag-IDs.

### Finding 24 — Doku-Drift, Lint-Lücke (Low / S)

`docs/project-structure.md`: `:179` „31 Ordner … `profil`" (real 37, `mitglied-profil`); `:191` nennt nicht existierendes `brand-watermark`; `:206` enthält den Streutext `test-pr-marker`; im lib-Baum fehlen `admin/`, `downloads/`, `explainer/`, `feedback/`, `notifications/`, `upc-lookup/`, `youtube/`; ~15 board-game-Widgets, `profil-panels/` u. a. fehlen. `src/data/` (`LEGAL_DOCS` u. a.) liegt außerhalb des Schichtmodells ohne Lint-Zone. [eslint.config.mjs:81-86](../../eslint.config.mjs#L81-L86): lib-Zone sperrt `src/components/**`, nicht `src/app/**` (heute 0 Verstöße, Lücke aber offen). `components/feature/admin-tags/tag-admin-row.tsx` (64 Z., 1 Importeur) verletzt die <100-Zeilen-Regel; `admin-tags-view.tsx:16-20` definiert Plural-Enum-Labels lokal.

### Verifiziert unauffällig

- **`import/no-restricted-paths` aktiv und vollständig** ([eslint.config.mjs:42-89](../../eslint.config.mjs#L42-L89)): Schichtzonen aus `LAYERS` generiert, Feature-Isolation dynamisch pro Ordner, `ui → lib/<domäne>` gesperrt, `max-lines` 400 aktiv, TS-Resolver kennt `@/`, Lint läuft in CI.
- **Eigener Import-Scan: 0 Layer-Verstöße.** Keine `../`-Importe, keine Barrels, keine Imports aus `src/app`, dynamische Imports sauber (Ausnahme Finding 15).
- **Kein `eslint-disable`** für `import/no-restricted-paths` oder `max-lines`.
- **Tags-Epic #490:** Schreib-/Leseseite getrennt (`tags.ts`/`tags-read.ts`), Admin-Action per `games:manage`, Route per `requireAdminPermission`, gemeinsames `upsertTaxonomyEntry`, Doku `project-structure.md:55-56` aktuell.
- Alle Bausteine der CLAUDE.md-Tabelle existieren; keine direkten `navigator.clipboard`-, S3-Command- oder `process.env.X!`-Aufrufe.

### Verworfen nach Prüfung

- `feature/lfg/actions.ts` mit 16 Prisma-Operationen — laut `project-structure.md:182` erlaubt; Statusregel kommt aus `lib/content/lfg.ts`.
- `kuendigungsstatus-select.tsx:14` `STATE_LABELS` — bewusst abweichend, keine Kopie.
- `bgg-id.ts` `parseMechanics`/`formatMechanics` nach Tag-Cutover — wird noch genutzt.

---

## 2. Performance-Audit

**Caching-Ausgangslage:** kein `cacheComponents`, kein `"use cache"`/`unstable_cache`, kein `force-dynamic`. `src/app/layout.tsx:35` ruft `headers()` für die CSP-Nonce → alle Routen dynamisch (bewusst, nötig). Damit gilt `caching-without-cache-components.md`.

### Finding 3 — Mitwirkende-Admin rendert O(N²) DOM (High / S) ✔ gegengelesen

[admin-contributors-view.tsx:126](../../src/components/feature/admin-contributors/admin-contributors-view.tsx#L126) gibt jeder Zeile `allRows={rows}`; [contributor-admin-row.tsx:32,109-120](../../src/components/feature/admin-contributors/contributor-admin-row.tsx#L109-L120) rendert in **jeder** Zeile, immer (nicht erst im Bearbeiten-Modus), ein `<select>` mit allen N−1 anderen Einträgen. `visible` ist nicht begrenzt. Bei 1.000 Mitwirkenden ≈ 1 Mio. `<option>`-Knoten; wächst mit jedem BGG-Import. Neu aus #490.

**Fix:** Merge-Ziel erst nach Klick auf „Zusammenführen" wählen — ein einziger geteilter Dialog/Combobox mit Suche (`entities/meeple-combobox.tsx` als Vorbild).

### Finding 4 — BGG-Originalbilder eager im Ludothek-Raster (High / S–M) ✔ gegengelesen

[src/components/ui/cover-media.tsx:48-55, 68-75](../../src/components/ui/cover-media.tsx#L68-L75): rohes `<img>` ohne `loading`, `decoding`, `width`/`height`; im ganzen `src/` kein einziges `loading=`; [next.config.ts](../../next.config.ts) ohne `images`. **Verschärfung gegenüber 08-03:** `imageUrl` ist BGGs `image`-Feld ([bgg/client.ts:354](../../src/lib/bgg/client.ts#L354)) = die `__original`-Datei (159 Treffer in `prisma/seed-data/demo-games.ts`), und die Ludothek ist nicht paginiert → jeder Aufruf lädt alle Cover in voller Auflösung sofort.

**Fix:** (a) sofort `loading="lazy" decoding="async"` in `CoverMedia`; (b) dann `next/image` mit `fill`/`sizes` + `remotePatterns` für `cf.geekdo-images.com` und S3-Host (sharp ist im Standalone-Build vorhanden) **oder** beim Import zusätzlich BGGs `thumbnail` speichern (`collection.ts:41` kennt das Feld). Löst auch Vor-Audit F5 / #28.

### Finding 10 — Auth-Lookups ohne `React.cache()`, Upsert pro Request (Medium / S) ✔ gegengelesen

- [components/layout/app-shell.tsx:28](../../src/components/layout/app-shell.tsx#L28) ruft für jeden eingeloggten Request `ensureMeeple(user)` = `prisma.meeple.upsert({ update: { displayName } })` ([lib/members/meeples.ts:31-38](../../src/lib/members/meeples.ts#L31-L38)) — mit `updatedAt @updatedAt` ein echter Write pro Seitenaufruf; Pages wie `app/ludothek/page.tsx:47` lösen über `getCurrentMeeple()` einen zweiten aus.
- `getSessionData()` (`lib/auth/server.ts:60-75`) nicht memoisiert; `hasPermission` je Key ein eigener `count`. `AppShell` braucht drei Query-Wellen (~9 Queries), `/ludothek` legt ~7 **sequentielle** Auth-Queries obendrauf (`app/ludothek/page.tsx:31-52`); danach laufen unabhängige Loads ebenfalls nacheinander (`:54-80`).

**Fix:** `cache()` um `getSessionData`, `getUserPermissionKeys`, `ensureMeeple`; `hasPermission` aus den gecachten Keys; `ensureMeeple` nur schreiben, wenn Datensatz fehlt oder `displayName` sich ändert; unabhängige Loads in `Promise.all`.

### Finding 11 — Detailseite baut den ganzen Bestand (Medium / M)

[app/ludothek/[slug]/page.tsx:57-58](../../src/app/ludothek/[slug]/page.tsx#L57-L58): `buildLudothekGames()` (alle Exemplare mit Titel, Contributors, Tags, Holdings, Units, Explainer-`groupBy`, LFG) und dann `find` per Slug; bei Fehltreffer zusätzlich alle Privatsammlungen (`:71`). Gleiches Muster in `lib/events/guest-area.ts:243`. **Fix:** `buildLudothekGames({ where })` parametrisieren.

### Finding 12 — Doppeltes Server-Render nach Mutationen (Medium / S)

`useAction` ruft standardmäßig `router.refresh()` ([ui/use-action.ts:34](../../src/components/ui/use-action.ts#L34), 42 Nutzer); die meisten Actions rufen zusätzlich `revalidatePath` (z. B. `tag-admin-actions.ts:20-22`, `board-games.ts:221-223`), was laut `revalidatePath.md:19` in Server Functions die UI bereits sofort aktualisiert. Jede Mutation → zwei Server-Renders (auf `/ludothek` 2× Finding 10 + 17). **Fix:** `refresh` in `useAction` default `false`, nur für Actions ohne Revalidate aktivieren — oder pro Aufruf `refresh: false`.

### Finding 16 — `@zxing` statisch im Ludothek-Bundle (Medium / S)

[ui/use-code-scanner.ts:2-3](../../src/components/ui/use-code-scanner.ts#L2-L3) importiert `@zxing/browser` + `@zxing/library` statisch; Pfad `code-scanner.tsx` → `scan-search-dialog.tsx:14` → `ludothek-browser.tsx:14,122` — damit im JS der **öffentlichen** Ludothek, auch ohne Scanner-Nutzung. (08-03 als Low notiert; seit der Scan-Suche auf der öffentlichen Seite Medium.) **Fix:** `next/dynamic(() => import("…/code-scanner"), { ssr: false })` im Dialog-Inhalt.

### Finding 17 — Ludothek-Übersicht serialisiert den Bestand (Medium / M)

[lib/ludothek/query.ts:46-67](../../src/lib/ludothek/query.ts#L46-L67) lädt per `include` alle Skalarfelder inkl. `description`/`notes`; [app/ludothek/page.tsx:124-125](../../src/app/ludothek/page.tsx#L124-L125) übergibt die Liste an den Client-Baum, ohne Pagination. Such-State rendert alle Karten inkl. `groupGamesByTitle` (`ludothek-results.tsx:92`) bei jedem Tastendruck neu, jede Debounce-Pause triggert per `router.replace` eine volle Server-Neuberechnung. Bei Vereinsgröße akzeptabel, wächst linear. **Fix:** `select` nur Kartenfelder, `description` serverseitig kürzen, `LudothekResults` memoisieren; langfristig paginieren.

### Finding 23 — Kleinere Performance-Punkte (Low)

- Dashboard lädt alle offenen Holdings des Vereins mit vollem `gameCopy`, um die eigenen zu zählen ([app/dashboard/page.tsx:34-39](../../src/app/dashboard/page.tsx#L34-L39)); `getInternalContent()` (`:33`) ohne Limit.
- Statistiken laden die gesamte Holding-Historie und aggregieren in JS ([app/statistiken/page.tsx:16-32](../../src/app/statistiken/page.tsx#L16-L32)) → `groupBy` wie in `analytics/queries.ts`.
- Tag-/Contributor-Writes: 1–3 sequentielle Queries pro Eintrag in interaktiver Transaktion (`taxonomy/tags.ts:45-48, 76-92`, `contributors.ts:39, 79-84`) — bei entfernter DB Nähe zum 5-s-Default-Timeout möglich (nicht gemessen). → `findMany({ in })` + `createMany`.
- Einzel-Queries in Import-Schleifen: `admin-bringbuy/import-actions.ts:31-46`, `admin-mitglieder/invite-actions.ts:118-121`.
- `react-markdown`+`remark-gfm` im Client-Bundle von `/news` (über `content-timeline-entry.tsx:65`); `qrcode` statisch im Layout-Bundle (`layout/meeple-qr-dialog.tsx:4`).
- `page_views` ohne Retention; `newsletter_dispatch_jobs` ohne `status`-Index.
- `legal/pdf-extract.ts:10` fetch ohne `AbortSignal`; `news/actions.ts:47` `verifyLinkedEventOrUnpublish` ist unauthentifiziert und löst bis zu zwei ungecachte ICS-Fetches aus (Missbrauchs-Verstärker → auch Thema für `/security-audit`).

### Verifiziert unauffällig

- Externe Fetches mit Timeout + Cache (BGG 24 h/1 h, ICS 15 min + Größenlimit) — Vor-Audit #46 erledigt.
- `buildLudothekGames` ohne N+1 (Bulk per `groupBy`/`in`).
- Tag-Lesepfade: schlankes `TAG_LINKS_INCLUDE`, `BoardGameTag` mit `@@id` + `@@index([tagId])`, `resolveBggTagLabels` eine Query; Admin-Tag-Seite nutzt `_count` + `useMemo`.
- Analytics gruppiert in der DB; Dashboard-Queries parallel per `Promise.all`; Prisma-Singleton.

### Verworfen nach Prüfung

- „Fehlende `revalidatePath`" in `admin-news/actions.ts`, `scan/inventory-actions.ts` — alle Routen dynamisch, kein Server-Cache, kein Stale-Risiko.
- `headers()` im Root-Layout — für CSP-Nonce nötig.
- Sequentielle Schleifen in Bulk-Import/Queues/Cron — bewusst (BGG-Throttle, Cron-Kontext).
- N+1 in Notifications-Schleife — `AUTOMATED_NOTIFICATIONS` ist leer.

---

## 3. Statische Code-Analyse

### Finding 2 — `redirect()` in catch-all verschluckt (High / S) ✔ gegengelesen

`requireCashierRights()` ([lib/bringbuy/actions.ts:18-30](../../src/lib/bringbuy/actions.ts#L18-L30)) und `requireAusleiheShift()` rufen `requireMeeple()`, das bei fehlender Session `redirect("/login")` wirft ([lib/members/meeples.ts:47-52](../../src/lib/members/meeples.ts#L47-L52)). Die umgebenden Blöcke fangen alles:

- [lib/bringbuy/actions.ts:41-44](../../src/lib/bringbuy/actions.ts#L41-L44), `:75-78`, `:98-101`, `:131-134`, `:177-180` — `catch (error) { return { error: (error as Error).message }; }`
- `components/feature/admin-bringbuy/import-actions.ts:17-21`
- `components/feature/event-ausleihe/ausleihe-actions.ts:51-60` (`toResult`) mit Guards darin (Z. 150-207)

Abgelaufene Session → statt Login-Redirect erscheint „NEXT_REDIRECT" als Fehlermeldung; zusätzlich landen rohe Prisma-Fehlertexte in der UI. `unstable_rethrow`/`isRedirectError` kommt im Repo **nirgends** vor.

**Fix:** In jedem catch zuerst `unstable_rethrow(error)` (`next/navigation`), oder Kassen-/Schicht-Guard nicht-werfend bauen (Muster `requireGamesManagePermission` → `null`). `(error as Error).message` durch `instanceof`-Narrowing + generische Meldung ersetzen. Die doppelte `toResult` (`ausleihe-actions.ts:51` vs. `lib/ludothek/holding-actions-shared.ts:72`) dabei zusammenführen.

### Finding 5 — Guard-Reihenfolge / ungeschützte Lese-Action (Medium / S) ✔ gegengelesen

- [lib/bringbuy/actions.ts:32-45](../../src/lib/bringbuy/actions.ts#L32-L45) (`approveFleaMarketItem`) und `:68-73` (`setFleaMarketItemStatus`): `findUnique` **vor** dem Guard — verstößt gegen `docs/coding-guidelines.md` §3.1 („Guard ist die erste Zeile"), erlaubt Existenz-Probing.
- [lib/bringbuy/actions.ts:216](../../src/lib/bringbuy/actions.ts#L216) `listReservedFleaMarketCarts` — exportiert aus `"use server"`, ohne Guard; aktuell nur aus `app/admin/bringbuy/page.tsx:58` aufgerufen.

**Fix:** Guard nach oben; Lese-Query in `lib/bringbuy/queries.ts` (ohne `"use server"`).

### Finding 9 — Dokumentierte Bausteine erneut umgangen (Medium / M)

- **`useAction()`:** [admin-contributors/contributor-admin-row.tsx:16, 25-47](../../src/components/feature/admin-contributors/contributor-admin-row.tsx#L25-L47) (neu aus #490, eigener `ActionResult`, kein `catch` → Fehler unsichtbar; die Schwester `admin-tags/tag-admin-row.tsx:20` nutzt `useAction` korrekt). Ohne `try/finally` (pending bleibt bei Exception hängen): `ludothek/explainer-game-panel.tsx:29-62`, `admin-events/shift-table-editor.tsx:98-170` (Ergebnis von `deleteShift` Z. 145 ignoriert), `widgets/board-game/edit-board-game-dialog.tsx:39-71`, `widgets/profil-panels/resign-membership-panel.tsx:18-30`, `admin-news/post-form.tsx:93-94`.
- **`<NativeSelect>`:** nur 3 Nutzer, 31 rohe `<select className="border-input bg-background …">`, u. a. `contributor-admin-row.tsx:109-121`; `SELECT_CLASSNAME` doppelt in `admin-events/shift-table-editor.tsx:45` und `shift-table-section.tsx:33`. Vorher klären: die meisten rohen Selects sind `h-9 rounded-md px-3`, `NativeSelect` ist `h-8 rounded-lg px-2.5` → `size`-Variante per `cva` ergänzen.
- **`<Field>`/`<TextField>`:** 29 handgebaute `flex flex-col gap-1.5` + `<Label>` in 13 Dateien, u. a. `admin-contributors-view.tsx:78-118` (3×, die parallele `admin-tags-view.tsx` nutzt `Field` korrekt), `registrieren/register-form.tsx` (5×), `admin-news/post-form.tsx:194-238` (5×).
- Die beiden Admin-Register-Seiten (Tags/Mitwirkende) sind strukturell eine Kopie (StatTiles + Suche + 2 Filter + „x von y" + Liste) → ggf. `AdminRegisterPage`-Skelett in `widgets/`.

### Finding 13 — Board-Game-Display-Mapping dreifach (Medium / M)

Die Abbildung BoardGame → Anzeige (~20 Felder + `tagLabelsByType`/`contributorNamesByRole`/`versionDisplay`) steht fast gleich in [lib/ludothek/query.ts:120-145](../../src/lib/ludothek/query.ts#L120-L145), [private-collection.ts:180-202](../../src/lib/ludothek/private-collection.ts#L180-L202), [admin-bestand-rows.ts:272-290](../../src/lib/ludothek/admin-bestand-rows.ts#L272-L290). #490 musste `TAG_LINKS_INCLUDE` + `tagLabelsByType` in alle drei (plus `board-games.ts:255`) einbauen — genau das Drift-Risiko. `tagLabelsByType` (`taxonomy/tags-read.ts:23-37`) und `contributorNamesByRole` (`contributors-read.ts:19-33`) sind zudem strukturell identisch. **Fix:** `BOARD_GAME_DISPLAY_SELECT` + `boardGameDisplayFields()` in `lib/ludothek/`; gemeinsamer `groupUniqueSorted()`.

### Finding 18 — jscpd-Klone und Zyklen (Low / S)

**jscpd (9):** `ui/date-picker.tsx` ↔ `ui/date-range-picker.tsx` (3 Klone, 77+40+16 Zeilen — größter Brocken), `entities/meeple-combobox.tsx` ↔ `member-combobox.tsx` (32 Z.), `lib/members/create-member.ts` ↔ `update-member.ts` (2 Klone), `admin-bestand/assign-shelf-to-event-view.tsx` ↔ `bulk-relocate-scan-view.tsx`, `import-flea-market-items-dialog.tsx` ↔ `import-invites-dialog.tsx`, `app/api/cron/market-digest` ↔ `year-turn` (CRON_SECRET, siehe Finding 14). CLAUDE.md-Zielzustand ist 0. `dup` ist nicht Teil von `verify` — darum unbemerkt gewachsen.

**madge (12):** 11 sind `import type` von Kind → Eltern-View (`admin-bringbuy`, `admin-events`, `downloads`, `ludothek/game-detail-view`, `rechtliches`) bzw. `format.ts ↔ members` und `bgg/client ↔ explainer-videos` — zur Laufzeit wirkungslos, aber Zeichen fehlender Typ-Ablage (Typen in eigene `*-types.ts` oder in `lib/`). **Einziger Laufzeit-Zyklus:** `lib/content/calendar.ts → content.ts → termin-posts.ts → calendar.ts`, in `content.ts:132` per dynamischem `import()` entschärft. → `findIcsEventByUid` in ein eigenes Modul ohne `content`-Abhängigkeit.

**Fix:** `dup` in `verify` aufnehmen (oder CI-Schritt mit Schwelle 0) und `madge --circular` als CI-Check ergänzen.

### Finding 21 — Hygiene (Low / S)

- **Template-Literal statt `cn()`:** `ui/bgg-rating-hexagon.tsx:37` (`${className ?? ""}` — Aufrufer können `h-`/`w-` nicht überschreiben), `admin-events/helper-pool-bar.tsx:135-137`, `shift-plan-grid.tsx:183-187`, `shift-plan-editor.tsx:351`, `widgets/board-game/create-board-game-bgg-import-step.tsx:114-116`.
- **Datum an `format.ts` vorbei:** `lib/members/stammdaten.ts:40`, `admin-settings/instagram-connection-view.tsx:42` (`toLocaleDateString("de-DE")` → `formatDatePlain()`).
- **Stilles Write-Catch:** `lib/bringbuy/actions.ts:119-121` `fleaMarketCart.delete(...).catch(() => {})` — schluckt jeden Fehler, nicht nur „bereits gelöscht" → nur P2025 ignorieren oder `deleteMany`.
- **`eslint-disable` mit falschen Deps:** `admin-einheiten/unit-label-sheet.tsx:59` (`exhaustive-deps` ohne Begründung, Deps `[selection]` statt `selected` → QR-Codes bleiben bei geänderten `units` stale).
- `ean-field.tsx:115-135`: Mount-Effekt ohne `.catch` → unbehandelte Rejection; doppelt zu `handleSearch` (`:88-113`).
- `lib/instagram/oauth-state.ts:6`: `BETTER_AUTH_SECRET ?? ""` → HMAC mit leerem Schlüssel möglich → `requireEnv`.
- Toter Code: `entities/download-status-pill.tsx` (0 Importeure).
- `contributor-admin-row.tsx:91-97`: „Abbrechen" als `variant="ghost"` ohne sichtbare Affordance.
- `feature/home/home-view.tsx:37`: Marker „(#TODO)" ohne Issue-Nummer.
- Einmal-Dateien < 100 Zeilen (CLAUDE.md-Regel), klarste Fälle: `entities/survey-deadline-banner.tsx`, `widgets/board-game/{board-game-duplicate-warning,game-card-edit-overlay,invalid-ean-recovery}.tsx`, `downloads/private-downloads-table.tsx`, `entities/{blob,neon}-storage-usage-card.tsx` (zusätzlich fast identisch → eine `<StorageUsageCard>`).

### Verifiziert unauffällig

- **Produktivcode ohne** `: any`, `as any`, `@ts-ignore`, `@ts-expect-error`, `process.env.X!`. `as unknown as` nur 2× begründet (`lib/utils/prisma.ts:4`, `ui/scan-feedback.ts:14`). Geprüfte `!`-Assertions sind durch `where … not: null` oder frühen Return abgesichert.
- 31 `eslint-disable` im Produktivcode, alle begründet außer `unit-label-sheet.tsx:23,59` und `use-board-game-duplicate-guard.ts:57` (Begründung im Kommentar darüber).
- Kein `console.log`/`debug`; einziges `console.info` (`newsletter/mailer.ts:80`) ist gewolltes Logging bei SMTP-aus.
- Keine TODO/FIXME/HACK-Marker in `src/` (Treffer in `prisma/seed-data/demo-legal-documents.ts` sind Demo-Inhalt).
- Clipboard, S3, Kontaktlinks, Pill-Tones ausschließlich über die dokumentierten Bausteine.
- Read-Catches mit Fallback (localStorage, `JSON.parse`, URL-Parsing, `calendar.ts:130` …) sind legitim; `passwort-vergessen-form.tsx:40` leerer Catch bewusst (Enumeration-Schutz).

---

## Was gut funktioniert

- **Die Layer-Architektur hält auch bei verdoppelter Codebasis.** 0 Layer-Verstöße, 0 Cross-Feature-Reach-ins, keine `../`-Importe, keine Barrels, kein einziges `eslint-disable` gegen `no-restricted-paths` oder `max-lines` — die dynamisch generierten Zonen decken alle 37 Feature-Ordner automatisch ab.
- **Vor-Audit konsequent abgearbeitet.** Fünf von sechs Issues (#42–#47) sind nachhaltig erledigt — Timeouts und Paginierung sind seitdem Standard, nicht nur an den damals gemeldeten Stellen.
- **Typ-Disziplin ist hoch.** Kein `any`/`ts-ignore` im Produktivcode, Typecheck und Lint grün, Server Actions folgen durchgängig `{ error } | { success: true as const }`.
- **Der Tags-Epic #490 ist architektonisch sauber geschnitten** — getrennte Lese-/Schreibseite, gemeinsamer `upsertTaxonomyEntry`, Admin korrekt geschützt, Doku aktuell, Bestandsdaten-Migration vor dem Spalten-Drop. Die #490-Findings (3, 9, 13, 22) liegen in der UI-Schicht der Mitwirkenden-Seite und im Display-Mapping, nicht im Domänenmodell.
- **Bewusste Performance-Entscheidungen sind im Code begründet** (Bulk-Queries in `query.ts`, Promise.all im Dashboard, sequentielle Loops wegen BGG-Throttle) — deshalb waren mehrere Verdachte verwerfbar.

## Empfohlene Reihenfolge

1. **Sofort (S, Sicherheit):** Finding 1 + 2 + 5 — gemeinsam in `lib/bringbuy/`, eine PR. Danach `/security-audit` für einen systematischen Durchgang über alle 69 `"use server"`-Dateien (Findings 6/7 als Input).
2. **Schnelle Performance-Gewinne (S):** Finding 3, 4 (Schritt a), 10, 12, 16.
3. **Guard-Konsolidierung (M):** Finding 6 + 7, danach Finding 8 (Coverage-Glob) — damit die neuen Guards auch gemessen werden.
4. **DRY-Runde (M):** Finding 9, 13, 14, 18 + `dup`/`madge` in CI.
5. **Rest bei Gelegenheit:** 11, 15, 17, 19–24.
