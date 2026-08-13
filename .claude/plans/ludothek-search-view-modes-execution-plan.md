# Ausführungsplan: Ludothek — Suche, Scan-Dialog, View-Modi + Kleinfixes

- **Erstellt/Aktualisiert:** 2026-08-13 12:00
- **Ziel:** Suche auf `/admin/bestand` und `/ludothek` um EAN/BGG-ID + Kamera-Scan-Dialog erweitern, `/ludothek` bekommt Grid/Liste/Compact-Ansichten, dazu #103 (Erweiterungs-Eckmarkierung) und #34 (offene Gesuche auf Spiel-Detailseite).
- **Quelle:** `.claude/plans/ludothek-search-view-modes-execution-plan.md` (dieser Plan selbst, iterativ mit dem Nutzer erarbeitet — keine separate Aufgabendatei)
- **Git-Base-State:** Branch `develop`, Head `62805c79883663161eb95ec47da9a97e977acac0`. Working Directory ist **nicht sauber** (siehe Schritt 0).

> Details, Anforderungen und Kontext (Entscheidungen aus vorheriger Bewertungsrunde, GH-Issue-Recherche) sind unten unter „Getroffene Annahmen“ zusammengefasst — nicht in den Schritten dupliziert.

## Persona

Du bist Senior Full-Stack Engineer für ein Next.js-16-App-Router-Projekt (React, TypeScript, Prisma/Neon, Tailwind v4, Base UI, Vitest/RTL). Du kennst die Schichtregeln aus `CLAUDE.md` (`lib/<domäne>` vs. `components/ui|entities|widgets|feature`) und hältst dich strikt daran, auch wenn es bequemer wäre, eine Regel für einen Import aufzuweichen. Du arbeitest testgetrieben, committest kleinteilig und lässt dich von einem fehlgeschlagenen Schritt nicht aufhalten, sondern dokumentierst und machst weiter.

## Getroffene Annahmen

