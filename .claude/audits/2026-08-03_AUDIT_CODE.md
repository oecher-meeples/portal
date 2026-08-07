# Code- & Architektur-Audit — 2026-08-03

**Repo:** oecher-meeples-portal · **Branch:** `app-akademie` · **Head:** `525f40f`
**Stack:** Next.js 16 (App Router, Server Actions) · React 19 · TypeScript 5 · Prisma 6.19 (Postgres/Neon) · Tailwind v4 · vitest
**Vorheriger Bericht:** keiner — dies ist der erste Code-Audit-Durchlauf für dieses Repo.

**Tooling-Ergebnis:**

| Befehl                                     | Ergebnis                            |
| ------------------------------------------ | ----------------------------------- |
| `pnpm run typecheck` (`tsc --noEmit`)      | ✅ Exit 0, keine Fehler             |
| `pnpm run lint` (`eslint`)                 | ✅ Exit 0, keine Fehler/Warnungen   |
| `pnpm run dup` (`jscpd src`)               | ✅ 0 Klone                          |
| `npx madge --circular --extensions ts,tsx` | ✅ 0 Zyklen (317 Dateien)           |

Das Repo ist in gutem Zustand: **keine Critical- oder High-Findings.** Die Substanz der Findings sind acht Medium/Low-Punkte — echte technische Schulden, aber keine, die Produktion oder Korrektheit gefährden.

---

## Stand der Umsetzung (2026-08-04)

Alle sechs Findings/Issues sind umgesetzt und geschlossen — kein offener Punkt aus diesem Audit.

