# Ausführungsplan: Live-Review-Issues #24–#33

- **Erstellt/Aktualisiert:** 2026-07-31
- **Ziel:** Die zehn aus der Live-Review hervorgegangenen GitHub Issues #24–#33 umsetzen: drei Bugfixes (#25, #28, #29), drei Layout-/Content-Korrekturen (#24, #26, #27) und ein Erweiterungs-Feature-Paket (#30 Datenmodell + #31/#32/#33 UI).
- **Quelle:** GitHub Issues #24–#33 (`gh issue view <n>`). Fachlicher Kontext: [CONTEXT.md](../../CONTEXT.md), Arbeitsregeln: [CLAUDE.md](../../CLAUDE.md), Struktur: [docs/project-structure.md](../../docs/project-structure.md).
- **Git-Base-State:** Branch `app-akademie`, HEAD `b19bdf017cbf0a4d0d7d505852b9908eed3e864d`

> Anforderungen und Akzeptanzkriterien stehen in den Issues — hier nicht duplizieren. Dieser Plan regelt **Reihenfolge, Parallelisierung und Dateihoheit**.

## ⚠️ Vorbedingungen (vor Schritt 0 klären)

1. **Der Working Tree ist nicht leer.** Beim Erstellen dieses Plans lagen **49 geänderte/untracked Dateien** vor (Ludothek-/Erklärbären-/Admin-Einheiten-Arbeit). Zwei betroffene Issues arbeiten direkt in **untracked** Dateien:
   - #28 → `src/components/entities/game-cover-media.tsx` (untracked)
   - #29 → `src/components/feature/ludothek/explainer-game-panel.tsx`, `src/components/entities/explainer-level-toggle.tsx` (beide untracked)

   Diese Vorarbeit **muss committet sein**, bevor der Plan startet — sonst vermischen sich Feature-Commits mit Bugfix-Commits und die Schritte sind nicht mehr einzeln reviewbar.
2. **Neon-DB erreichbar**, da #30 eine echte Migration fährt (`pnpm prisma migrate dev`).
3. **BGG-API ist weiterhin durch #12 blockiert** (401 auf jeden Request). #30 setzt daher auf manuelle Pflege, nicht auf Auto-Import — kein Schritt in diesem Plan wartet auf #12.

## Persona

Du bist ein erfahrener Fullstack-TypeScript-Entwickler mit Schwerpunkt Next.js 16 (App Router, Server Components), Prisma/PostgreSQL und Tailwind v4. Du arbeitest inkrementell und testgetrieben und hältst dich strikt an die Schichtenregeln dieses Repos (`src/lib/<domäne>/` für Geschäftsregeln/Queries/Actions, `components/ui → entities → widgets → feature → layout`, Importe nur nach links). Du weichst `import/no-restricted-paths` **nie** auf, um einen Import durchzubekommen — geteilter Code wandert stattdessen in die richtige Schicht.

## Getroffene Annahmen