- **Scope:** Nur `/ludothek` bekommt die drei Darstellungsmodi (Grid/Liste/Compact). `/admin/bestand` bleibt seine eigene Tabellen-Seite, unverändert bis auf Suche + Scan-Icon.
- **Scan-Button auf `/ludothek`:** wird ersetzt durch den neuen Quick-Search-Scan-Dialog. Der bisherige Link zu `/scan` (Ausleihe/Rückgabe-Workflows) entfällt dort ersatzlos — bewusste Entscheidung, kein Kompromiss/Nebeneinander.
- **Gast-Zugriff:** Kamera-Icon + Suche sind auch für nicht eingeloggte Besucher:innen sichtbar/nutzbar (kein `internal`-Gate). EAN-Matching funktioniert dafür serverseitig auf der ungekürzten `LudothekGame[]`-Liste, bevor auf `PublicLudothekGame` gestrippt wird — das EAN-Feld selbst geht nie an den Client.
- **EAN/BGG-ID-Matching:** exakter Vergleich (13-stellige EAN bzw. numerische BGG-ID — ein Teilstring-Treffer ergibt fachlich keinen Sinn). Titel bleibt Teilstring, case-insensitive wie bisher.
- **Hover-Vergrößerung (Liste):** Overlay, kein Reflow. Kein neues Popover-Primitive nötig (kein Fokus-Trap/Menü-Semantik erforderlich, nur Text-Erweiterung) — eigener kontrollierter `expanded`-State pro Zeile, bedingt gerenderter `absolute`-positionierter Container darüber.
- **Mobile Doppel-Tap:** Da `GameCard` heute ein nativer `next/link` ist, bekommt die neue Listen-Zeile eine eigene Interaktionsstruktur (kontrollierter State statt reinem `<Link>`) — bewusst anders als die Grid-Card, kein Versuch, beide Karten-Typen auf dieselbe Struktur zu zwingen.
- **Sticky Suchleiste:** `sticky top-24` (Offset-Konvention aus `legal-doc-view.tsx:51`, passend zur Höhe des globalen Headers), eigener `bg-background`-Hintergrund gegen Durchscheinen der darunter scrollenden Liste/Tabelle.
- **Live-Suche `/admin/bestand`:** bereits gegeben (State-basiert, kein Schritt nötig).
- **Live-Suche `/ludothek`:** debounced (250–300 ms) `router.replace` auf den bestehenden `q`-Searchparam, kein `router.push` (sonst ein History-Eintrag pro Tastenanschlag). Das bestehende `<form action={basePath}>` bleibt als No-JS-Fallback (progressive enhancement, passt zum Rest der Seite). Deckt GH #120 ab.
- **View-Modus-Persistenz:** eigener Searchparam `?ansicht=grid|liste|compact` (Standard `grid`) — konsistent mit „jeder Filter ist ein Link“ (`docs/features.md:91`), übererfüllt die Mindestanforderung aus GH #9 („mind. Session“).
- **Compact-Modus:** nur sichtbar wenn `canManageGames` — zeigt nur Felder, die interne Nutzer heute schon in der Grid-Ansicht sehen (`zustand`, `locationChain`), **keine** Admin-Actions (Bearbeiten/Deinventarisieren/Prüfung anfordern bleiben exklusiv auf `/admin/bestand`).
- **„Privatbesitz von Mitgliedern“-Sektion:** bleibt in jedem Modus ein eigenes festes Grid (anderes Datenformat: kein Zustand, kein Standort, keine Detailseite) — wird von den drei Modi nicht berührt.
- **#34 — Bestandsauswahl beim Gesuch-Anlegen:** immer optional, `gameTitle`-Freitext bleibt der Standard, keine Pflicht bei Treffer.
- **#34 — Status-Filter Detailseite:** zeigt nur Gesuche mit Status „offen“ (`getLfgStatus() === "offen"`), „voll“ wird nicht angezeigt.
- **Geprüft, aber bewusst außerhalb dieses Plans:** #28 (Cover-Bilder → `next/image`-Migration), #12 (BGG-API-Auth, extern blockiert), #5 (QR-Kisten-Bulk-Scan), #97 (Spiele-Anzahl Startseite). #30/#31/#32/#33 waren im Code bereits umgesetzt und wurden auf GitHub geschlossen.
- **Branch:** `feature/ludothek-search-scan-views` von `develop` (Branch-Schutz, siehe `CLAUDE.md`).
- **Test-Framework:** Vitest + Testing Library sind bereits eingerichtet (`pnpm run test`) — Schritt 1 des Templates entfällt als eigener Schritt und ist in Schritt 0 mit verifiziert.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt).
- Halte die Schichtregeln aus `CLAUDE.md` strikt ein (`src/lib/<domäne>` vs. `components/ui → entities → widgets → feature → layout`). Bei Unsicherheit: fachfreie, wiederverwendbare UI-Bausteine (kein Domänenwissen, keine Server Actions) gehören nach `components/ui/`, nicht `widgets/`.
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf diesen Plan.
- Dateien über 400 Zeilen möglichst in kleinere Dateien aufteilen (ESLint `max-lines` bricht sonst den Build).
- Erstelle eine passende Ordnerstruktur, orientiert an bestehenden Nachbar-Dateien.
- **Unit-Tests:** Für neue Logik/Funktionen Unit-Tests schreiben. Die Definition of Done eines Schritts gilt erst als erfüllt, wenn die zugehörigen Tests grün sind. Ausgenommen sind rein mechanische/nicht-testbare Schritte (Config, Doku, reines visuelles Styling ohne Verzweigungslogik).
- **Committe nur Dateien, die du selbst geschrieben hast** — andere Dateien im Working Directory ignorieren (kein `git add .`, sondern gezieltes `git add <datei>`). Das Working Directory enthält bereits unstaged Änderungen aus einer vorherigen Session (siehe Schritt 0) — diese gehören zu Schritt 0, nicht zu späteren Schritten.
- **Blockierende Prozesse:** Du hast die Erlaubnis, Prozesse zu beenden, die für die Ausführung eines Schritts benötigte Ressourcen blockieren (z. B. einen Port, eine Datei oder einen Lock belegen). Identifiziere den blockierenden Prozess gezielt und beende nur diesen, statt den Schritt abzubrechen.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert: < 1 h Arbeit).
- **Bei Fehlschlag eines Schritts:** prüfen, ob die Definition of Done zumindest teilweise erfüllt ist. Falls ja, den erreichten Teilstand committen (Commit-Message mit Präfix `wip:`); falls nein, nichts committen. In beiden Fällen den Schritt mit `[!]` markieren, den Fehler kurz im Schritt selbst notieren (Stichpunkt unter dem Schritt) und mit dem nächsten Schritt fortfahren — **nicht abbrechen**. Erst nachdem **alle** Schritte durchlaufen wurden (egal ob `[x]` oder `[!]`), alle offenen Punkte/Fehlschläge gesammelt auf Deutsch mit dem Nutzer besprechen.
- Markiere jeden erledigten Schritt mit `[x]`, sobald er abgeschlossen und committet ist.
- Vor jedem Commit: `pnpm run typecheck` und die neuen/betroffenen Tests laufen lassen. Vor dem allerletzten Schritt zusätzlich `pnpm run verify` einmal komplett.

