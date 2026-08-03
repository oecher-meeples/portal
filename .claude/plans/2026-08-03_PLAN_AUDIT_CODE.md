# Ausführungsplan — Code-Audit-Findings 2026-08-03

**Grundlage:** [.claude/audits/2026-08-03_AUDIT_CODE.md](../audits/2026-08-03_AUDIT_CODE.md)
**Basis-Stand:** Branch `app-akademie`, Head `525f40f`
**Issues:** #42, #43, #44, #45, #46, #47 + Kommentar an #28 — alle im Projects-Board „oecher meeples portal" / Backlog
**Umfang:** 9 Findings, alle Medium/Low. Keine Critical/High. Typecheck, Lint, jscpd und madge sind sauber — dieser Plan behebt ausschließlich Dinge, die kein Linter findet.

## Vorbedingung: uncommitted Arbeitsstand klären

Der Audit lief gegen einen Working Tree mit 11 geänderten und 2 neuen Dateien (`ui/cover-media.tsx`, `layout/crypto-randomuuid-polyfill.tsx`). Zwei Findings (#42 Teil A via `content-list-row.tsx`, der Kommentar an #28) beziehen sich direkt darauf.

**Vor Schritt 1:** Diesen Arbeitsstand committen oder verwerfen. Ein Plan-Schritt darf nicht auf halbfertige Änderungen aufsetzen — sonst ist im Nachhinein nicht trennbar, was der Plan geändert hat und was schon da war.

- [ ] `git status` prüfen, Arbeitsstand als eigener Commit abgeschlossen (Cover-Media-Extraktion + Polyfill), oder bewusst verworfen
- [ ] `pnpm run verify` auf dem bereinigten Stand grün

## Reihenfolge und Begründung

Die Abhängigkeit steckt zwischen #43 und #45: sobald die Ludothek-Actions serverseitig revalidieren, können die auf `useAction()` umgestellten Views mit `{ refresh: false }` arbeiten, statt zusätzlich einen Vollrefresh auszulösen. Andernfalls würde #45 ein Verhalten festschreiben, das #43 direkt wieder ändert.

Die übrigen Schritte sind unabhängig. Reihenfolge daher: erst die kleinen, klar abgegrenzten Backend-Schritte (schneller Nutzen, geringes Risiko), dann die aufwendigere View-Umstellung, zuletzt Hygiene.

```
Schritt 1 (#42) ─┐
Schritt 2 (#44) ─┤ unabhängig, parallel möglich
Schritt 4 (#46) ─┘
Schritt 3 (#43) ──► Schritt 5 (#45)     ← echte Abhängigkeit
Schritt 6 (#47) ─── unabhängig, zuletzt
```

---

## Schritt 1 — #42: `GameZustandPill` statt duplizierter Label-/Tone-Map

**Aufwand:** S · **Risiko:** minimal (rein visuelle Äquivalenz)

- [ ] `ZUSTAND_TONE` und `ZUSTAND_LABELS` in `src/components/feature/admin-bestand/admin-bestand-view.tsx:46-58` entfernen
- [ ] Zeile 198-201: `<StatusPill label={ZUSTAND_LABELS[game.zustand]} tone={ZUSTAND_TONE[game.zustand]} />` → `<GameZustandPill zustand={game.zustand} />`
- [ ] Import `GameZustandPill` aus `@/components/entities/game-zustand-pill` ergänzen; nicht mehr genutzte Importe (`StatusPill`, `StatusTone`, ggf. `GameZustand`) entfernen
- [ ] `grep -rn "ZUSTAND_LABELS\|ZUSTAND_TONE" src/` — es darf nur noch `entities/game-zustand-pill.tsx` treffen
- [ ] `/admin/bestand` aufrufen: Labels und Farben unverändert
- [ ] `pnpm run verify`

**Commit:** `refactor(bestand): use GameZustandPill instead of duplicated label map`

## Schritt 2 — #44: Content-Queries in die DB verlagern

**Aufwand:** S · **Risiko:** gering, aber Rückgabetyp-Änderung strahlt aus — Typecheck ist hier der Wächter

- [ ] `getInternalContent(limit?)` in `src/lib/content/content.ts` ergänzen: `where: { internal: true }`, `orderBy: { date: "desc" }`, `select` ohne `body`
- [ ] `src/app/dashboard/news/page.tsx:11-13` auf `getInternalContent()` umstellen, In-Memory-`filter`/`sort` entfernen
- [ ] `src/app/dashboard/page.tsx:13` auf `getInternalContent()` umstellen **und** den Aufruf ins bestehende `Promise.all` (Zeile 15) ziehen — der sequentielle Roundtrip verschwindet
- [ ] `getAllContent()` ohne `body` eingrenzen; prüfen, ob nach Umstellung überhaupt noch ein Aufrufer außer `getAllContentWithCalendar` bleibt — falls nicht, ganz durch gezielte Queries ersetzen
- [ ] `getContentBySlug` unverändert lassen (braucht `body`)
- [ ] `src/lib/content/calendar.ts:98-100` auf den geänderten Rückgabetyp prüfen
- [ ] Tests in `src/lib/content/content.test.ts` für `getInternalContent` ergänzen (interne werden geliefert, öffentliche nicht, Sortierung absteigend)
- [ ] `/dashboard` und `/dashboard/news` aufrufen: identische Liste wie vorher
- [ ] `pnpm run verify`

**Commit:** `perf(content): filter internal posts in the query instead of in memory`

## Schritt 3 — #43: `revalidatePath` in den Ludothek-Actions

**Aufwand:** S · **Risiko:** gering · **Blockiert Schritt 5**

- [ ] Muster aus `src/components/feature/bringbuy/actions.ts` als Vorbild lesen (4 korrekte Aufrufe)
- [ ] `revalidatePath` im **Erfolgspfad** der sechs Actions in `src/lib/ludothek/board-games.ts` ergänzen (`createBoardGame:98`, `updateBoardGame:137`, `deinventoriseBoardGame:185`, `requestCompletenessCheck:226`, `assignExpansion:241`, `removeExpansionAssignment:260`)
- [ ] Betroffene Pfade je Action bestimmen — mindestens `/ludothek`, bei Detailmutationen zusätzlich die Detailroute, bei Bestandsänderungen `/admin/bestand`
- [ ] `revalidatePath` in allen `scan*`-Actions in `src/lib/ludothek/holding-actions.ts:53-235` ergänzen
- [ ] Sicherstellen: im Fehlerpfad (`{ error }`) wird **nicht** revalidiert
- [ ] Manuell verifizieren: Spiel bearbeiten → Ludothek-Übersicht und Detailseite zeigen den neuen Stand
- [ ] `pnpm run verify`

**Commit:** `fix(ludothek): revalidate affected paths in board-game and holding actions`

## Schritt 4 — #46: Fetch-Timeouts und DB-Indizes

**Aufwand:** S · **Risiko:** gering; Migration braucht einen bewussten Deploy-Schritt

**Teil A — Timeouts:**

- [ ] `signal: AbortSignal.timeout(8000)` in `src/lib/bgg/client.ts:162-164`, zusätzlich `next: { revalidate: … }` (BGG-Metadaten sind praktisch statisch)
- [ ] `signal: AbortSignal.timeout(8000)` in allen sechs `fetch`-Aufrufen in `src/lib/instagram/graph-client.ts:67,81,95,116,131,162`
- [ ] `signal` in `src/lib/content/calendar.ts:52` ergänzen (`revalidate: 900` bleibt)
- [ ] Timeout-Fehler (`TimeoutError`/`AbortError`) in eine verständliche deutsche Meldung übersetzen — nicht als Roh-Exception nach oben geben

**Teil B — Indizes (eine Migration für alle drei):**

- [ ] `@@index([type, internal, date])` auf `model Post` (`prisma/schema.prisma:202-221`)
- [ ] `@@index([status])` auf `model BoardGame` (`prisma/schema.prisma:271-272`)
- [ ] `@@index([boardGameId, endedAt])` auf `model GameHolding` (`prisma/schema.prisma:415-417`)
- [ ] Eine Migration erzeugen und einspielen
- [ ] `pnpm run verify`

**Commits:** `fix(api): add timeouts to external fetches` + `perf(db): add indexes for the most common query filters`

## Schritt 5 — #45: Views auf `useAction()` umstellen

**Aufwand:** M · **Risiko:** höchstes im Plan — vier Views, vier Interaktionspfade · **Setzt Schritt 3 voraus**

Aufsteigend nach Komplexität, damit die erste Umstellung als Referenz für die restlichen dient:

- [ ] `src/components/feature/admin-preview-tier/preview-tier-switcher.tsx:18-24` (einfachster Fall — `useTransition` + `router.refresh()`)
- [ ] `src/components/feature/admin-einheiten/unit-detail-view.tsx:70-100` — `handleSave` und `handleRetire` je ein eigener `useAction()`-Aufruf
- [ ] `src/components/feature/erklaerbaeren/my-explainer-games.tsx:73,86,92` — dreifaches `router.refresh()` entfernen
- [ ] `src/components/feature/admin-bringbuy/admin-bringbuy-view.tsx:52,60-70` — `runAction()` entfernen, `useAction()` **pro Tabellenzeile**, damit der Pending-Zustand zeilenweise bleibt und nicht die ganze Tabelle sperrt
- [ ] Da Schritt 3 serverseitig revalidiert: wo möglich `useAction({ refresh: false })` nutzen, um den doppelten Vollrefresh zu sparen
- [ ] Jede View manuell im **Erfolgs- und Fehlerfall** prüfen: Pending-Zustand sichtbar, Fehlertext an derselben Stelle wie vorher
- [ ] `grep` über die vier Dateien: kein handgeschriebenes `useTransition` + `setError` + `router.refresh()`-Trio mehr
- [ ] `pnpm run verify`

**Commit:** `refactor(views): replace hand-rolled action bookkeeping with useAction()`

## Schritt 6 — #47: Code-Hygiene

**Aufwand:** S · **Risiko:** minimal

- [ ] Vier bedingte `className`-Stellen auf `cn("…", bedingung && "…")` umstellen: `entities/content-list-row.tsx:19-21`, `feature/admin-preview-tier/preview-tier-switcher.tsx:30`, `feature/admin-mitglieder/admin-mitglieder-view.tsx:80`, `feature/ludothek/ludothek-browser.tsx:51-53`
- [ ] `console.log` in `src/components/feature/admin-mitglieder/invite-form.tsx:20` entfernen (Ablaufdatum steht bereits in der UI-Meldung, Zeile 45)
- [ ] `requireEnv(name)`-Hilfe in `src/lib/utils/` ergänzen: wirft bei fehlender Variable mit klarer deutscher Meldung inkl. Variablennamen
- [ ] `src/lib/auth/server.ts:4,6` nutzt `requireEnv` statt `!`
- [ ] `grep -rn "process\.env\.[A-Z_]*!" src/` — weitere Fundstellen mit umstellen, wo sinnvoll
- [ ] `pnpm run verify`

**Commit:** `chore: use cn() for conditional classes, drop debug log, validate env vars`

---

## Nicht in diesem Plan

- **Finding 5 (`next/image` + `images.remotePatterns`)** — als Kommentar an #28 dokumentiert, weil es dieselbe Datei betrifft, an der gerade gearbeitet wird. Gehört in die Umsetzung von #28, nicht in diesen Plan.
- **`@zxing/browser` statisch importiert** (`ui/use-code-scanner.ts:2`) — im Bericht als Low verworfen: real, aber bei dieser Nutzerzahl ein zusätzlicher Chunk ohne spürbaren Effekt. Kein Issue, kein Schritt.

## Abschluss

- [ ] `pnpm run verify` auf dem Endstand grün
- [ ] Alle sechs Issues geschlossen, Board-Status auf **Done**
- [ ] Prüfen, ob `docs/project-structure.md` angepasst werden muss — nur relevant, falls Schritt 2 oder 6 einen geteilten Baustein neu anlegt (`getInternalContent`, `requireEnv`). Die CLAUDE.md-Bausteine-Tabelle ggf. um `requireEnv` ergänzen.
- [ ] `.claude/TODO.md` leeren, falls für diesen Durchlauf angelegt
