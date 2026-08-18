# Ausführungsplan: Milestone 1 — Ludothek (BGG-Import & Titel-Editor)

- **Erstellt/Aktualisiert:** 2026-08-18 12:00
- **Ziel:** Alle 9 `ready`-Issues aus GitHub-Milestone 1 (`Ludothek (BGG-Import & Titel-Editor)`, Repo `oecher-meeples/portal`) umsetzen, plus #214 (nachträglich vom Nutzer ergänzt, siehe Schritt 12).
- **Quelle:** `.claude/TODO.md` (Abschnitt „Milestone 1"), GitHub-Issues #5, #188, #198, #202, #203, #204, #205, #206, #207, #214.
- **Git-Base-State:** `develop` @ `0ec042715aee928a1b75f45db03042041283ae2e`

> Details, Akzeptanzkriterien und Kontext stehen in den jeweiligen GitHub-Issues — hier nicht dupliziert, nur referenziert. Issue #5 wurde vor Planerstellung per `issue-refine`-Skill aktualisiert (Prämisse war veraltet: `StorageUnit`/Scan-Infrastruktur existiert bereits) — der aktuelle Issue-Text ist bindend, nicht eine ältere lokale Kopie.

## Persona

Du bist Senior Full-Stack-Entwickler:in für dieses Next.js/TypeScript/Prisma-Projekt (App Router, Server Actions, PostgreSQL). Du kennst die Schichtregeln aus `CLAUDE.md` (`src/lib/<domäne>/` = DDD-Domain-Layer, `src/components/{ui,entities,widgets,feature,layout}/`) und hältst sie strikt ein, arbeitest testgetrieben (Vitest) und committest kleinteilig.

## Getroffene Annahmen

- **#5 (Kisten-Scan):** Kein neues `Box`-Modell — `StorageUnit` (Kind `BOX`) und der bestehende Scan-Flow (`scan-view.tsx`, `holding-actions.ts`, `holdings-lookup.ts`) sind die Basis. Verbleibender Scope laut aktualisiertem Issue: (a) Mehrfachtreffer-Auswahl im Serienmodus „Einlagern" statt Auto-Verarbeitung aller Treffer, (b) Ja/Nein-Rückfrage bei Kistenwechsel im aktiven Serienmodus.
- **#188 (Sprache):** Design-Entscheidung für das Regelheft-Sprachfeld auf `GameCopy`: `String?` mit ISO-639-1-Code (z. B. `"de"`, `"en"`), kein Enum — Vereins-Sprachspektrum ist nicht auf eine feste Liste eingrenzbar, ein String ist erweiterbar ohne Migration. `BoardGame.isLanguageIndependent Boolean @default(false)`.
- **#205 (Verlag/Autor/Jahr):** Wird in zwei Commits aufgeteilt (Datenmodell+BGG-Import+EAN-Priorisierung, dann Suche/Filter/Anzeige+Docs), da laut Issue selbst „ggf. in mehrere PRs aufteilen" empfohlen.
- Reihenfolge der Issues nach Risiko/Größe aufsteigend sortiert, damit frühe Commits schnell durchlaufen und spätere, größere Schritte auf einer bereits grün laufenden Suite aufbauen.
- Testframework (Vitest) und Repo sind bereits vollständig eingerichtet (siehe `vitest.config.ts`, `pnpm run test`) — Schritt 0/1 des Standard-Templates entfallen inhaltlich, werden nur als Sanity-Check durchgeführt.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt) sowie an die Schicht-Regeln aus `CLAUDE.md` (Import-Richtung `ui → entities → widgets → feature → layout`, `src/lib/**` importiert nie aus `src/components/**`).
- Prüfe vor jeder neuen Komponente/Hilfsfunktion die Bausteintabelle in `CLAUDE.md` — nichts neu erfinden, was schon existiert (`useAction`, `ActionButton`, `ActionDialog`, `TextField`, `CodeScanner`, `Combobox`-Pattern aus `create-lfg-dialog.tsx`, `formatDateTime*`, Pill-Komponenten).
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf das jeweilige Issue.
- Dateien über 400 Zeilen aufteilen (ESLint `max-lines` bricht sonst den Build).
- **Unit-Tests:** Für neue Geschäftslogik (Server Actions, `lib/**`-Funktionen) Tests schreiben — Definition of Done gilt erst bei grünen Tests. Reine UI-Komponenten ohne Fachlogik sind ausgenommen (Coverage-Scope laut `CLAUDE.md`).
- **Committe nur Dateien, die du selbst geschrieben/geändert hast** (`git add <datei>`, kein `git add .`).
- **Blockierende Prozesse:** Du darfst Prozesse beenden, die eine benötigte Ressource blockieren (Port, Datei-Lock), statt den Schritt abzubrechen.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert < 1 h), außer explizit als „kein Commit" markiert (reine GH-Statusänderungen).
- **Bei Fehlschlag eines Schritts:** Teilstand committen falls DoD teilweise erfüllt (Präfix `wip:`), sonst nichts committen. Schritt in beiden Fällen mit `[!]` markieren, Fehler kurz notieren, **mit dem nächsten Schritt fortfahren — nicht abbrechen**. Erst nach Durchlauf aller Schritte offene Punkte gesammelt auf Deutsch besprechen.
- **Keine Rückfragen während der Ausführung.** Alle nötigen Entscheidungen stehen oben unter „Getroffene Annahmen" oder in den referenzierten Issues. Ist an einer Stelle trotzdem eine Wahl zu treffen, die dort nicht abgedeckt ist: die am wenigsten invasive, mit dem Bestandscode konsistente Option wählen, kurz im Schritt dokumentieren und weiterarbeiten.
- Markiere jeden erledigten Schritt mit `[x]`, sobald er abgeschlossen und committet ist.
- **`pnpm run verify` muss vor dem letzten Schritt (Abschluss) einmal komplett grün durchlaufen**, nicht nur pro Schritt einzeln.

