# Ausführungsplan: Ludothek — Titel-Detailseite, Erweiterungs-Modell, Aktionen-Dropdown

- **Erstellt/Aktualisiert:** 2026-08-13 13:30
- **Ziel:** Spiele-Detailseite von Exemplar- auf Titel-Basis umbauen (Erweiterungs-Modell, Standort-Kette, Kontakt-Dialog, Exemplar-Tabelle/-Karte), Ludothek-Übersicht um Aktionen-Dropdown, Corner-Badge-Fixes, Listen-Karte, „Neues Spiel anlegen"-Button und Scan-Erweiterungen im Create-Dialog ergänzen.
- **Quelle:** `.claude/plans/ludothek-detailseite-aktionen-grilling.md` (vollständige Entscheidungsgrundlage aus einer `/grill-with-docs`-Session — Details dort, hier nicht dupliziert)
- **Git-Base-State:** Branch `feature/ludothek-search-scan-views`, Head `eaed425` — dieser Branch ist noch **nicht** in `develop` gemerged. Der neue Feature-Branch dieses Plans baut auf diesem Stand auf (enthält bereits Suche/Scan/View-Modi aus der vorherigen Session).

> Details, Anforderungen und Entscheidungen (aus der Grilling-Session) sind in der Quelldatei zusammengefasst — nicht in den Schritten dupliziert.

## Persona

Du bist Senior Full-Stack Engineer für ein Next.js-16-App-Router-Projekt (React, TypeScript, Prisma/Neon, Tailwind v4, Base UI, Vitest/RTL). Du kennst die Schichtregeln aus `CLAUDE.md` (`lib/<domäne>` vs. `components/ui|entities|widgets|feature`) und hältst dich strikt daran. Du arbeitest testgetrieben, committest kleinteilig, und bei Architektur-Entscheidungen mit echtem Trade-off schreibst du eine kurze ADR statt die Begründung nur im Commit zu vergraben.

## Getroffene Annahmen

- Alle 21 Punkte der Grilling-Zusammenfassung in der Quelldatei sind vom Nutzer bestätigt — nicht erneut zur Diskussion stellen.
- **Branch:** `feature/ludothek-detail-titelbasis` von `feature/ludothek-search-scan-views` (nicht von `develop` — dieser Branch ist noch offen, siehe Git-Base-State).
- **Reihenfolge:** Erst das Fundament (Slug-Migration, `kind`-Konsistenz, Komponenten-Split), dann die Detailseite, dann die Ludothek-Übersicht, dann die Create-Dialog-Erweiterungen, zuletzt ADRs + Verify — jeder Schritt baut auf dem vorherigen auf.
- **Test-Framework:** Bereits vorhanden (`pnpm run test`), kein eigener Schritt nötig — wird in Schritt 0 mit verifiziert.
- **Bestehende Bausteine wiederverwenden:** `ScanSearchDialog`, `RibbonCorner`, `AddGameCopyDialog`, `PruefbogenPanel`/`confirmGameCondition`/`reportGameDefect`, `getContactLinks`, `Regal-Zuordnung`-Logik aus dem Gäste-Bereich — nicht neu erfinden.
- **GitHub Issues #121/#122** sind bereits angelegt (siehe Quelldatei) — nicht Teil dieses Plans.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt).
- Halte die Schichtregeln aus `CLAUDE.md` strikt ein (`src/lib/<domäne>` vs. `components/ui → entities → widgets → feature → layout`).
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf die Quelldatei.
- Dateien über 400 Zeilen möglichst in kleinere Dateien aufteilen (ESLint `max-lines` bricht sonst den Build).
- Erstelle eine passende Ordnerstruktur, orientiert an bestehenden Nachbar-Dateien.
- **Unit-Tests:** Für neue Logik/Funktionen Unit-Tests schreiben. Die Definition of Done eines Schritts gilt erst als erfüllt, wenn die zugehörigen Tests grün sind. Ausgenommen sind rein mechanische/nicht-testbare Schritte (Config, Doku, reines visuelles Styling ohne Verzweigungslogik).
- **Committe nur Dateien, die du selbst geschrieben hast** — gezieltes `git add <datei>`, kein `git add .`.
- **Blockierende Prozesse:** Erlaubnis, blockierende Prozesse gezielt zu beenden (Port, Datei-Lock), statt den Schritt abzubrechen.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert: < 1 h Arbeit).
- **Bei Fehlschlag eines Schritts:** Teilstand committen (`wip:`-Präfix) falls DoD teilweise erfüllt, sonst nichts committen. Schritt mit `[!]` markieren, Fehler notieren, mit dem nächsten Schritt fortfahren — **nicht abbrechen**. Erst nach allen Schritten offene Punkte gesammelt besprechen.
- Markiere jeden erledigten Schritt mit `[x]`, sobald abgeschlossen und committet.
- Vor jedem Commit: `pnpm run typecheck` und die neuen/betroffenen Tests laufen lassen. Vor dem allerletzten Schritt zusätzlich `pnpm run verify` einmal komplett.