## Schritte

- [x] **0. Repository vorbereiten (Branch + Testframework verifizieren)**
      Feature-Branch `feature/ludothek-search-scan-views` von `develop` anlegen (`develop` ist per Ruleset geschützt, siehe `CLAUDE.md`). Die aktuell unstaged Änderungen im Working Directory (`code-scanner.tsx`, `use-code-scanner.ts`, `scan-feedback.ts`, `create-board-game-dialog.tsx`, `board-game-form-fields.tsx`, `edit-board-game-dialog.tsx`, `package.json`/`pnpm-lock.yaml` durch `@zxing/library`) stammen aus einer vorherigen Session (EAN-Scan-Format-Fix, Scan-Feedback, Dialog-Layout) und sind **nicht Teil dieses Plans** — gezielt (`git add <datei>`, keine `.claude/`-Dateien) in einem eigenen Commit sichern, damit alle folgenden Schritte einen sauberen Diff zeigen. Testframework (Vitest + Testing Library) ist bereits vorhanden — `pnpm run test` einmal laufen lassen und grün bestätigen.
      _Definition of Done:_ neuer Branch aktiv, `git status` zeigt nur noch Dateien, die zu späteren Schritten gehören (oder ist clean), `pnpm run test` läuft grün.
      `git commit -m "chore: carry over EAN scan fix, scan feedback and dialog layout from previous session"`

- [x] **1. `/admin/bestand`: Suche um EAN/BGG-ID erweitern (extrahiert + getestet)**
      Neue reine Funktion `matchesAdminBestandSearch(game, search)` (Titel-Teilstring case-insensitive, exakter Treffer auf `ean`, exakter Treffer auf `String(bggId)`) in `src/components/feature/admin-bestand/filters.ts` ergänzen (oder neue Datei `admin-bestand-search.ts`, falls `filters.ts` sonst zu fachfremd würde — die Datei ist Prisma-Where-Builder, eine reine Client-Such-Funktion passt thematisch eher in eine eigene Datei). `admin-bestand-view.tsx`s `filtered`-`useMemo` auf diese Funktion umstellen statt der bisherigen Inline-`.includes()`-Prüfung.
      _Definition of Done:_ neue Unit-Tests (Titel-Teiltreffer, exakte EAN, exakte BGG-ID, kein Treffer bei Teil-EAN) grün, bestehende `filters.test.ts` weiterhin grün, `admin-bestand-view.tsx` nutzt die neue Funktion.
      `git commit -m "feat(admin-bestand): match search against EAN and BGG-ID, not only title"`