## GitHub-Projekt-Referenz (für die `gh`-Aufrufe unten)

- Projekt-Node-ID: `PVT_kwDOCJfCSs4BertC` (Projekt 1, Owner `oecher-meeples`)
- Status-Feld-ID: `PVTSSF_lADOCJfCSs4BertCzhZEEz0`
- Status-Optionen: „In progress" = `47fc9ee4`, „In review" = `df73e18b`
- Item-IDs je Issue:

  | Issue | Item-ID |
  | --- | --- |
  | #5 | `PVTI_lADOCJfCSs4BertCzg0cI_M` |
  | #188 | `PVTI_lADOCJfCSs4BertCzg2zgFI` |
  | #198 | `PVTI_lADOCJfCSs4BertCzg24P9k` |
  | #202 | `PVTI_lADOCJfCSs4BertCzg24xGs` |
  | #203 | `PVTI_lADOCJfCSs4BertCzg24xKs` |
  | #204 | `PVTI_lADOCJfCSs4BertCzg24xN8` |
  | #205 | `PVTI_lADOCJfCSs4BertCzg24xRo` |
  | #206 | `PVTI_lADOCJfCSs4BertCzg24xVE` |
  | #207 | `PVTI_lADOCJfCSs4BertCzg24xYQ` |
  | #214 | `PVTI_lADOCJfCSs4BertCzg29cio` |

  Statuswechsel-Befehl (Muster): `gh project item-edit --id <ITEM-ID> --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 --project-id PVT_kwDOCJfCSs4BertC --single-select-option-id <OPTION-ID>`

  Falls eine dieser ID sich als ungültig erweist (Projekt/Feld wurde zwischenzeitlich geändert): live neu auflösen mit `gh project item-list 1 --owner oecher-meeples --format json` bzw. `gh project field-list 1 --owner oecher-meeples --format json`, dann mit der frischen ID fortfahren — nicht nachfragen.

## Schritte

- [x] **0. Sanity-Check Umgebung**
      `pnpm install` (falls nötig), `pnpm run test` einmal laufen lassen — Baseline muss grün sein, bevor inhaltlich losgelegt wird.
      _Definition of Done:_ `pnpm run test` grün auf unverändertem `develop`-Stand.
      Kein Commit (keine Codeänderung).