## Schritte

- [x] **0. Repository vorbereiten**
      Feature-Branch `feature/ludothek-detail-titelbasis` von `feature/ludothek-search-scan-views` anlegen. `pnpm run test` einmal laufen lassen und grün bestätigen.
      _Definition of Done:_ neuer Branch aktiv, `git status` clean, `pnpm run test` grün.
      `git commit -m "chore: verify test framework before ludothek detail page rework" --allow-empty`

- [x] **1. `BoardGame.slug` — Schema + Generierung**
      `prisma/schema.prisma`: `BoardGame` bekommt `slug String @unique`. Migration erzeugen (`pnpm exec prisma migrate dev --name boardgame_slug`), dabei bestehende Titel per Backfill-Skript (im Migrations-SQL oder einmaligem Script) aus `title` slugifizieren (bestehende `lib/utils/slug.ts` wiederverwenden), Kollisionen mit Zahlen-Suffix auflösen. `createBoardGame`/`previewBggImport`-Flow (`lib/ludothek/board-games.ts`) generiert künftig ebenfalls einen `slug` beim Anlegen.
      _Definition of Done:_ Migration läuft sauber gegen die DB, `pnpm run db:seed` fehlerfrei, neuer Unit-Test für die Slug-Generierungsfunktion (Kollisionsfall) grün.
      `git commit -m "feat(ludothek): add slug to BoardGame, generate on create"`

- [x] **2. Routing auf Titel-Slug umstellen**
      `src/app/ludothek/[slug]/page.tsx` und `src/lib/ludothek/query.ts` umstellen: Auflösung über `BoardGame.slug` statt `GameCopy.slug`; `buildLudothekGames()`/`LudothekGame` liefert weiterhin ein Array (mehrere Exemplare = mehrere Einträge mit gleichem `boardGameId`, aber Detailseite gruppiert diese jetzt nach Titel). Alle bestehenden Links (`game-card.tsx`, `game-list-row.tsx`, `game-compact-row.tsx`, LFG-Detailseiten-Link) auf `boardGameSlug`/Titel-Slug umstellen statt `game.slug` (Exemplar-Slug).
      _Definition of Done:_ `browser.test.ts`/`query`-Tests angepasst und grün, kein Verweis mehr auf `GameCopy.slug` als Routing-Basis in den genannten Komponenten.
      `git commit -m "refactor(ludothek): route detail page by BoardGame slug instead of GameCopy slug"`

- [x] **3. `kind`/`GameCollection`-Konsistenz**
      `assignExpansion` (`lib/ludothek/board-games.ts`): setzt `kind` der Erweiterung automatisch auf `BOARDGAME_EXPANSION`, falls noch nicht gesetzt (kein Rückfall bei `removeExpansionAssignment`). `expansionAssignment.options`-Berechnung in `page.tsx` nach `kind` filtern (Basisspiel-Kandidat nur `BOARDGAME`, Erweiterungs-Kandidat beliebig).
      _Definition of Done:_ neue Unit-Tests: Zuweisung setzt `kind`, Entfernen ändert `kind` nicht, Optionsliste korrekt gefiltert für beide Richtungen.
      `git commit -m "fix(ludothek): auto-set expansion kind on assignment, filter options by kind"`

- [x] **4. `EditBoardGameTitle`/`EditBoardGameExemplar`-Komponenten-Split**
      Bestehende `BoardGameFormFields`/`EditBoardGameDialog` in zwei Komponenten aufteilen: `src/components/widgets/board-game/edit-board-game-title.tsx` (Titel-Stammdaten: Titel, Beschreibung, Mechaniken, Spieleranzahl, `kind`, BGG-Felder, EAN) und `src/components/widgets/board-game/edit-board-game-exemplar.tsx` (Mängelvermerk/`condition`). Beide einzeln exportiert, komponierbar in einem gemeinsamen Dialog-Wrapper.
      _Definition of Done:_ bestehende `edit-board-game-dialog.test.tsx`/`create-board-game-dialog.test.tsx` weiterhin grün (ggf. angepasst), neue Komponententests für beide Bausteine einzeln.
      `git commit -m "refactor(board-game): split edit form into title and exemplar components"`