- [x] **2. Gemeinsame `ScanSearchDialog`-Komponente**
      Neue Datei `src/components/ui/scan-search-dialog.tsx`: `Dialog` (aus `ui/dialog.tsx`) mit Kamera-Trigger-Button (Icon aus `lucide-react`, z. B. `Camera`) und `<CodeScanner stopOnDetect onDetected={...} />` darin. Bei Erkennung: ca. 400 ms warten (`setTimeout`, damit der grüne Flash aus `use-code-scanner.ts` sichtbar bleibt), danach Dialog schließen und `onScanned(text)` aufrufen. Props: `onScanned: (text: string) => void`, kein Domänenwissen (kein EAN-Resolving, kein Server-Call) — bewusst in `components/ui/`, da fachfrei.
      _Definition of Done:_ neuer Test `scan-search-dialog.test.tsx` (Dialog öffnet auf Klick, `onScanned` wird mit erkanntem Text aufgerufen, Dialog schließt sich danach — Timer mit `vi.useFakeTimers()` steuern) grün.
      `git commit -m "feat(ui): add reusable scan-to-text dialog"`

- [x] **3. `ScanSearchDialog` in `/admin/bestand` einbauen + sticky Suchleiste**
      Kamera-Icon-Button neben dem bestehenden Such-`Input` in `admin-bestand-view.tsx`, öffnet `ScanSearchDialog`, `onScanned` setzt den `search`-State. Suchleisten-Container (`Input` + Quick-Filter-Buttons + Kamera-Icon) auf `sticky top-24 z-10 bg-background` umstellen, damit er beim Scrollen der Tabelle sichtbar bleibt.
      _Definition of Done:_ bestehender `create-board-game-dialog.test.tsx`/Komponententest der Seite grün, neuer/erweiterter Test verifiziert, dass ein simulierter Scan den Such-State setzt und die Tabelle entsprechend filtert. Manuell: sticky-Verhalten beim Scrollen visuell geprüft.
      `git commit -m "feat(admin-bestand): add camera scan icon to search bar, make it sticky"`

- [x] **4. `/ludothek`: `filterLudothekGames` um EAN/BGG-ID erweitern**
      `src/lib/ludothek/browser.ts`: `search`-Vergleich um exakten Treffer auf `game.ean` und `String(game.bggId)` ergänzen, Titel-Teilstring bleibt wie bisher.
      _Definition of Done:_ `browser.test.ts` um Fälle für EAN-Exact-Match, BGG-ID-Exact-Match und „kein Treffer bei Teil-EAN“ erweitert, alle grün.
      `git commit -m "feat(ludothek): match search against EAN and BGG-ID, not only title"`

- [x] **5. Debounce-Hook + Live-Suche auf `/ludothek`**
      Neuer Hook `src/components/ui/use-debounced-value.ts` (generisch, 250–300 ms Default-Delay, konfigurierbar). In `ludothek-browser.tsx`: Such-`Input` bekommt kontrollierten lokalen State, bei jeder Änderung debounced `router.replace(href({ q: value || undefined }))`. Bestehendes `<form action={basePath}>` (inkl. „Suchen“-Button) bleibt unverändert als No-JS-Fallback erhalten.
      _Definition of Done:_ neuer Test für `use-debounced-value` (liefert den finalen Wert erst nach Ablauf der Verzögerung, `vi.useFakeTimers()`), `ludothek-browser.test.tsx` um „Tippen im Suchfeld aktualisiert `q` nach Debounce“ erweitert, beide grün.
      `git commit -m "feat(ludothek): trigger search on every keystroke via debounced URL update"`