- **#25 — Fix ist verifiziert, nicht geraten.** Die Typings von `@neondatabase/auth@0.4.2-beta` (`dist/next/index.d.mts`, Zeile ~1892) zeigen, dass `getSession` einen Query-Parameter `disableRefresh` (und `disableCookieCache`) akzeptiert. Der Cookie-Write entsteht durch den Session-Refresh; in einer Server-Component-Renderphase ist das verboten. Fix: `auth.getSession({ query: { disableRefresh: true } })` in `getCurrentUser()`. Der Session-Refresh gehört damit in die Middleware bzw. einen Route Handler — nicht in den Render-Pfad.
- **#30 nimmt die Leseseite mit.** `BoardGameKind` + `GameCollection` allein reichen nicht: #31, #32 und #33 bräuchten sonst alle drei je `src/lib/ludothek/browser.ts` **und** `query.ts` anfassen und würden sich gegenseitig blockieren. Deshalb erweitert #30 zusätzlich `LudothekGame` (`kind`, `expansionCount`, `baseGameSlug`/`baseGameTitle`, `expansions`), `buildLudothekGames()` und `toPublicGame()`. Die drei UI-Issues konsumieren danach nur noch fertige Felder und sind **echt parallel**.
- **#30 fasst `demo-games.ts` nicht an.** Die Erweiterungs-Zuordnung landet in einer **neuen** Datei `prisma/seed-data/demo-expansions.ts` (`DEMO_EXPANSIONS: { expansion: string; baseGame: string }[]`, Zuordnung über Titel). `seed.ts` leitet `kind` daraus ab (Titel taucht als `expansion` auf → `BOARDGAME_EXPANSION`) und legt die `GameCollection`-Zeilen an. Grund: #24 editiert zeilenweise dieselben Einträge in `demo-games.ts` — hätte #30 dort ein `kind`-Feld ergänzt, wären beide Tracks in einen Zeilen-Konflikt gelaufen.
- **`GameCollection` ist m:n, nicht 1:n** (bewusste Abweichung von einer einfachen `baseGameId`-Spalte, siehe #30): BGG kennt Crossover-Erweiterungen, die zu mehreren Basisspielen gehören. Zusammengesetzter PK `@@id([baseGameId, expansionId])`, kein eigenes `id`.
- **Corner-Overlay wird vorab extrahiert (Schritt 1).** `GameCard` hat den `absolute top-2 right-2 z-10`-Slot bereits; #27 braucht dasselbe über dem News-Bild und #32 einen Corner-Badge. Das sind drei Vorkommen → DRY-Extraktion nach `components/ui/` ist gerechtfertigt und **muss vor dem Fan-out passieren**, sonst greifen Track A und Track B gleichzeitig auf dieselbe neue Datei zu.
- **#24 darf `null` stehen lassen.** Für einen Teil der 63 Titel existiert nachweislich kein brauchbares frei lizenziertes Bild (siehe Dateikommentar in `demo-games.ts`). Ein erfundener oder urheberrechtlich unklarer Link ist schlechter als der Platzhalter. Nicht befüllbare Titel bleiben `null` und werden im Commit-Body genannt.
- **#26/#27/#28/#24 sind reines Layout/Content** → keine Unit-Tests (Repo-Regel: mechanische/Layout-Schritte ausgenommen). #25, #29, #30, #31 haben testbare Logik und **müssen** Tests mitbringen.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- Schichtenregeln und DRY strikt einhalten (siehe [CLAUDE.md](../../CLAUDE.md)). Bestehende Bausteine (`useAction`, `ActionButton`, `ActionDialog`, `TextField`, `formatDateTime`, Pills) **nicht** neu erfinden.
- Max. 400 Zeilen pro Datei; unter 100 Zeilen nur, wenn mehrfach importiert.
- **Committe nur Dateien, die du selbst geschrieben hast** — gezieltes `git add <datei>`, kein `git add -A`.
- **Ein Schritt = ein Commit.** Definition of Done gilt erst mit grünen Tests.
- **Bei Fehlschlag eines Schritts:** nicht weitermachen, nichts committen, Fehler auf Deutsch melden.
- **Vor jedem Push:** `pnpm run verify` (typecheck + lint + test). Am Ende zusätzlich `pnpm run dup` (Ziel: 0 Klone).
- Jeden erledigten Schritt hier mit `[x]` markieren.
- **Dateihoheit respektieren** (Spalte „Dateien" in der Track-Tabelle). Ein Track fasst keine Datei an, die einem anderen Track gehört. Wird das doch nötig, Schritt stoppen und melden statt den Konflikt zu produzieren.

## Parallelisierungs-Strategie

Schritt 0 und 1 laufen **sequenziell zuerst**. Danach fächern vier Tracks auf, die sich keine Datei teilen.

```
Schritt 0 (Baseline)  →  Schritt 1 (CardCornerOverlay extrahieren)
                              │
        ┌─────────────────────┼──────────────────┬──────────────┐
        ▼                     ▼                  ▼              ▼
   Track A               Track B            Track C        Track D
   A1 = #30              B1 = #25           C1 = #28       D1 = #29
     │  (Fundament)      B2 = #26           C2 = #24
     ▼                   B3 = #27           (parallel)
   A2 #31 ┐  parallel    (parallel)
   A3 #32 ├─ nach A1
   A4 #33 ┘
```

| Track | Issues | Dateihoheit | Hinweis |
| --- | --- | --- | --- |
| **A** | #30 → dann #31/#32/#33 | `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/seed-data/demo-expansions.ts`, `src/lib/ludothek/browser.ts`, `src/lib/ludothek/query.ts`, `ludothek-browser.tsx`, `game-card.tsx`, `game-detail-view.tsx`, `app/ludothek/[slug]/page.tsx`, Admin-Zuordnungs-UI | **Kritischer Pfad.** A1 zuerst starten. A2–A4 erst nach A1, dann untereinander parallel. |
| **B** | #25, #26, #27 | `src/lib/auth/server.ts`, `news-browser.tsx`, `content-list-row.tsx` | Alle drei sofort parallel möglich. |
| **C** | #28, #24 | `game-cover-media.tsx`, `prisma/seed-data/demo-games.ts` | Beide sofort parallel. C2 ist der längste, risikoärmste Brocken. |
| **D** | #29 | `explainer-game-panel.tsx`, `explainer-level-toggle.tsx` | Sofort möglich. |

**Warum das kollisionsfrei ist:** #28 arbeitet in `game-cover-media.tsx`, #32 in `game-card.tsx` (verschiedene Dateien). #30 fasst `demo-games.ts` nicht an (siehe Annahmen), #24 fasst `seed.ts` nicht an. #33 rendert `ExplainerGamePanel` weiter unverändert, überschneidet sich also nicht mit #29.

---

## Schritte

### Sequenzieller Vorlauf

- [x] **0. Baseline herstellen**
      `git status` prüfen. Die vorbestehenden 49 Änderungen sind **nicht** Teil dieses Plans: entweder als eigener, thematisch sauberer Commit abschließen oder `git stash -u`. Erst danach mit Schritt 1 beginnen. `pnpm run verify` einmal auf der Baseline laufen lassen, damit spätere Fehlschläge eindeutig diesem Plan zuzuordnen sind.
      _Definition of Done:_ Working Tree ist bezüglich der Plan-Dateien clean, `pnpm run verify` ist grün.
      Kein Commit in diesem Schritt (bzw. der Commit der Vorarbeit, falls diese Variante gewählt wird).

- [x] **1. `CardCornerOverlay` nach `components/ui/` extrahieren** _(Voraussetzung für #27 und #32)_
      Neue Datei `src/components/ui/card-corner-overlay.tsx`: fachfreier Positionierungs-Wrapper mit `corner`-Prop (`"top-left" | "top-right"`), rendert `children` absolut positioniert mit `z-10`. `GameCard` (`src/components/entities/game-card.tsx:34-36`) auf das Primitive umstellen, damit das bestehende Vorkommen mitgezogen wird und keine zweite Wahrheit entsteht.
      _Definition of Done:_ `GameCard` verhält sich unverändert (Edit-Overlay weiter oben rechts), `pnpm run verify` grün. Kein Unit-Test nötig (reines Layout-Primitive).
      `git commit -m "refactor(ui): extract CardCornerOverlay from GameCard"`

---

### Track A — Datenmodell & Erweiterungen (kritischer Pfad)

- [x] **A1. #30 — `BoardGameKind`, `GameCollection` und Leseseite** _(blockiert A2–A4)_
      **Schema** (`prisma/schema.prisma`): Enum `BoardGameKind { BOARDGAME BOARDGAME_EXPANSION }`; Feld `kind BoardGameKind @default(BOARDGAME)` auf `BoardGame`; Modell `GameCollection` mit `baseGameId`/`expansionId`, beide Relation auf `BoardGame` (benannte Relationen, da zwei FKs auf dieselbe Tabelle), `@@id([baseGameId, expansionId])`, `@@map("game_collections")`; die zwei Rückrelationen auf `BoardGame`. Migration fahren.
      **Seed**: neue Datei `prisma/seed-data/demo-expansions.ts` mit `DEMO_EXPANSIONS` (Titel-Paare für die vorhandenen Catan-/Wingspan-/Carcassonne-/Dixit-/Root-/Ticket-to-Ride-Erweiterungen). `prisma/seed.ts` leitet `kind` daraus ab und legt die `GameCollection`-Zeilen nach dem Anlegen der Spiele an. **`demo-games.ts` bleibt unangetastet.**
      **Leseseite**: `LudothekGame` in `src/lib/ludothek/browser.ts` um `kind`, `expansionCount` und die Basisspiel-/Erweiterungs-Referenzen (Slug + Titel) erweitern; `toPublicGame()` behält diese Felder (sind öffentliche Spielinfo, keine Inventardaten). `buildLudothekGames()` in `query.ts` lädt die `GameCollection`-Relationen im bestehenden Bulk-Query mit — **kein N+1**.
      **Admin-UI**: Zuordnung Erweiterung → Basisspiel pflegbar machen (bestehenden `ActionDialog`/`combobox`-Baustein nutzen, nicht neu bauen), inkl. Permission-Check `games:manage` analog zu den vorhandenen Board-Game-Actions in `src/lib/ludothek/board-games.ts`.
      _Definition of Done:_ `prisma migrate dev` läuft fehlerfrei, Seed läuft durch und erzeugt `GameCollection`-Zeilen. Unit-Tests decken ab: `kind`-Ableitung im Seed, `expansionCount`/Basisspiel-Auflösung in der Leseseite (mit gemocktem Prisma), Permission-Verweigerung in der Zuordnungs-Action ohne DB-Änderung. `pnpm run verify` grün.
      `git commit -m "feat(ludothek): model base game to expansion relation"`

- [x] **A2. #31 — Filter „Erweiterungen ausblenden"** _(nach A1; parallel zu A3/A4)_
      `src/lib/ludothek/browser.ts`: `LudothekFilters` um `hideExpansions?: boolean`, Parsing in `parseLudothekSearchParams` (neuer Query-Param, Muster analog `ausgeliehen: "1"`), Ausschluss in `filterLudothekGames` über `kind === "BOARDGAME_EXPANSION"`. `ludothek-browser.tsx`: `FilterPill` in der bestehenden Filter-Sektion ergänzen (kein neues Filter-Konstrukt).
      _Definition of Done:_ `src/lib/ludothek/browser.test.ts` erweitert: Filter aktiv → Erweiterungen fehlen, Basisspiele bleiben; Filter inaktiv/abwesend → unveränderte Liste; Round-Trip Query-Param → Filter → Query-Param. `pnpm run verify` grün.
      `git commit -m "feat(ludothek): add hide-expansions filter"`

- [x] **A3. #32 — Erweiterungs-Kennzeichnung auf Spielkarten** _(nach A1; parallel zu A2/A4)_
      `src/components/entities/game-card.tsx`: bei `kind === "BOARDGAME_EXPANSION"` Corner-Badge mit Icon über das Primitive aus Schritt 1 (`corner="top-left"`, damit es nicht mit dem Edit-Overlay oben rechts kollidiert); bei Basisspielen mit `expansionCount > 0` Icon + Anzahl in der Karten-Metazeile. Deutsche Labels/Fachvokabular gehören nach `src/lib/ludothek/`, nicht in die Komponente.
      _Definition of Done:_ Visuell auf `/ludothek` mit gemischtem Bestand geprüft (Erweiterung, Basisspiel mit Erweiterungen, Basisspiel ohne). Badge und Edit-Overlay überlappen bei `canManageGames` nicht. `pnpm run verify` grün. Kein Unit-Test (die Zähl-Logik ist in A1 getestet).
      `git commit -m "feat(ludothek): mark expansions and expansion count on game cards"`

- [x] **A4. #33 — Erweiterungen auf der Detailseite verlinken** _(nach A1; parallel zu A2/A3)_
      `src/components/feature/ludothek/game-detail-view.tsx`: bei Basisspielen Liste der Erweiterungen mit Link-Buttons auf `/ludothek/<slug>`; bei Erweiterungen „Zum Basisspiel"-Button. Daten kommen aus den in A1 ergänzten Feldern — `app/ludothek/[slug]/page.tsx` braucht idealerweise **keinen** zusätzlichen Query. Wird die Datei dadurch über 400 Zeilen groß, entlang der Fachlichkeit teilen (eigene `entities/`-Komponente für die Erweiterungs-Liste), nicht mechanisch abschneiden.
      _Definition of Done:_ Auf `/ludothek/catan` (oder einem anderen Basisspiel mit geseedeten Erweiterungen) in beide Richtungen navigierbar. `pnpm run verify` grün.
      `git commit -m "feat(ludothek): link base games and expansions on detail page"`

---

### Track B — News & Auth (sofort parallel)

- [x] **B1. #25 — Cookie-Write aus dem Render-Pfad entfernen**
      `src/lib/auth/server.ts`: `getCurrentUser()` auf `auth.getSession({ query: { disableRefresh: true } })` umstellen (Signatur verifiziert in `node_modules/@neondatabase/auth/dist/next/index.d.mts`). Prüfen, welche weiteren Server Components `getCurrentUser()` direkt aufrufen (u. a. `app/news/[slug]/page.tsx`, `app/ludothek/page.tsx`) — der Fix muss zentral in `getCurrentUser()` sitzen, nicht pro Aufrufer. Falls der Session-Refresh fachlich weiterhin gebraucht wird, gehört er in die Middleware bzw. einen Route Handler; das dann als kurzen Kommentar an der Funktion festhalten.
      _Definition of Done:_ Regressionstest (Muster: bestehendes `src/lib/auth/session.test.ts` mit gemockten Cookies) belegt, dass `getSession` mit `disableRefresh: true` aufgerufen wird. Manuell verifiziert: `/news/kennerspiel-turnier-09-08` als Gast rendert ohne Runtime Error. `pnpm run verify` grün.
      `git commit -m "fix(auth): avoid session cookie write during server component render"`

- [x] **B2. #26 — News-Kalender unterhalb der Filterleiste ausrichten**
      `src/components/feature/news/news-browser.tsx`: Grid so umbauen, dass der Kalender auf `lg:` erst auf Höhe des ersten Listeneintrags beginnt (Filterreihe aus dem Grid-Fluss der rechten Spalte herausnehmen, z. B. Filterzeile über beide Spalten spannen). Mobile-Reihenfolge (einspaltig, Kalender unter der Liste) darf sich nicht ändern.
      _Definition of Done:_ Visuell auf `/news` bei `lg:` und mobil geprüft. `pnpm run verify` grün.
      `git commit -m "fix(news): align calendar below the filter row"`

- [x] **B3. #27 — Bearbeiten-Button als Overlay** _(braucht Schritt 1)_
      `src/components/entities/content-list-row.tsx`: den Pencil-Link (Zeile 45-53) aus dem Flex-Fluss nehmen und über `CardCornerOverlay` (`corner="top-left"`) absolut über dem Bild platzieren. Der bestehende `absolute inset-0`-Link der Karte darf den Button nicht verdecken — Stacking-Kontext prüfen.
      _Definition of Done:_ Kartenbreite und Textfluss sind mit und ohne `canEdit` identisch; Bearbeiten-Link bleibt klickbar und führt nicht zur Detailseite. `pnpm run verify` grün.
      `git commit -m "fix(news): position edit button as card overlay"`

---

### Track C — Bilder (sofort parallel)

- [x] **C1. #28 — Cover-Bilder einpassen statt beschneiden**
      `src/components/entities/game-cover-media.tsx:27`: `object-cover` durch proportionales Einpassen ersetzen (`object-contain` plus neutraler Hintergrund, damit das Seitenverhältnis der Karte erhalten bleibt und keine gestretchten Bilder entstehen). Die Komponente wird von `GameCard` (`aspect-video`) **und** `GameDetailView` (`aspect-[3/4]`) genutzt — beide Fälle prüfen.
      _Definition of Done:_ Auf `/ludothek` und einer Detailseite geprüft: Cover vollständig sichtbar, kein Verzerren, kein Layout-Sprung bei sehr breiten/hohen Bildern. `pnpm run verify` grün.
      `git commit -m "fix(ludothek): fit cover images instead of cropping them"`

- [x] **C2. #24 — Fehlende Demo-Cover ergänzen**
      `prisma/seed-data/demo-games.ts`: die 63 Einträge mit `imageUrl: null` durchgehen und frei lizenzierte Bilder ergänzen (bevorzugt Wikimedia Commons, wie im Rest der Datei; Lizenz muss kommerzielle Nutzung und Weitergabe erlauben). **Kein Link ohne geprüfte Lizenz** — Titel ohne brauchbares freies Bild bleiben `null`. Der Dateikommentar oben ist entsprechend zu aktualisieren, wenn sich die Zahl ändert.
      Darf in Batches committet werden (z. B. 3× ~20 Einträge), wenn ein einzelner Commit zu groß wird.
      _Definition of Done:_ Seed läuft fehlerfrei, Start- und Ludothek-Seite zeigen deutlich weniger Platzhalter. Im Commit-Body stehen die Titel, für die bewusst kein Bild gefunden wurde. `pnpm run verify` grün.
      `git commit -m "chore(seed): add freely licensed cover images to demo games"`

---

### Track D — Erklärbären (sofort parallel)

- [x] **D1. #29 — Level-Toggle Aktiv/Inaktiv korrigieren**
      `src/components/feature/ludothek/explainer-game-panel.tsx`: der lokale State wird aktuell mit `myLevel ?? "WITH_MANUAL"` initialisiert (Zeile 36-38) und im nicht-registrierten Zweig als `value` durchgereicht — dadurch erscheint „Mit Anleitung" als aktiv, obwohl keine Registrierung existiert, und ein Klick darauf tut nichts (kein `onDeselect` in diesem Zweig). State auf `ExplainerExperienceLevel | null` umstellen und `null` sauber durchreichen, statt einen Default vorzutäuschen. `ExplainerLevelToggle` unterstützt `value={null}` und `onDeselect` bereits (`explainer-level-toggle.tsx:42-44`) — dort ist voraussichtlich keine Änderung nötig; falls doch, minimal halten.
      Die Überschrift („Ich kann das erklären" / „Du kannst das erklären") laut Issue **unabhängig vom Registrierungszustand konstant** halten.
      _Definition of Done:_ Komponententest (Muster: `create-board-game-dialog.test.tsx`) deckt ab: (a) nicht registriert → kein Button aktiv; (b) registriert → genau ein Button aktiv; (c) Klick auf aktiven Button → 0 aktive Buttons und `removeExplainerGame` wird aufgerufen; (d) Klick auf inaktiven Button bei bestehender Registrierung → Wechsel, weiterhin genau ein aktiver. Manuell als Mitglied auf `/ludothek/7-wonders` verifiziert. `pnpm run verify` grün.
      `git commit -m "fix(explainer): correct active state handling in level toggle"`

---

## Abschluss

- [x] **Z1. Gesamtverifikation**
      `pnpm run verify` und `pnpm run dup` auf dem zusammengeführten Stand. Bei neuen Klonen: extrahieren, nicht ignorieren.
      _Definition of Done:_ `verify` grün, `dup` bei 0 Klonen.

- [ ] **Z2. Issues schließen und Doku prüfen**
      Die abgeschlossenen Issues per `gh issue close <n>` mit Verweis auf den Commit schließen. `blocked`-Label von #31/#32/#33 entfernen, sobald A1 gemergt ist. Falls A1 die Struktur verändert hat (neue Domänen-Datei, neuer geteilter Baustein aus Schritt 1): **[docs/project-structure.md](../../docs/project-structure.md) mitpflegen** — Repo-Regel, sonst driftet die Doku.
      _Definition of Done:_ Alle zehn Issues geschlossen, `docs/project-structure.md` beschreibt `CardCornerOverlay` und die `GameCollection`-Domäne korrekt.