- [x] **1. Alle 9 Issues auf „In progress" setzen**
      Für jede der 9 Item-IDs aus der Tabelle oben den Statuswechsel-Befehl mit Option-ID `47fc9ee4` ausführen.
      _Definition of Done:_ `gh project item-list 1 --owner oecher-meeples --format json` zeigt für alle 9 Issue-Nummern `"status": "In progress"`.
      Kein Commit (keine Codeänderung).

- [x] **2. #202 — BGG-Fetch setzt Boardgame-Typ (Spiel/Erweiterung)**
      Umsetzung gemäß Issue-Checkliste: `type`-Attribut aus BGG-XML in `lib/bgg/client.ts` extrahieren, `BggGameData` erweitern, Import (`board-games-bgg-import.ts`) und Abgleich (`board-game-bgg-compare.ts`) beziehen `kind` mit ein.
      _Definition of Done:_ Unit-Tests für Parsing (`type` → `BoardGameKind`) und für Compare-Diff grün; manuelles Setzen bleibt weiterhin möglich (Regressionstest).
      `git commit -m "feat(bgg): set boardgame kind from BGG type attribute on import and compare"`
      Danach: `gh project item-edit --id PVTI_lADOCJfCSs4BertCzg24xGs --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 --project-id PVT_kwDOCJfCSs4BertC --single-select-option-id df73e18b` (#202 → In review).

- [x] **3. #206 — BGG-ID-Feld: Lupen-Icon zur Namenssuche bei leerem Feld** (zusätzlich: Enter im BGG-Import-Suchfeld löst jetzt dieselbe Suche wie der Button aus, Nutzerwunsch während der Umsetzung)
      Neue `BggIdField`-Komponente (ersetzt inline `TextField` in `edit-board-game-title.tsx`), Icon nur bei leerem Feld sichtbar, nutzt bestehende `searchBggGamesAction`, Auswahl setzt nur `bggId` ohne vollen Import.
      _Definition of Done:_ Komponente rendert Icon nur bei leerem Wert; Auswahl-Callback setzt korrekt `bggId` (Test für die Logik, sofern nicht rein UI-präsentational).
      `git commit -m "feat(ludothek): add BGG name search icon to empty BGG-ID field"`
      Danach: `gh project item-edit --id PVTI_lADOCJfCSs4BertCzg24xVE --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 --project-id PVT_kwDOCJfCSs4BertC --single-select-option-id df73e18b` (#206 → In review).

- [x] **4. #207 — Boardgame-Detailansicht: External-Link-Button zur BGG-Seite**
      Icon-Button (`ExternalLink`, lucide-react) in `game-detail-view.tsx`, `target="_blank" rel="noopener noreferrer"`, nur bei vorhandener `bggId` gerendert.
      _Definition of Done:_ Bedingtes Rendering getestet (mit/ohne `bggId`), Link-Ziel korrekt `https://boardgamegeek.com/boardgame/{bggId}`.
      `git commit -m "feat(ludothek): add external BGG link button to game detail view"`
      Danach: `gh project item-edit --id PVTI_lADOCJfCSs4BertCzg24xYQ --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 --project-id PVT_kwDOCJfCSs4BertC --single-select-option-id df73e18b` (#207 → In review).

- [x] **5. #204 — Basisspiel/Erweiterung zuordnen: Autocomplete statt Dropdown**
      `AssignExpansionDialog`: natives `<select>` durch `Combobox`/`ComboboxInput`/`ComboboxPopup`/`ComboboxList`/`ComboboxEmpty` ersetzen (Pattern aus `create-lfg-dialog.tsx`). `ComboboxEmpty`-State zeigt „Spiel anlegen"-Button, öffnet `create-board-game-dialog.tsx` verschachtelt, übernimmt neu angelegtes Spiel automatisch als Auswahl.
      _Definition of Done:_ Bestehende Tests für `AssignExpansionDialog` angepasst/erweitert und grün; neuer Test für „kein Treffer → Anlegen-Flow → Auswahl übernommen".
      `git commit -m "feat(ludothek): replace expansion assignment dropdown with searchable combobox"`
      Danach: `gh project item-edit --id PVTI_lADOCJfCSs4BertCzg24xN8 --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 --project-id PVT_kwDOCJfCSs4BertC --single-select-option-id df73e18b` (#204 → In review).

- [x] **6. #203 — Titel-Editor: Sekundärtitel-Feld + Alternativtitel-Kind-Dialog + Icon-Löschbutton**
      Prisma-Migration `secondaryTitle String?` an `BoardGame`. `edit-board-game-title.tsx`: neues Feld + External-Link-Icon-Button, der einen Kind-Dialog öffnet (Pattern `explainer-video-search-dialog.tsx`) mit Haupttitel + Sekundärtitel + allen Alternativtiteln. Löschbutton in `alternate-names-manager.tsx` erhält `Trash2`-Icon statt Text.
      _Definition of Done:_ Migration angewendet (`pnpm prisma migrate dev`), Dialog zeigt alle drei Titelarten, bestehende Alternativtitel-Tests weiterhin grün + neuer Test für die erweiterte Liste.
      `git commit -m "feat(ludothek): add secondary title field and unify title list in child dialog"`
      Danach: `gh project item-edit --id PVTI_lADOCJfCSs4BertCzg24xKs --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 --project-id PVT_kwDOCJfCSs4BertC --single-select-option-id df73e18b` (#203 → In review).

- [ ] **7. #188 — Sprache erfassen (Sprachneutral-Kennzeichnung + Regelheft-Sprache je Exemplar)**
      Prisma-Migration gemäß „Getroffene Annahmen": `BoardGame.isLanguageIndependent Boolean @default(false)`, `GameCopy.rulebookLanguage String?` (ISO-639-1). Formulare `edit-board-game-title.tsx` (Sprachneutral-Checkbox) und `edit-board-game-exemplar.tsx` (Sprachfeld) ergänzen. Ludothek-Browser/-Filter: Sprachneutral-Badge (Pattern der bestehenden Pill-Komponenten, ggf. neue `LanguageIndependentPill` in `components/entities/`) + Filter. Detailseite zeigt Kennzeichnung am Titel und Regelheft-Sprache je Exemplar.
      _Definition of Done:_ Migration angewendet; Formular-Felder speichern korrekt (Server-Action-Tests); Filter-Logik in `matchesLudothekSearch()`/Browser-Query getestet.
      `git commit -m "feat(ludothek): capture language-independent flag and per-copy rulebook language"`
      Danach: `gh project item-edit --id PVTI_lADOCJfCSs4BertCzg2zgFI --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 --project-id PVT_kwDOCJfCSs4BertC --single-select-option-id df73e18b` (#188 → In review).

- [ ] **8. #205a — Verlag/Autor/Erstveröffentlichung: Datenmodell, BGG-Import, EAN-Priorisierung**
      Migration `publisher String[]`, `author String[]`, `yearPublished Int?` an `BoardGame`. `lib/bgg/client.ts`: `boardgamepublisher`/`boardgamedesigner`-Links und `yearpublished` parsen; BGG-Call mit `versions=1`, Versionsdaten (Verlag, Product Code, Jahr) auswerten. Auto-Übernahme bei identischen Werten über alle Versionen; Auswahl-UI bei Abweichungen; ältestes Jahr bei mehreren Versionen automatisch übernehmen. EAN-Suche: BGG-Product-Code vor UPCitemdb, Verlag zur Kandidaten-Sortierung.
      _Definition of Done:_ Unit-Tests für Parsing (Publisher/Autor/Jahr aus Versions-XML), für Auto-Übernahme vs. Auswahl-UI bei Abweichung, für „ältestes Jahr gewinnt", für EAN-Priorisierung (BGG-Product-Code vor UPCitemdb, Verlags-Sortierung) — alle grün.
      `git commit -m "feat(bgg): capture publisher, author and first-publication year from BGG versions"`

- [ ] **9. #205b — Verlag/Autor/Erstveröffentlichung: Suche, Filter, Anzeige, Docs**
      `matchesLudothekSearch()` um Verlag/Autor erweitern, neuer Von/Bis-Jahresfilter für Erstveröffentlichung. Verlag in `game-card.tsx` und `game-list-row.tsx` anzeigen (nicht in `game-compact-row.tsx`). `docs/features.md` und `docs/schema.md` aktualisieren.
      _Definition of Done:_ Suchtest deckt Treffer über Verlag/Autor ab; Filtertest deckt Von/Bis-Jahresbereich ab (inkl. Randfälle: nur Von, nur Bis, kein `yearPublished`); Doku-Diff vorhanden.
      `git commit -m "feat(ludothek): search and filter by publisher, author and publication year"`
      Danach: `gh project item-edit --id PVTI_lADOCJfCSs4BertCzg24xRo --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 --project-id PVT_kwDOCJfCSs4BertC --single-select-option-id df73e18b` (#205 → In review).

- [ ] **10. #198 — Ludothek: CSV-Export des Bestands**
      Export-Button auf `/admin/bestand`, sichtbar nur mit `games:manage`-Berechtigung (`requireGamesManagePermission()`). Dialog fragt vor Export den Umfang ab (a) gefilterte Auswahl, (b) kompletter Bestand ohne deinventarisierte, (c) alles inkl. deinventarisiert). CSV: Titel, EAN, Status, Zustand, Standort-Kette (`locationChain`), UTF-8 mit BOM, Komma-getrennt, Excel-kompatibel — Pattern aus `bank-csv-export-dialog.tsx`/`downloadCsv` und Parsing-Stil aus `lib/bringbuy/csv.ts`.
      _Definition of Done:_ Unit-Test für CSV-Erzeugung (Spalten, Komma-Escaping, BOM); Unit-Test für die drei Umfangs-Varianten (a/b/c liefern erwartete Teilmenge); Berechtigungsprüfung getestet (kein Button/keine Aktion ohne `games:manage`).
      `git commit -m "feat(ludothek): add CSV export for inventory with scope selection"`
      Danach: `gh project item-edit --id PVTI_lADOCJfCSs4BertCzg24P9k --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 --project-id PVT_kwDOCJfCSs4BertC --single-select-option-id df73e18b` (#198 → In review).

- [ ] **11. #5 — Lagerverwaltung: Bulk-Scan-Zuordnung (Serienmodus-Feinschliff)**
      Gemäß aktualisiertem Issue-Text (siehe GitHub #5, nach Refinement): (a) Serienmodus „Einlagern" in `scan-view.tsx` nutzt bei EAN-Mehrfachtreffer denselben Auswahl-Dialog wie der reguläre Scan-Flow statt alle Treffer automatisch zu verarbeiten; (b) beim Scannen einer anderen Kiste während aktivem Serienmodus erscheint eine Ja/Nein-Rückfrage „Letztes Spiel [Name] neu zuordnen zu Kiste [B]?" — Ja bucht das zuletzt gescannte Spiel per `relocateGame`/`scanPlaceGameInUnit` auf Kiste B um und macht B zur neuen aktiven Kiste, Nein lässt die Zuordnung unverändert und macht B trotzdem zur neuen aktiven Kiste. Gleiche Kiste erneut scannen: bestehendes Verhalten bleibt unverändert.
      _Definition of Done:_ Unit-/Component-Test für Mehrfachtreffer-Auswahl im Serienmodus; Unit-/Component-Test für Ja- und Nein-Pfad der Kistenwechsel-Rückfrage; Regressionstest für unbekannten EAN (bestehende Fehlermeldung bleibt).
      `git commit -m "feat(scan): resolve ambiguous copies and confirm box changes in batch put-away mode"`
      Danach: `gh project item-edit --id PVTI_lADOCJfCSs4BertCzg0cI_M --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 --project-id PVT_kwDOCJfCSs4BertC --single-select-option-id df73e18b` (#5 → In review).

- [ ] **12. #214 — Ludothek: BGG Average Rating speichern und anzeigen (Detailseite + Übersicht)**
      Nachträglich zum Milestone hinzugefügt (im ursprünglichen Plan übersehen, vom Nutzer während der Ausführung nachgetragen und danach zweimal per Issue-Kommentar verfeinert — Status auf GitHub bereits „In progress"). Migration `BoardGame.averageRating Float?` (analog `weight`). `lib/bgg/client.ts`: `statistics.ratings.average` parsen, `BggGameData.averageRating` ergänzen. Import (`board-games-bgg-import.ts`) übernimmt den Wert; Abgleich (`board-game-bgg-compare.ts`, `bgg-compare-panel.tsx`) bezieht ihn als Diff-Feld mit ein.
      Neue fachliche Mapping-Tabelle `lib/bgg/rating-scale.ts`: `Math.round(averageRating)` (geclamped 1–10) → BGGs 10-stufige Hex-Farbskala (`#B71C1C` … `#1B5E20`) + deutsche Bedeutungsstufe (siehe Issue-Kommentare für die vollständige Tabelle).
      Neue fachfreie `components/ui/bgg-rating-hexagon.tsx` (Hexagon, weiße Schrift, eine Nachkommastelle, Hintergrundfarbe aus `rating-scale.ts`, zweizeiliger Tooltip über die bestehende `Tooltip`-Komponente: „Durchschnittliche BGG Bewertung" + deutsche Bedeutung der gerundeten Stufe) — kein Hexagon bei `averageRating === null`.
      Rendering in `game-detail-view.tsx` **sowie** in `game-card.tsx` und `game-list-row.tsx` (Ludothek-Übersicht, Karten- und Listenansicht).
      Default-Sortierung der Übersicht in `lib/ludothek/query.ts` (`buildLudothekGames()`, aktuell `orderBy: { boardGame: { title: "asc" } }`) auf `averageRating` absteigend umstellen, Titel ohne Rating ans Ende (kein Sortier-UI-Feature, nur Default-Änderung).
      _Definition of Done:_ Unit-Test für Parsing (`average` → `averageRating`); Compare-Diff-Test für das neue Feld; Unit-Test für die Rating→Farbe/Bedeutung-Mapping-Funktion (inkl. Rundung/Clamping); Komponenten-Test für Hexagon-Rendering inkl. Farbe, zweizeiligem Tooltip und Ausblenden bei `null`; Test für die neue Default-Sortierung (inkl. Titel ohne Rating am Ende).
      `git commit -m "feat(bgg): store and display average BGG rating"`
      Danach: `gh project item-edit --id PVTI_lADOCJfCSs4BertCzg29cio --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 --project-id PVT_kwDOCJfCSs4BertC --single-select-option-id df73e18b` (#214 → In review).

- [ ] **13. Abschluss-Verifikation**
      `pnpm run verify` (format:check + typecheck + lint + test) einmal komplett laufen lassen. Bei rotem Ergebnis: Ursache im jeweiligen Schritt beheben (nicht als neuen Extra-Schritt, sondern rückwirkend im betroffenen Commit-Bereich per Fixup-Commit), bis grün.
      _Definition of Done:_ `pnpm run verify` grün.
      `git commit -m "chore: fix verify issues found in final check"` (nur falls Fixes nötig waren — sonst kein Commit, Schritt trotzdem als `[x]` markieren).

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Sonnet 5)
- **Reasoning/Thinking:** an, mittlerer bis hoher Effort (hoch speziell für Schritt 8/9 — #205)
- **Begründung:** Die meisten Schritte sind reguläre Feature-Arbeit (UI-Komponenten, Server Actions, Prisma-Migrationen) in einer bereits etablierten Codebasis — Sonnet 5 mit Standard-Reasoning deckt das zuverlässig ab. Schritt 8/9 (#205) enthält nicht-triviale Entscheidungslogik (Versions-Vergleich, Auto-Übernahme vs. Auswahl-UI, EAN-Quellen-Priorisierung mit Sortierlogik) und verdient dafür höheren Denkaufwand; kein Wechsel auf Opus nötig, da keine tiefgreifende Architekturumstellung mit unklaren Seiteneffekten vorliegt.