- [x] **6. Scan-Button auf `/ludothek` ersetzen**
      Bestehenden `Link`-Button zu `/scan` in `ludothek-browser.tsx` entfernen, `ScanSearchDialog` aus Schritt 2 daneben einbauen (Kamera-Icon neben Suchfeld), **kein** `internal`-Gate — auch für Gäste sichtbar. `onScanned` setzt `q` über denselben Debounce/Replace-Mechanismus aus Schritt 5 (nicht nur lokalen State), damit das Ergebnis ein teilbarer Link bleibt.
      _Definition of Done:_ `ludothek-browser.test.tsx` verifiziert: kein Link zu `/scan` mehr vorhanden, simulierter Scan setzt `q` und filtert die Ergebnisliste, Verhalten identisch für `internal=true` und `internal=false`.
      `git commit -m "feat(ludothek): replace scan-to-workflow link with scan-to-search dialog"`

- [x] **7. View-Modus-Parameter + Umschalter-UI**
      `LudothekFilters`/`parseLudothekSearchParams` in `browser.ts` um `view: "grid" | "liste" | "compact"` (Default `"grid"`) erweitern, aus `?ansicht=` gelesen. Neue Icon-Button-Gruppe in `ludothek-browser.tsx` **oberhalb** der Ergebnisliste, außerhalb des einklappbaren Filterbereichs (`<details>`) — pro Icon ein `Link` mit `href({ ansicht: ... })`, aktiver Modus hervorgehoben (analog `FilterPill`). Compact-Icon nur rendern, wenn `canManageGames`.
      _Definition of Done:_ `browser.test.ts` um `view`-Parsing (inkl. ungültiger Werte → Fallback `grid`) erweitert, `ludothek-browser.test.tsx` verifiziert Sichtbarkeit des Compact-Icons abhängig von `canManageGames` und dass der Umschalter außerhalb von `<details>` liegt.
      `git commit -m "feat(ludothek): add grid/list/compact view mode switch, url-persisted"`

- [x] **8. Listen-Zeile: Desktop (Hover-Overlay)**
      Neue Komponente `src/components/entities/game-list-row.tsx`: Bild, Titel, Spieleranzahl/Dauer, Beschreibung mit `line-clamp-2` (Konsistenz zu `content-card.tsx`, kein hartes `.slice(0, 100)`). Kontrollierter `expanded`-State, per `onMouseEnter`/`onMouseLeave` gesetzt; im `expanded`-Zustand ein `absolute` positionierter Container mit voller Beschreibung über der Zeile (kein Reflow der Nachbarn, `z-10`+Schatten).
      _Definition of Done:_ neuer Test `game-list-row.test.tsx`: rendert Kernfelder, Beschreibung hat `line-clamp-2`-Klasse im Ruhezustand, `expanded`-Container erscheint erst nach `mouseEnter` und verschwindet nach `mouseLeave`.
      `git commit -m "feat(ludothek): add list view row with hover-expand description"`

- [x] **9. Listen-Zeile: Mobile Doppel-Tap**
      `game-list-row.tsx` um Touch-Verhalten erweitern: erster Tap auf die Zeile setzt `expanded = true` und verhindert Navigation (`preventDefault`); ist die Zeile bereits `expanded`, navigiert ein weiterer Tap normal zur Detailseite. Nur auf Touch-Geräten aktiv (Hover-Verhalten aus Schritt 8 bleibt für Maus/Pointer unverändert, z. B. über `onPointerDown`/`pointerType` unterscheiden statt separater Media-Query-Logik).
      _Definition of Done:_ Test ergänzt: simulierter erster Touch-Tap expandiert und navigiert nicht, zweiter Tap navigiert (Link-Ziel wird aufgerufen/`router.push` bzw. `href`-Assertion je nach Umsetzung).
      `git commit -m "feat(ludothek): first tap expands list row on touch, second tap navigates"`