- [x] **5. Detailseite: Titel-Header + Bearbeiten-Button + Ribbon**
      `game-detail-view.tsx`: `EditBoardGameTitle`-Button neben der Titel-Überschrift (nur `canManageGames`). `RibbonCorner` (Standard-Variante) zusätzlich am großen Cover-Bild, wenn `game.kind === "BOARDGAME_EXPANSION"`.
      _Definition of Done:_ `game-detail-view.test.tsx` erweitert: Bearbeiten-Button sichtbar/unsichtbar je nach `canManageGames`, Ribbon erscheint nur bei Erweiterung.
      `git commit -m "feat(ludothek): add title edit button and ribbon corner to detail page"`

- [x] **6. Detailseite: Exemplar-Tabelle/-Karte**
      Neue Komponente `src/components/feature/ludothek/game-copies-section.tsx`: bei mehreren Exemplaren eine Tabelle (Zustand, Standort/Kontakt, Admin-Aktionen), bei genau einem eine Card (gleiche Felder). `EditBoardGameExemplar`-Button pro Zeile/Karte, plus `AddGameCopyDialog` als „+ Exemplar hinzufügen"-Aktion. In `game-detail-view.tsx` einbinden, `page.tsx` liefert die Exemplar-Liste des Titels.
      _Definition of Done:_ neuer Test: rendert Tabelle bei >1 Exemplaren, Card bei genau 1, „+ Exemplar hinzufügen" immer sichtbar bei `canManageGames`.
      `git commit -m "feat(ludothek): add exemplar table/card section to detail page"`

- [x] **7. Kontakt-Dialog (geteilte Komponente)**
      Neue Komponente `src/components/entities/contact-dialog.tsx` (oder `widgets/`, falls Server-Action-Bezug nötig — reine Anzeige von `getContactLinks`-Ergebnis, daher `entities/`): Klick auf einen Namen öffnet Dialog mit allen Kontaktoptionen (Mail/Telegram). In `market-listing-card.tsx` und `market-listing-detail-view.tsx` die bisherigen Icon-Links ersetzen.
      _Definition of Done:_ neuer Komponententest für `ContactDialog`, bestehende Flohmarkt-Tests angepasst und grün.
      `git commit -m "feat(ui): add shared contact dialog, replace inline contact icons in marketplace"`

- [x] **8. Standort-Kette neu formatieren**
      `src/lib/ludothek/query.ts`/`holdings.ts`: `locationChain`-Aufbau ändern, sodass die Kette mit Person (`bei {Name}`) oder Event beginnt, danach Regal/Karton folgt. Überall dort einbinden, wo die Kette zur Abhol-Orientierung dient (Standort-Block der Detailseite, `/admin/bestand`, Compact-Zeile, neue Basisspiel-Referenzkarte aus Schritt 9). Bisherige getrennte „Verantwortlich"-Zeile entfällt, Person-Name nutzt `ContactDialog` aus Schritt 7.
      _Definition of Done:_ `query.test.ts`/`holdings.test.ts` um die neue Ketten-Reihenfolge erweitert, betroffene Komponententests angepasst.
      `git commit -m "refactor(ludothek): lead location chain with person/event before storage units"`

- [x] **9. Basisspiel-Referenz-Karte + Erweiterungs-Liste symmetrisch**
      Neue Komponente `src/components/entities/related-game-card.tsx` (Bild links, Titel-Link + Standort-Kette rechts). In `game-detail-view.tsx` sowohl für „Erweiterung zu" (Basisspiel-Referenzen) als auch für die Erweiterungs-Liste (bisher Text-Pills) verwenden — symmetrisch für beide Richtungen.
      _Definition of Done:_ neuer Komponententest für `RelatedGameCard`, `game-detail-view.test.tsx` erweitert (beide Richtungen rendern Karten statt Pills).
      `git commit -m "feat(ludothek): show base game and expansions as symmetric related-game cards"`

- [x] **10. Gast-Sichtbarkeit: Exemplar-Anzahl + Event-Aggregat**
      Neue Funktion in `lib/ludothek/query.ts` (oder eigene Datei, falls `query.ts` sonst zu groß wird): liefert für einen Titel die reine Exemplar-Anzahl (Standardfall) sowie, falls ein Event läuft und Exemplare per Regal-Zuordnung zugeordnet sind, „X von Y verfügbar (Regal Z)" (Y = am Event anwesende Exemplare, X = davon nicht ausgeliehen). In `game-detail-view.tsx`/`page.tsx` für Gäste anzeigen — keine Einzel-Zustand-Pille pro Exemplar für Gäste.
      _Definition of Done:_ neue Unit-Tests: reine Anzahl ohne Event, korrekte X-von-Y-Berechnung mit Event-Zuordnung, Exemplare außerhalb des Events zählen nicht mit.
      `git commit -m "feat(ludothek): show plain copy count for guests, event-scoped availability during events"`