| Issue | Finding | Umsetzung |
| --- | --- | --- |
| [#42](https://github.com/oecher-meeples/portal/issues/42) | `GameZustandPill` umgangen | `admin-bestand-view.tsx` nutzt den geteilten Baustein statt einer eigenen Label-/Tone-Map |
| [#43](https://github.com/oecher-meeples/portal/issues/43) | Keine `revalidatePath` in Ludothek-Actions | Ergänzt in `board-games.ts` und `holding-actions.ts`, nur im Erfolgspfad |
| [#44](https://github.com/oecher-meeples/portal/issues/44) | `getAllContent()` lädt `body` unnötig mit | `getInternalContent()` filtert und selektiert jetzt in der DB-Query |
| [#45](https://github.com/oecher-meeples/portal/issues/45) | `useAction()` fünffach neu erfunden | Alle fünf Views auf den geteilten Hook umgestellt, inkl. Kassen-Tabelle mit zeilenweise isoliertem Pending-Zustand |
| [#46](https://github.com/oecher-meeples/portal/issues/46) | Fetch-Timeouts + DB-Indizes fehlen | Timeouts für BGG-/Instagram-/ICS-Fetches, drei `@@index`-Ergänzungen in einer Migration |
| [#47](https://github.com/oecher-meeples/portal/issues/47) | Code-Hygiene (String-Konkatenation, Debug-Log, `!`-Assertions) | `cn()` durchgängig genutzt, Debug-`console.log` entfernt, `requireEnv()`-Helper eingeführt und in `auth/server.ts` verwendet |

Neue geteilte Bausteine aus diesem und dem Compliance-Durchlauf: `requireEnv()` (`src/lib/utils/require-env.ts`) und `deleteBlobs()` (`src/lib/utils/blob-delete.ts`) — beide in der CLAUDE.md-Bausteintabelle und in `docs/project-structure.md` nachgetragen.

---

## Prioritized Findings

| #   | Finding                                                              | Dimension    | Schwere | Aufwand | Nutzen  | Issue          |
| --- | -------------------------------------------------------------------- | ------------ | ------- | ------- | ------- | -------------- |
| 1   | `ZUSTAND_TONE`/`ZUSTAND_LABELS` doppelt — `GameZustandPill` umgangen  | Architektur  | Medium  | S       | hoch    | #42            |
| 2   | Ludothek-Server-Actions ohne `revalidatePath`                        | Performance  | Medium  | S       | hoch    | #43            |
| 3   | `getAllContent()` ohne `where`/`select`/`take`, Filter im JS          | Performance  | Medium  | S       | hoch    | #44            |
| 4   | `useAction()` in 5 Views neu erfunden                                | Architektur  | Medium  | M       | mittel  | #45            |
| 5   | `CoverMedia` nutzt rohes `<img>`, `remotePatterns` fehlt              | Performance  | Medium  | M       | mittel  | Kommentar → #28|
| 6   | Externe Fetches (BGG, Instagram) ohne Timeout                        | Performance  | Low     | S       | mittel  | #46            |
| 7   | `className`-Konkatenation statt `cn()` an 4 bedingten Stellen        | Statisch     | Low     | S       | niedrig | #47            |
| 8   | Debug-`console.log` + ungeprüfte Env-`!`-Assertions                  | Statisch     | Low     | S       | niedrig | #47            |
| 9   | Fehlende Indizes (`Post.*`, `BoardGame.status`, `GameHolding.endedAt`)| Performance  | Low     | S       | niedrig | #46            |

Alle sechs Issues liegen im Projects-Board „oecher meeples portal" in **Backlog**, Labels `chore, ready, auto-generated`. Ausführungsplan: [.claude/plans/2026-08-03_PLAN_AUDIT_CODE.md](../plans/2026-08-03_PLAN_AUDIT_CODE.md).

---

## 1. Architektur-Audit

Maßstab: [CLAUDE.md](../../CLAUDE.md) und [docs/project-structure.md](../../docs/project-structure.md).

### Finding 1 — `ZUSTAND_TONE`/`ZUSTAND_LABELS` doppelt definiert (Medium / S)

`GameZustandPill` trägt den Kommentar _„The one place that knows how a game's Zustand looks"_ — genau diese Map existiert ein zweites Mal wortgleich in einer Feature-View, die dann `StatusPill` direkt rendert.

- [src/components/entities/game-zustand-pill.tsx:3-16](../../src/components/entities/game-zustand-pill.tsx#L3-L16) — die kanonische Definition
- [src/components/feature/admin-bestand/admin-bestand-view.tsx:46-58](../../src/components/feature/admin-bestand/admin-bestand-view.tsx#L46-L58) — identische Kopie
- [src/components/feature/admin-bestand/admin-bestand-view.tsx:198-201](../../src/components/feature/admin-bestand/admin-bestand-view.tsx#L198-L201) — nutzt `StatusPill` statt `GameZustandPill`

**Regelverstoß:** CLAUDE.md listet `<GameZustandPill>` explizit unter „Vor dem Wiedererfinden: diese Bausteine existieren" — _statt eigener Label-/Tone-Map_. Ändert sich ein Label oder Tone an einer Stelle, driftet die andere unbemerkt auseinander; der Typecheck fängt das nicht, weil beide Maps für sich vollständig sind.

**Fix:** Lokale Konstanten löschen, `<GameZustandPill zustand={game.zustand} />` verwenden. Der `StatusPill`-Import in der View wird dadurch evtl. unnötig.

### Finding 4 — `useAction()`-Bookkeeping in 5 Views neu implementiert (Medium / M)

[src/components/ui/use-action.ts:14-47](../../src/components/ui/use-action.ts#L14-L47) kapselt `pending` + `error` + `try/catch` + optionales `router.refresh()`. Fünf Views bauen dasselbe von Hand:

- [src/components/feature/admin-bringbuy/admin-bringbuy-view.tsx:52,60-70](../../src/components/feature/admin-bringbuy/admin-bringbuy-view.tsx#L60-L70) — `runAction()` mit `useTransition` + `setMessage` + `router.refresh()`, funktional deckungsgleich mit `useAction().run`
- [src/components/feature/admin-einheiten/unit-detail-view.tsx:70-100](../../src/components/feature/admin-einheiten/unit-detail-view.tsx#L70-L100) — `handleSave`/`handleRetire` je mit eigenem `isSaving`/`error`
- [src/components/feature/admin-preview-tier/preview-tier-switcher.tsx:18-24](../../src/components/feature/admin-preview-tier/preview-tier-switcher.tsx#L18-L24)
- [src/components/feature/erklaerbaeren/my-explainer-games.tsx:73,86,92](../../src/components/feature/erklaerbaeren/my-explainer-games.tsx#L73)

**Regelverstoß:** CLAUDE.md, erste Zeile der Bausteine-Tabelle: `useAction()` _statt eigenem `isSubmitting`/`setError`/`router.refresh()`_.

**Fix:** Views auf `useAction()` umstellen. Bei `admin-bringbuy` (Aktion pro Tabellenzeile) je Zeile ein eigener `useAction()`-Aufruf, damit `pending` zeilenweise bleibt. jscpd meldet hier bewusst nichts — die Blöcke sind semantisch, nicht textuell identisch.

### Verifiziert unauffällig

- **Layer-Zonen greifen.** `import/no-restricted-paths` in [eslint.config.mjs:23-84](../../eslint.config.mjs#L23-L84) generiert die Zonen live aus dem Dateisystem, neue Feature-Ordner sind automatisch abgedeckt. Stichproben: kein `src/lib/**` importiert aus `src/components/**`, kein `components/ui/**` aus `src/lib/<domäne>`.
- **Keine Cross-Feature-Reach-ins** über alle 29 `feature/*`-Ordner.
- **Keine Umgehung der Regel.** Alle 11 `eslint-disable`-Kommentare betreffen `@next/next/no-img-element`, `react-hooks/*` oder `no-explicit-any` in Tests — keiner `import/no-restricted-paths` oder `max-lines`. Alle 40+ `await import()` sind Test-Mocks.
- **Keine God-Files.** Größte Produktivdateien: `lib/ludothek/holdings.ts` (354), `feature/ludothek/ludothek-browser.tsx` (314) — unter dem 400-Zeilen-Limit und sauber faktorisiert. `scan-view.tsx` (300) ist ein Discriminated-Union-State-Machine-Render, legitimer Route-Einstieg.
- **Übrige Label-Maps konsistent:** `MEMBERSHIP_STATE_LABELS`, `SHIFT_TYPE_LABELS`, `FLEA_MARKET_ITEM_STATUS_LABELS`, `EXPLAINER_EXPERIENCE_LEVEL_LABELS` je genau einmal definiert.

---

## 2. Performance-Audit

### Finding 2 — Ludothek-Server-Actions ohne `revalidatePath` (Medium / S)

Sechs mutierende Actions in [src/lib/ludothek/board-games.ts](../../src/lib/ludothek/board-games.ts) (`createBoardGame:98`, `updateBoardGame:137`, `deinventoriseBoardGame:185`, `requestCompletenessCheck:226`, `assignExpansion:241`, `removeExpansionAssignment:260`) und alle `scan*`-Actions in [src/lib/ludothek/holding-actions.ts:53-235](../../src/lib/ludothek/holding-actions.ts#L53-L235) rufen **kein** `revalidatePath`/`revalidateTag` (grep-Count: 0 in beiden Dateien).

Aktuell bleibt die UI nur deshalb aktuell, weil `useAction()` clientseitig `router.refresh()` auslöst ([use-action.ts:15,34](../../src/components/ui/use-action.ts#L15)). Das ist keine serverseitige Garantie: sobald eine dieser Actions aus einem Kontext ohne `useAction` aufgerufen wird (Cron, andere Route, Server-zu-Server), bleibt die Ansicht dauerhaft stale. Zusätzlich re-rendert `router.refresh()` die ganze Route statt gezielt zu invalidieren.

**Fix:** `revalidatePath("/ludothek")` (bzw. betroffene Detailpfade) in den Actions ergänzen — analog zu `feature/bringbuy/actions.ts` (4 Aufrufe) und `explainer/actions.ts`, die das bereits richtig machen.

### Finding 3 — `getAllContent()` ohne `where`/`select`/`take`, Filterung im JS (Medium / S)

[src/lib/content/content.ts:66-69](../../src/lib/content/content.ts#L66-L69): `prisma.post.findMany()` — kein `where`, kein `select`, kein `take`, kein `orderBy`. Holt jeden Post vollständig inkl. `body` (kompletter Markdown-Text).

Die beiden Aufrufer filtern und sortieren dann im Speicher:

- [src/app/dashboard/news/page.tsx:11-13](../../src/app/dashboard/news/page.tsx#L11-L13) — `.filter(item => item.internal).sort(...)`
- [src/app/dashboard/page.tsx:13](../../src/app/dashboard/page.tsx#L13) — `.filter(item => item.internal)`

Beide brauchen nur interne Posts und nur Listen-Metadaten, laden aber alle Posts mit vollem Body. Zusätzlich läuft der `await` in `dashboard/page.tsx:13` **sequentiell vor** dem `Promise.all` in Zeile 15 — ein unnötiger serieller DB-Roundtrip pro Dashboard-Aufruf.

**Fix:** `getInternalContent(limit?)` mit `where: { internal: true }`, `orderBy: { date: "desc" }` und `select` ohne `body`; `getAllContent()` für Listen-Views ebenfalls ohne `body` (`body` bleibt in `getContentBySlug`). Den Aufruf in `dashboard/page.tsx` ins `Promise.all` ziehen.

### Finding 5 — `CoverMedia` nutzt rohes `<img>`, `remotePatterns` fehlt (Medium / M)

[src/components/ui/cover-media.tsx:33-39](../../src/components/ui/cover-media.tsx#L33-L39): `<img src={imageUrl}>` ohne `width`/`height`, Container nur per `aspect-*`-Klasse dimensioniert. Der `eslint-disable`-Kommentar begründet es mit „arbitrary external URLs" — die eigentliche Ursache ist, dass [next.config.ts](../../next.config.ts) **kein** `images.remotePatterns` konfiguriert, `next/image` mit Blob-URLs also gar nicht funktionieren würde.

Betrifft das am häufigsten gerenderte Bild der App: Spiele-Cover (`entities/game-cover-media.tsx`), Content-Karten (`entities/content-card.tsx`) und Listenzeilen (`entities/content-list-row.tsx`). Konsequenz: keine WebP/AVIF-Konvertierung, kein responsives `srcset`, potenzieller Layout-Shift.

**Fix:** Zwei Schritte — (a) `images.remotePatterns` für den Vercel-Blob-Hostname (und ggf. BGG-Bildhost) in `next.config.ts`, dann (b) `cover-media.tsx` auf `next/image` mit `fill` + `sizes` umstellen und den `eslint-disable` entfernen. Nur an dieser einen Stelle nötig — die Extraktion nach `ui/cover-media.tsx` zahlt sich hier direkt aus.

### Finding 6 — Externe Fetches ohne Timeout (Low / S)

- [src/lib/bgg/client.ts:162-164](../../src/lib/bgg/client.ts#L162) — `fetch` ohne `cache`/`next.revalidate` **und** ohne `AbortSignal`. Läuft im Request-Pfad des Admin-BGG-Vorschau-Formulars.
- [src/lib/instagram/graph-client.ts:67,81,95,116,131,162](../../src/lib/instagram/graph-client.ts#L67) — sechs `fetch`-Aufrufe ohne Timeout.
- [src/lib/content/calendar.ts:52](../../src/lib/content/calendar.ts#L52) — hat `next: { revalidate: 900 }`, aber kein `AbortSignal`.

Bei wenigen gleichzeitigen Admin-Nutzern kein Skalierungsproblem, aber ein hängender Fremdserver blockiert die Admin-Aktion unbegrenzt, statt mit Fehlermeldung zurückzukehren.

**Fix:** `fetch(url, { signal: AbortSignal.timeout(8000) })` an allen drei Stellen; bei BGG zusätzlich `next: { revalidate: … }`, da BGG-Metadaten praktisch statisch sind.

### Finding 9 — Fehlende Indizes (Low / S)

- [prisma/schema.prisma:202-221](../../prisma/schema.prisma#L202-L221) — `model Post` hat **keinen** `@@index`, obwohl `type`, `internal`, `date` durchgängig in `where`/`orderBy` stehen ([content.ts:78-105](../../src/lib/content/content.ts#L78-L105)).
- [prisma/schema.prisma:271-272](../../prisma/schema.prisma#L271) — `BoardGame` indexiert `bggId`/`ean`, aber nicht `status`, obwohl `where: { status: { not: … } }` in [query.ts:18](../../src/lib/ludothek/query.ts#L18) und [holdings-lookup.ts:58](../../src/lib/ludothek/holdings-lookup.ts#L58) filtert.
- [prisma/schema.prisma:415-417](../../prisma/schema.prisma#L415) — `GameHolding` indexiert die drei FKs einzeln, aber nicht `endedAt`, obwohl `where: { endedAt: null }` der häufigste Filter im ganzen Repo ist.

Bei Vereinsgröße (dreistellige Post-, drei- bis vierstellige Spielezahl) macht Postgres das noch per Sequential Scan schnell genug — reine Vorsorge, deshalb Low.

**Fix:** `@@index([type, internal, date])` auf `Post`, `@@index([status])` auf `BoardGame`, `@@index([boardGameId, endedAt])` auf `GameHolding`. Eine Migration, alle drei zusammen.

### Verworfen nach Prüfung

- **Vermutetes N+1 in `getResponsibleMeeple`/`getGameZustand`** ([holdings-lookup.ts:82-120](../../src/lib/ludothek/holdings-lookup.ts#L82)) — nachgelesen: kein Bulk-Aufrufer. Massenansichten nutzen den Batch-Pfad in `query.ts`. Kein Finding.
- **`@zxing/browser` statisch importiert** ([use-code-scanner.ts:2](../../src/components/ui/use-code-scanner.ts#L2), eingebunden von `scan-view.tsx` und `guest-area-view.tsx`) — real, aber bei dieser Nutzerzahl ein zusätzlicher Chunk ohne spürbaren Effekt. Als Low notiert, kein eigenes Issue wert; ggf. später `next/dynamic(…, { ssr: false })`.
- `force-dynamic`/`noStore`/`revalidate = 0` — nirgends im Repo. Next-Caching wird nicht pauschal abgeschaltet.
- Lange Listen ohne Memoization/Virtualisierung — nicht gefunden; Filterung läuft serverseitig über `searchParams`, `admin-bestand-view.tsx` nutzt `useMemo`.
- Layout-Render-Pfad ([src/app/layout.tsx](../../src/app/layout.tsx)) — nur Fonts/Provider, keine teure Arbeit.

---

## 3. Statische Code-Analyse

### Finding 7 — `className`-Konkatenation statt `cn()` (Low / S)

[docs/coding-guidelines.md:100](../../docs/coding-guidelines.md#L100) verlangt `cn()` (`src/lib/utils/cn.ts`, existiert, nutzt `twMerge`+`clsx`), „damit Konflikte korrekt gewinnen". Vier Stellen mit **bedingten** Klassen umgehen das per Template-Literal — dort besteht echtes Merge-Risiko:

- [src/components/entities/content-list-row.tsx:19-21](../../src/components/entities/content-list-row.tsx#L19-L21) — `item.internal ? "border-l-primary border-l-4" : ""` (Teil des uncommitted Arbeitsstands)
- [src/components/feature/admin-preview-tier/preview-tier-switcher.tsx:30](../../src/components/feature/admin-preview-tier/preview-tier-switcher.tsx#L30)
- [src/components/feature/admin-mitglieder/admin-mitglieder-view.tsx:80](../../src/components/feature/admin-mitglieder/admin-mitglieder-view.tsx#L80)
- [src/components/feature/ludothek/ludothek-browser.tsx:51-53](../../src/components/feature/ludothek/ludothek-browser.tsx#L51-L53)

**Fix:** `className={cn("…", item.internal && "border-l-primary border-l-4")}`. ([src/app/layout.tsx:36](../../src/app/layout.tsx#L36) konkateniert ebenfalls, aber nur statische Klassen — kein Risiko, optional.)

### Finding 8 — Debug-`console.log` und ungeprüfte Env-Assertions (Low / S)

- [src/components/feature/admin-mitglieder/invite-form.tsx:20](../../src/components/feature/admin-mitglieder/invite-form.tsx#L20) — `console.log(\`Einladung gültig bis …\`)`, reiner Debug-Rest; das Datum steht bereits in der UI-Meldung (Zeile 45). Löschen.
- [src/lib/auth/server.ts:4,6](../../src/lib/auth/server.ts#L4) — `process.env.NEON_AUTH_BASE_URL!` / `NEON_AUTH_COOKIE_SECRET!` ohne Validierung. Fehlt die Variable, schlägt es zwar sofort beim Modul-Import fehl (kein stiller Bug), aber mit einer kryptischen Lib-Fehlermeldung. Kleine `requireEnv(name)`-Hilfe mit klarer Meldung.

### Verifiziert unauffällig

- **Keine `@ts-ignore`/`@ts-expect-error`** im gesamten Baum. Nur 4 `any`-Treffer, alle in Tests und dokumentiert; `globalThis as unknown as {…}` in [lib/utils/prisma.ts:3](../../src/lib/utils/prisma.ts#L3) ist das Standard-Next-Singleton-Pattern.
- **Keine leeren/stillen `catch`-Blöcke.** Alle loggen, persistieren einen Fehlerstatus (`instagramLastError`) oder setzen UI-Error-State — keine stille Mutation.
- **Keine TODO/FIXME/HACK-Marker** in `src/`, `scripts/`, `prisma/`.
- **`!`-Assertions** in `game-holding-panel.tsx:154` und `helfer-view.tsx:170` liegen in Zweigen, in denen die Werte durch vorherige Prüfungen tatsächlich nicht-null sind (TS kann das Narrowing über Closures nicht nachvollziehen). Kein Laufzeitrisiko.
- **`console.log` in `scripts/*.ts` und `prisma/seed.ts`** sind CLI-Fortschrittsausgaben — erwartetes Verhalten.

---

## Was gut funktioniert

- **Layer-Regel ist echt erzwungen, nicht nur dokumentiert.** `import/no-restricted-paths` generiert seine Zonen aus dem Dateisystem, neue Feature-Ordner sind automatisch abgedeckt — und niemand hat sie per `eslint-disable` aufgeweicht. 0 Verstöße, 0 Zyklen, 0 God-Files.
- **DRY wird gelebt, nicht behauptet.** jscpd: 0 Klone. Der uncommitted Arbeitsstand zeigt es exemplarisch: `ui/cover-media.tsx` neu extrahiert (fachfrei), `entities/game-cover-media.tsx` zum dünnen Wrapper verschlankt, `content-card`/`content-list-row` nutzen die Primitive statt eigener Bild-Logik. Genau die Richtung, die CLAUDE.md vorgibt.
- **Bewusstes Batching mit Begründung im Code.** [query.ts:16-45](../../src/lib/ludothek/query.ts#L16-L45) batcht `boardGame.findMany` + `storageUnit.findMany` per `Promise.all` und löst die Unit-Kette im Speicher auf — mit Kommentar, _warum_ das N+1 vermeidet. Deshalb war das vermutete N+1 auch keins.
- **Fehlerbehandlung in Server Actions ist durchgängig konsistent** (`{ error }` / `{ success: true as const }`) — kein stilles Schlucken irgendwo.
- **Typecheck, Lint und Tests sind sauber** und laufen als `pre-push`-Hook — die Findings hier sind alle Dinge, die kein Linter finden kann.