- [x] **10. Compact-Zeile**
      Neue Komponente `src/components/entities/game-compact-row.tsx`: dichte Zeile mit Titel, `locationChain`, `GameZustandPill` — angelehnt an die Tabellen-Zeile aus `admin-bestand-view.tsx`, aber **ohne** Admin-Actions (kein Bearbeiten/Deinventarisieren/Prüfung anfordern).
      _Definition of Done:_ Test rendert Compact-Zeile mit den drei Feldern, keine Action-Buttons im DOM.
      `git commit -m "feat(ludothek): add compact view row for internal games:manage users"`

- [x] **11. Drei Modi in `ludothek-browser.tsx` verdrahten**
      Je nach `filters.view` `GameCard`-Grid, `GameListRow`-Liste oder `GameCompactRow`-Liste rendern. „Privatbesitz von Mitgliedern“-Sektion bleibt unverändert als eigenes festes Grid, unabhängig vom gewählten Modus.
      _Definition of Done:_ `ludothek-browser.test.tsx`: für jeden `?ansicht=`-Wert wird der jeweils richtige Zeilen-/Karten-Typ gerendert, Privatbesitz-Sektion bleibt in allen drei Fällen ein Grid mit `GameCard`-artigen Elementen.
      `git commit -m "feat(ludothek): wire grid/list/compact rendering into the browser view"`

- [x] **12. #103 — Erweiterungs-Eckmarkierung**
      - Visuelle Light/Dark-Prüfung auf `/ludothek` nicht durchgeführt (nicht-interaktive Session, kein laufender Dev-Server/Browser verfügbar) — automatisierter Teil (Komponententests) ist grün.
      Neue Komponente `src/components/ui/ribbon-corner.tsx` (diagonale Ecke, `rotate-45` + `overflow-hidden` am Karten-Container, `bg-primary`-Farbe, Icon aus `lucide-react`). In `game-card.tsx:41-49` das bisherige `CardCornerOverlay`-Icon-Badge dafür ersetzen (nur wenn `isExpansion`). `game-list-row.tsx` aus Schritt 8 bekommt eine kleinere Variante (weniger vertikaler Platz in der Listenzeile).
      _Definition of Done:_ vorhandene/neue Komponententests für `game-card.tsx` (`isExpansion=true` → `RibbonCorner` im DOM, `isExpansion=false` → nicht) grün. Visuell in Light/Dark auf `/ludothek` mit gemischtem Bestand geprüft (rein visueller Teil ist manuelle Prüfung, nicht automatisiert testbar).
      `git commit -m "feat(ludothek): replace expansion icon badge with diagonal ribbon corner (#103)"`

- [x] **13. #34 — Schema: `LfgPost.boardGameId`**
      `prisma/schema.prisma`: `LfgPost` bekommt `boardGameId String?` + Relation zu `BoardGame` (`onDelete: SetNull`) + `@@index([boardGameId])`. Migration erzeugen (`pnpm exec prisma migrate dev --name lfg_post_board_game_id`). Bestehende Posts bleiben `boardGameId = null`, kein Auto-Matching-Job.
      _Definition of Done:_ Migration läuft sauber gegen die aktuelle DB (`pnpm run db:seed` danach fehlerfrei), `pnpm exec prisma generate` ohne Fehler, `pnpm run typecheck` grün.
      `git commit -m "feat(lfg): add optional boardGameId relation to LfgPost (#34)"`

- [x] **14. #34 — Query „offene Gesuche zu einem Spiel”**
      In `src/lib/content/lfg.ts` neue Funktion `getOpenLfgPostsForBoardGame(boardGameId)`: liest `LfgPost` mit `boardGameId` = übergebener ID, filtert über `getLfgStatus() === "offen"` (kein `closedAt`, nicht abgelaufen, nicht voll), inkl. Teilnehmerzähler. Falls `lfg.ts` dadurch Richtung 400 Zeilen wächst: neue Datei `lib/content/lfg-boardgame.ts`.
      _Definition of Done:_ neue Tests in `lfg.test.ts` (oder neuer `lfg-boardgame.test.ts`): liefert nur „offene“ Posts, ignoriert `voll`/`abgelaufen`/`geschlossen`, korrekter Teilnehmerzähler, leeres Array wenn keine passenden Posts.
      `git commit -m "feat(lfg): add query for open lfg posts linked to a board game"`