- [x] **11. Mängelvermerk-Labeling in der UI**
      In `EditBoardGameExemplar` (Schritt 4) und an weiteren Stellen, wo `condition` als „Zustand" beschriftet ist, auf „Mängelvermerk" umstellen (Label-Texte, Platzhalter). Rein mechanisch/Text-Änderung — kein neuer Test nötig, sofern keine Logik betroffen ist.
      _Definition of Done:_ keine UI-Stelle mehr, die `condition` als „Zustand" beschriftet (grep-Check).
      `git commit -m "chore(ludothek): rename condition field label to Mängelvermerk"`

- [x] **12. „Nicht erfasst"-Pill entfernen**
      `GameZustandPill`/Aufrufstellen: Pill für `zustand === "nicht-erfasst"` nicht mehr rendern (Grid, Liste, Kompakt, Detailseite, `/admin/bestand`).
      _Definition of Done:_ bestehende Pill-Tests angepasst, neuer Test: kein Pill-Rendering bei `nicht-erfasst`.
      `git commit -m "fix(ludothek): hide the redundant nicht-erfasst pill"`

- [x] **13. Ludothek-Grid: Ribbon-Corner-Position fixen**
      `ribbon-corner.tsx`: Positionierung/Offsets anpassen, sodass der Text im Grid vollständig lesbar ist (weiter nach innen).
      _Definition of Done:_ visuell geprüft (rein stilistischer Schritt, kein neuer Logik-Test nötig).
      `git commit -m "fix(ui): move ribbon corner further inward for readability"`

- [x] **14. Listen-Zeile: Hover-Merge + Zeilengröße**
      `game-list-row.tsx`: Hover-Overlay optisch mit der Zeile verschmelzen (kein Gap, gemeinsamer Rahmen/Radius). Zeilenhöhe und Cover-Bild-Größe auf das Format der Grid-Karte (`GameCard`) anheben.
      _Definition of Done:_ bestehende `game-list-row.test.tsx` weiterhin grün, ggf. um Klassen-Assertion für die neue Größe erweitert.
      `git commit -m "fix(ludothek): merge list row hover overlay into one card, match grid size"`

- [x] **15. Liste/Kompakt: Admin-Bearbeiten-Buttons + Aktionen-Dropdown-Grundgerüst**
      `game-list-row.tsx`/`game-compact-row.tsx`: `EditBoardGameExemplar`-Button analog zu `GameCardEditOverlay` ergänzen. Neues `src/components/widgets/game-holding/game-actions-menu.tsx`: Dropdown mit rechtebasierten Einträgen (`games:manage`: Prüfung anfordern, Deinventarisieren, Weiteres Exemplar hinzufügen; jeder Meeple: Geprüft, Ausleihen, Weitergeben, Rückgabe, Umlagern) — in diesem Schritt nur Struktur + bestehende Aktionen ohne eigene Dialoge verdrahten (Ausleihen etc. zunächst als Platzhalter-Eintrag, siehe Schritt 16).
      _Definition of Done:_ neuer Test für `GameActionsMenu`: zeigt/verbirgt Einträge je nach Rechten, `game-list-row.test.tsx`/`game-compact-row.test.tsx` erweitert um Edit-Button.
      `git commit -m "feat(ludothek): add edit button and actions menu skeleton to list/compact rows"`

- [x] **16. Aufenthalts-Mini-Dialoge mit Scan-Option**
      Für Ausleihen/Weitergabe/Rückgabe/Umlagern je einen Mini-Dialog (nutzt bestehende `scanBorrowGame`/`scanGiveToMeeple`/`scanAcceptReturn`/`scanRelocateGame` aus `holding-actions.ts`), der `gameCopyId` schon kennt und Ziel (Meeple/Einheit) per Such-Auswahl **oder** `ScanSearchDialog` (löst den Scan-Text gegen die passende Ziel-Liste auf) entgegennimmt. In `GameActionsMenu` aus Schritt 15 verdrahten.
      _Definition of Done:_ neue Tests je Dialog: manuelle Auswahl löst Aktion aus, simulierter Scan setzt das Zielfeld und löst dieselbe Aktion aus.
      `git commit -m "feat(ludothek): wire holding actions into scan-or-select mini dialogs"`