- [x] **15. #34 — Sektion auf Spiele-Detailseite**
      `game-detail-view.tsx`: neue Sektion „Offene Gesuche“ (Titel, Termin/`dateNote`, `location`, Teilnehmerstand „x/max“), jeweils verlinkt auf `/lfg/[id]`. Sektion entfällt komplett (kein leerer Platzhalter), wenn `getOpenLfgPostsForBoardGame` ein leeres Array liefert. Datenbeschaffung in der aufrufenden Server-Komponente (`src/app/ludothek/[slug]/page.tsx`) ergänzen und als Prop durchreichen.
      _Definition of Done:_ Komponententest für `game-detail-view.tsx` (falls noch keiner existiert, neu anlegen): Sektion erscheint mit korrekten Feldern bei vorhandenen offenen Gesuchen, fehlt komplett bei leerer Liste.
      `git commit -m "feat(ludothek): show open lfg requests on game detail page (#34)"`

- [x] **16. #34 — Optionale Bestandsauswahl beim Gesuch-Anlegen**
      `feature/lfg/actions.ts`: `LfgPostInput` um optionales `boardGameId?: string | null` erweitern, `createLfgPost` reicht es durch. `create-lfg-dialog.tsx`: optionales Autocomplete/Select gegen vorhandene `BoardGame`-Titel, setzt bei Auswahl `boardGameId`; `gameTitle`-Freitext bleibt unabhängig davon editierbar, keine Pflicht bei Treffer.
      _Definition of Done:_ bestehende `lfg`-Action-Tests (falls vorhanden) weiterhin grün, neuer Test: `createLfgPost` mit gesetzter `boardGameId` legt den Post mit dieser Relation an; ohne Auswahl bleibt `boardGameId = null`, `gameTitle` unverändert nutzbar.
      `git commit -m "feat(lfg): let create-lfg-dialog optionally link a post to a board game (#34)"`

- [x] **17. Abschluss: `pnpm run verify` + Zusammenfassung**
      Gesamten `pnpm run verify` (format:check, typecheck, lint, test) laufen lassen. Alle in diesem Plan erzeugten/geänderten Dateien final prüfen (kein `git add .`, gezielte Liste). PR-Beschreibung vorbereiten (nicht pushen/mergen ohne Rückfrage — Branch-Schutz auf `develop`, siehe `CLAUDE.md`).
      _Definition of Done:_ `pnpm run verify` komplett grün.
      `git commit -m "chore: final verify pass for ludothek search/scan/view-mode work"`

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Claude Sonnet 5)
- **Reasoning/Thinking:** an, mittlerer bis hoher Effort — besonders für Schritt 8/9 (Hover- vs. Touch-Interaktion ohne die bestehende `Link`-Navigation zu brechen), Schritt 5/6 (Debounce + URL-Shareability-Prinzip gleichzeitig einhalten) und Schritt 13/14 (Schema-Migration + Status-Filter-Logik).
- **Begründung:** Der Plan ist überwiegend reguläre Feature-Arbeit (neue Komponenten, Query-Erweiterungen, Migration), aber mit mehreren echten Architektur-Fallstricken (Layer-Regeln, Shareable-URL-Prinzip, Native-Link-vs-Touch-Konflikt), die sorgfältiges Abwägen statt reinem Boilerplate brauchen — kein Fall für ein kleineres/schnelleres Modell, aber auch keine hochgradig unklare Umstrukturierung, die Opus rechtfertigen würde.