- [x] **17. „+ Neues Spiel anlegen" auf `/ludothek`**
      `ludothek-browser.tsx`: `CreateBoardGameDialog` (nur `canManageGames`) neben dem View-Modus-Umschalter einbinden.
      _Definition of Done:_ `ludothek-browser.test.tsx` erweitert: Button sichtbar nur bei `canManageGames`.
      `git commit -m "feat(ludothek): add create-board-game button to the browser view"`

- [x] **18. `CreateBoardGameDialog`: EAN-Scan-Icon**
      EAN-Feld bekommt ein Scan-Icon (`ScanSearchDialog`), das nach erfolgreichem Scan den Dialog schließt und den Text ins EAN-Feld übernimmt.
      _Definition of Done:_ `create-board-game-dialog.test.tsx` erweitert: simulierter Scan setzt EAN-Feld, Dialog schließt.
      `git commit -m "feat(admin-bestand): add EAN scan icon to create-board-game dialog"`

- [x] **19. `createStorageUnit`: expliziter Code**
      `src/components/feature/admin-einheiten/actions.ts`: `CreateStorageUnitInput` um optionales `code?: string` erweitern — wenn gesetzt, diesen statt `nextUnitCode(...)` verwenden, mit Kollisions-Check (Fehler bei bereits vergebenem Code).
      _Definition of Done:_ neue Unit-Tests: expliziter Code wird übernommen, Kollision liefert Fehler, ohne `code` weiterhin automatische Generierung.
      `git commit -m "feat(einheiten): let createStorageUnit accept an explicit code"`

- [x] **20. `CreateBoardGameDialog`: Standort-Feld**
      Neues optionales Standort-Feld: Scan löst gegen bestehende Aufbewahrungseinheiten auf (Fehler bei Nichttreffer, mit Lösungsoption „Aufbewahrungseinheit neu anlegen und mir zuweisen" — nutzt `createStorageUnit` mit explizitem Code aus Schritt 19, Keeper = aktuelle Person). Alternativ Button „Mir zuweisen" (Standort = anlegende Person, keine Einheit). Bei erfolgreicher Standort-Angabe wird das neu angelegte Exemplar entsprechend platziert statt in „Unsortiert".
      _Definition of Done:_ neue Tests: erfolgreicher Einheiten-Scan setzt Standort, Fehlschlag zeigt Lösungsoption, „Mir zuweisen" platziert ohne Einheit, neues Exemplar landet nicht in Unsortiert wenn Standort gesetzt.
      `git commit -m "feat(admin-bestand): add optional location field with scan and self-assign to create dialog"`

- [x] **21. ADRs schreiben**
      Drei ADRs in `docs/adr/`: (a) `kind` vs. `GameCollection` als Quelle der Wahrheit, (b) Slug-Migration Exemplar→Titel ohne Redirects, (c) `createStorageUnit` akzeptiert explizite Codes. Format wie bestehende ADRs (z. B. `0008-boardgame-titel-exemplar-trennung.md`).
      _Definition of Done:_ drei neue ADR-Dateien mit fortlaufender Nummer, Status `accepted`, Considered-Options-Abschnitt.
      `git commit -m "docs: add ADRs for kind-as-truth, slug migration and explicit unit codes"`

- [x] **22. Abschluss: `pnpm run verify` + Zusammenfassung**
      Gesamten `pnpm run verify` laufen lassen. Alle erzeugten/geänderten Dateien final prüfen (gezielte Liste, kein `git add .`). PR-Beschreibung vorbereiten (nicht pushen/mergen ohne Rückfrage — Branch-Schutz auf `develop`).
      _Definition of Done:_ `pnpm run verify` komplett grün.
      `git commit -m "chore: final verify pass for ludothek detail page rework"`

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Claude Sonnet 5)
- **Reasoning/Thinking:** an, hoher Effort — besonders für Schritt 1/2 (Slug-Migration + Routing-Umstellung, Backfill-Kollisionslogik), Schritt 3 (kind/GameCollection-Konsistenz, beidseitige Zuweisung), Schritt 10 (Event-Aggregat-Berechnung mit Regal-Zuordnung) und Schritt 16 (Scan-oder-Auswahl-Dialoge, die bestehende mehrstufige Scan-Flows auf Single-Game-Kontext reduzieren).
- **Begründung:** Der Plan enthält mehrere Migrations- und Konsistenz-Entscheidungen mit echten Nebenwirkungen (Routing bricht bestehende URLs, `kind`-Zustandsautomatik, Event-Scoping-Logik) — kein Fall für ein kleineres Modell, aber auch kein hochgradig unklarer Umbau, der Opus rechtfertigen würde, da alle fachlichen Entscheidungen durch die Grilling-Session bereits eindeutig getroffen sind.
