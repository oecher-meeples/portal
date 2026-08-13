# Ausführungsplan: Ludothek — Feedback aus dem Live-Review (Detailseite, Grid, Listenansicht)

- **Erstellt/Aktualisiert:** 2026-08-13
- **Ziel:** Live-Review-Feedback nach dem Merge der Titelbasis-Detailseite (#121/#122) umsetzen: Button-Erkennbarkeit, Ribbon-Corner-Lesbarkeit (Grid **und** Liste), deutlich größere Listenzeile, Erweiterungs-Zuordnung neu anordnen, ein zusammengeführter Exemplare-Bereich, Rückgabe-an-Person-Suche, ein Eintrag pro Titel in **Grid, Liste und Kompakt** samt Exemplar-Auswahl-Popup für mehrdeutige Aktionen.
- **Quelle:** Nutzer-Feedback aus einer Live-Review-Session (Screenshots Grid-Karte „Catan: Seafarers“, Listenzeile „Catan: Seafarers“, Listenansicht „Catan“ ×2) — nicht in einer separaten Grilling-Datei zusammengefasst, direkt hier übernommen.
- **Git-Base-State:** Branch `feature/ludothek-detail-titelbasis`, HEAD `80c5727` — **noch nicht** gemerged/gepusht. Dieser Plan baut auf demselben Branch weiter (kein neuer Branch nötig, da nichts gemerged ist).

## Persona

Siehe `.claude/plans/ludothek-detailseite-aktionen-grilling-execution-plan.md` — dieselbe Rolle (Senior Full-Stack Engineer, Next.js 16/Prisma/Tailwind v4/Base UI), dieselben Schichtregeln aus `CLAUDE.md`.

## Bereits gemerkte Standing-Regel (nicht Teil der Schritte, gilt ab jetzt immer)

> Jeder Button muss als solcher erkennbar sein — kein `variant="ghost"`/plain Style als Standard für Trigger-Buttons. Gespeichert in `buttons-need-visible-affordance.md` (persistentes Memory). Schritt 1 dieses Plans behebt die bereits existierenden Verstöße; künftige Arbeit soll das nicht erneut einführen.

## Vom Nutzer entschiedene Design-Fragen

- **Ein-Zeile-pro-Titel + Filter-Interaktion:** Ein Titel erscheint bei einem Zustand-Filter, wenn **irgendein** Exemplar passt (nicht: alle). Die zusammengeführte Zeile zeigt den Zustand nach Priorität „frei“ > „ausgeliehen“ > „wartung“ > „nicht-erfasst“ — der „beste“ Zustand unter den Exemplaren gewinnt die angezeigte Pille.
- **Umfang der Titel-Zusammenführung:** Betrifft **alle drei** Ansichten — Grid, Liste **und** Kompakt bekommen je eine Kachel/Zeile pro Titel statt pro Exemplar (nicht nur Liste, wie ursprünglich aus dem Feedback-Wortlaut vermutet).

## Offene Design-Frage (noch zu klären, betrifft Schritt 6)

- **Aufenthalts-Historie bei mehreren Exemplaren:** pro Exemplar in der Tabelle aufklappbar, oder eine gemeinsame Historie-Liste mit Exemplar-Spalte? Dieser Plan nimmt „aufklappbar pro Exemplar-Zeile“ an, sofern nicht anders entschieden.

## Getroffene Annahme (kein Blocker, aber bei Bedarf ansprechen)

- **Grid-Kachel-Bearbeiten-Button bleibt unverändert:** Das Feedback zu „Bearbeiten öffnet Titel-Dialog statt Mängelvermerk“ und „Mängelvermerk ins Aktionen-Menü“ (Schritt 10) war wörtlich auf die Listenansicht bezogen. Da das Grid mit dieser Aktualisierung ebenfalls auf ein Titel-pro-Kachel-Modell wechselt, überträgt dieser Plan dieselbe Logik konsequent auch auf `GameCard`/`GameCardEditOverlay` (sonst bliebe die Grid-Kachel bei mehreren Exemplaren mehrdeutig, genau das Problem, das Schritt 10/12 in Liste/Kompakt beheben). Schritt 8 und 10 decken das entsprechend für alle drei Ansichten ab.

## Regeln für die Ausführung

Siehe Vorgänger-Plan — unverändert (Deutsch/Englisch-Split, DRY, Schichtregeln, 400-Zeilen-Grenze, `pnpm run typecheck`/Tests vor jedem Commit, `pnpm run verify` vor dem letzten Schritt, ein Schritt = ein Commit, `wip:`-Präfix bei Teilerfolg).

## Schritte

- [ ] **0. Repository vorbereiten**
      Auf `feature/ludothek-detail-titelbasis` bleiben (HEAD `80c5727`), `pnpm run test` einmal grün bestätigen.
      _DoD:_ `pnpm run test` grün, `git status` clean.
      `git commit -m "chore: verify test framework before ludothek feedback pass" --allow-empty`

- [ ] **1. Button-Affordance-Audit**
      Alle in der letzten Session eingeführten `variant="ghost"`-Trigger, die einen eigenständigen Klick-Einstiegspunkt darstellen (nicht nur ein Icon in einem bereits erkennbaren Cluster), auf `variant="outline"` umstellen: `EditBoardGameTitleDialog`-Trigger („Titel bearbeiten“), `GameListRow`/`GameCompactRow` „Bearbeiten“-Trigger, `GameActionsMenu`-Trigger („…“). Gezielter Grep über `variant="ghost"` in `components/widgets/board-game/` und `components/widgets/game-holding/`, nicht blind alles umstellen (Icon-Buttons in `StopRowNavigation`-Kontext ggf. bewusst ghost lassen, wenn bereits durch Rahmen der Zeile erkennbar — im Zweifel outline).
      _DoD:_ Screenshot-/visuelle Prüfung (kein neuer Logik-Test), bestehende Komponententests weiterhin grün.
      `git commit -m "fix(ui): give edit/actions triggers a visible outline instead of plain ghost"`

- [ ] **2. Ribbon-Corner in Grid **und** Liste: Icon entfernen, Badge vergrößern**
      `ribbon-corner.tsx` betrifft beide Größen (`default` fürs Grid, `sm` für die Listenzeile) — laut Screenshots ist die `sm`-Variante in der Listenansicht sogar noch schlechter lesbar als die Grid-Variante. Für **beide** Größen: `PackagePlus`-Icon entfernen (Text „Erweiterung“ allein trägt die Information), Breite/Rotationsursprung/Position so anpassen, dass der Text bei keiner der beiden Größen abgeschnitten wird. Nach Schritt 3 (größere Listenzeile) erneut visuell prüfen, da sich die verfügbare Cover-Fläche ändert.
      _DoD:_ visuell geprüft (rein stilistisch) für Grid **und** Liste, bestehende Ribbon-Tests (`game-card.test.tsx`, `game-list-row.test.tsx` u. a.) weiterhin grün.
      `git commit -m "fix(ui): drop the ribbon icon and enlarge both badge sizes for full-text readability"`

- [ ] **3. Listenzeile deutlich vergrößern**
      Die Größenanpassung aus dem Vorgänger-Plan (Schritt 14: `size-24`-Cover, `p-4`) reicht laut Feedback nicht — eine Listenzeile wirkt weiterhin „halb so groß wie eine Grid-Karte“. `GameListRow`: Cover deutlich größer (z. B. `size-32`/`size-36` statt `size-24`, ggf. `aspect-[3/4]` wie die Grid-Karte statt `aspect-square`, um Platz für mehr Beschreibungstext zu schaffen), Zeilen-Padding/Zeilenhöhe insgesamt erhöhen, mehr Platz für Metadaten (Spieleranzahl/Dauer/Beschreibung — ggf. `line-clamp-2` auf `line-clamp-3` o. ä. anheben, jetzt, wo mehr Höhe zur Verfügung steht). Zusammen mit Schritt 11 (Hover-Duplikat-Fix) und Schritt 2 (Ribbon) neu abstimmen, da alle drei dieselbe Zeile betreffen.
      _DoD:_ Test: Cover-Container-Klasse auf die neue Zielgröße aktualisiert (Klassen-Assertion), bestehende `game-list-row.test.tsx`-Fälle weiterhin grün.
      `git commit -m "fix(ludothek): substantially enlarge the list row to match the grid card's presence"`

- [ ] **4. `RelatedGameCard`: Entfernen-Slot einbauen**
      `related-game-card.tsx` bekommt einen optionalen `removeAction`-Slot (z. B. `onRemove?: () => Promise<ActionResult>` + Confirm, analog `ActionButton`), gerendert **innerhalb** der Karte (z. B. oben rechts, `CardCornerOverlay` oder inline neben dem Titel) statt in einer separaten Liste darunter. Kein Layout-Bruch für den Fall ohne `removeAction` (Basisspiel-Referenzkarte beim Betrachten von einer Erweiterung bekommt ggf. auch einen Entfernen-Slot, symmetrisch).
      _DoD:_ neuer Komponententest: Karte ohne `removeAction` zeigt keinen Entfernen-Button, mit `removeAction` zeigt sie ihn und ruft ihn bei Klick+Bestätigung auf.
      `git commit -m "feat(ludothek): let RelatedGameCard render its own remove action"`

- [ ] **5. `AssignExpansionDialog` aufteilen: Trigger-Position + Basisspiel-Gate**
      `game-detail-view.tsx`: „Erweiterung hinzufügen“-Trigger (nur der `ActionDialog`-Aufruf ohne die `linked`-Liste, die jetzt über Schritt 4 in die Cards wandert) **oberhalb** der Erweiterungs-Cards rendern statt darunter. Trigger nur zeigen, wenn der Titel ein **echtes Basisspiel** ist: `game.kind !== "BOARDGAME_EXPANSION" && game.baseGames.length === 0` (zusätzliche `baseGames.length`-Prüfung deckt den Fall ab, dass `kind` mangels BGG-Import noch nicht manuell korrigiert wurde, der Titel aber schon einer Basisspiel-Zuordnung hängt). Für die umgekehrte Richtung („Basisspiel zuordnen“, wenn der Titel eine Erweiterung ist) bleibt der Trigger oberhalb der Basisspiel-Referenzkarten, unverändert erlaubt. `removeExpansionAssignment`-Aufrufe wandern in die `RelatedGameCard`-Instanzen (Schritt 4) statt in `AssignExpansionDialog`s eigene Liste — `AssignExpansionDialog` wird dafür in zwei kleinere Stücke zerlegt (Trigger-Komponente separat von der bisherigen `linked`-Liste, die entfällt).
      _DoD:_ neue Tests: Trigger „Erweiterung hinzufügen“ nicht sichtbar auf einer Erweiterungs-Seite oder wenn `baseGames.length > 0`; Entfernen-Button erscheint korrekt in den Cards (Schritt 4) und ruft `removeExpansionAssignment` mit den richtigen IDs auf; bestehende `game-detail-view.test.tsx`-Fälle angepasst.
      `git commit -m "fix(ludothek): gate add-expansion trigger to base games, move it above the cards"`

- [ ] **6. Zusammengeführter „Exemplare“-Bereich, ans Seitenende verschoben**
      Neue Komponente (oder `GameCopiesSection` erweitert) fasst Exemplar-Tabelle/-Karte (Zustand, Standort/Kontakt, Admin-Aktionen — bestehend), den bisherigen „Standort“-Card-Block (`GameHoldingPanel`) und die „Aufenthalts-Historie“ in **einem** Bereich zusammen — pro Exemplar aufklappbar (offene Design-Frage oben, Annahme: Akkordeon pro Zeile). `page.tsx` liefert Historie für **alle** Exemplare des Titels statt nur für `game.id` (aktuell: `prisma.gameHolding.findMany({ where: { gameCopyId: game.id } })` — auf `gameCopyId: { in: copies.map(c => c.id) } }` erweitern, Gruppierung nach Exemplar beim Rendern). Der neue Bereich wird in `game-detail-view.tsx` **zuletzt** platziert, nach „Erweiterungen“ und „Erklärung“ (Beschreibung/Video). Alte, jetzt redundante Blöcke (separate „Standort“-Card, separate „Aufenthalts-Historie“-Card, `GameZustandPill` neben dem Cover) entfernen.
      _DoD:_ `game-copies-section.test.tsx` erweitert um History-Akkordeon-Fälle; `game-detail-view.test.tsx` prüft Reihenfolge (Exemplare-Bereich nach Erweiterungen/Erklärung); `page.tsx`-Query-Änderung mit Test (falls in Scope, sonst manuell verifiziert, da Route-Datei von Coverage ausgenommen).
      `git commit -m "feat(ludothek): merge exemplar table, standort and history into one section at the page end"`

- [ ] **7. „An Person zurückgeben“ mit Personen-Suche**
      Neuer Mini-Dialog `ReturnToMeepleDialog` (analog `GiveToMeepleDialog` aus Schritt 16 des Vorgänger-Plans) nutzt `scanReturnToMeeple(gameCopyId, toMeepleId)` (bereits in `holding-actions.ts` vorhanden, bisher unverdrahtet) mit derselben `TargetPicker`-Personensuche (Such-Auswahl oder Scan). Ergänzt `holding-mini-dialogs.tsx` und wird als weiterer Eintrag im `GameActionsMenu` unter „Rückgabe“ angeboten — Klärung nötig, ob „Rückgabe“ als zwei getrennte Menüpunkte auftritt („Rückgabe (an mich)“ = bestehender `AcceptReturnDialog`, „Rückgabe an Person“ = neu) oder als ein Dialog mit Auswahl „an mich“ vs. „an Person“ (Empfehlung: ein Dialog mit Umschalter, um das Menü nicht zu überladen).
      _DoD:_ neue Tests analog `GiveToMeepleDialog`: manuelle Auswahl löst `scanReturnToMeeple` aus, simulierter Scan setzt das Zielfeld und löst dieselbe Aktion aus.
      `git commit -m "feat(ludothek): add person-search to the Rückgabe mini-dialog"`

- [ ] **8. Grid, Liste und Kompakt: ein Eintrag pro Titel**
      Neue Aggregations-Funktion (`lib/ludothek/browser.ts` oder neue Datei `lib/ludothek/title-grouping.ts`, je nach Zeilenbudget) gruppiert `LudothekGame[]` nach `boardGameId` zu einer Titel-Zeile mit `copyCount`, der Liste aller `copyIds` (für Schritt 12) und aggregiertem Zustand nach Priorität „frei“ > „ausgeliehen“ > „wartung“ > „nicht-erfasst“. Ein Titel bleibt in der gefilterten Liste, wenn **irgendein** Exemplar zu den aktiven Filtern passt. `LudothekResults`/`GameCard`/`GameListRow`/`GameCompactRow` erhalten die gruppierten Zeilen für **alle drei** Ansichten. Admin-Aktionen (Schritt 10–12) referenzieren dann nicht mehr zwingend genau ein Exemplar.
      _DoD:_ neue Unit-Tests für die Aggregations-Funktion (mehrere Exemplare, gemischter Zustand, `copyCount`/`copyIds` korrekt, „irgendein Exemplar passt“-Filterlogik), `ludothek-browser.test.tsx`/`ludothek-results`-Tests angepasst: Grid, Liste und Kompakt zeigen je genau einen Eintrag für zwei Exemplare desselben Titels.
      `git commit -m "feat(ludothek): show one card/row per title in grid, list and compact"`

- [ ] **9. „(x2)“-Anzeige hinter dem Titel**
      `GameCard`/`GameListRow`/`GameCompactRow`: grauer Suffix `(x{copyCount})` direkt hinter dem Titel, nur wenn `copyCount > 1` (kein Suffix bei genau einem Exemplar).
      _DoD:_ Test: kein Suffix bei 1 Exemplar, `(x2)` bei 2, `(x3)` bei 3 — für alle drei Ansichten.
      `git commit -m "feat(ludothek): show the copy count next to the title when more than one exists"`

- [ ] **10. „Bearbeiten“ öffnet Titel-Dialog, Mängelvermerk wandert ins Aktionen-Menü**
      `GameListRow`/`GameCompactRow`: „Bearbeiten“-Button ruft `EditBoardGameTitleDialog` auf (nicht mehr `EditBoardGameExemplarDialog`). `GameCardEditOverlay`/`GameCard` (Grid) analog: wechselt von `EditBoardGameDialog` (Titel+Exemplar kombiniert) auf `EditBoardGameTitleDialog` allein, aus demselben Grund — bei `copyCount > 1` ist „das eine“ Exemplar nicht mehr eindeutig. `GameActionsMenu` (jetzt auch im Grid verfügbar, siehe Schritt 12) bekommt einen neuen Eintrag „Mängelvermerk bearbeiten“, der `EditBoardGameExemplarDialog` öffnet — bei `copyCount > 1` erst nach Exemplar-Auswahl (siehe Schritt 12).
      _DoD:_ Tests: „Bearbeiten“-Klick öffnet in allen drei Ansichten den Titel-Dialog (Titel-Feld sichtbar, kein Zustand-Feld); Aktionen-Menü zeigt „Mängelvermerk bearbeiten“; bestehende Exemplar-Dialog-Tests entsprechend verschoben/angepasst.
      `git commit -m "fix(ludothek): edit button opens the title dialog everywhere, Mängelvermerk moves into the actions menu"`

- [ ] **11. Hover-Beschreibung: kein doppelter Text**
      `GameListRow`: aktuell zeigt der `line-clamp`-Absatz weiterhin den gekürzten Text, während das Overlay direkt darunter den vollen Text nochmal zeigt (sichtbar doppelt, siehe Screenshot). Fix: entweder den `line-clamp`-Absatz beim `expanded`-State ausblenden (nur das Overlay zeigt dann den vollen Text) oder ganz auf das Overlay verzichten und stattdessen das `line-clamp` beim Hover aufheben (kein zweites DOM-Element, echte Fortsetzung an derselben Stelle — bevorzugt, vermeidet auch das Layout-Shift-Problem, das das Overlay ursprünglich lösen sollte; ggf. `absolute`-Overlay nur noch für den zusätzlichen Rahmen/Radius aus Plan-Schritt 14 des Vorgänger-Plans nutzen, aber den Text nur einmal rendern).
      _DoD:_ Test: bei `expanded=true` erscheint der volle Beschreibungstext genau einmal im DOM, nicht zweimal.
      `git commit -m "fix(ludothek): stop rendering the list row description twice on hover"`

- [ ] **12. `GameActionsMenu` im Grid + Exemplar-Auswahl-Popup für mehrdeutige Aktionen**
      `GameCard` bekommt (analog zu Liste/Kompakt aus dem Vorgänger-Plan) ein `GameActionsMenu` neben/statt dem bisherigen alleinigen `GameCardEditOverlay` — Grid-Kacheln brauchen ab Schritt 8 dieselben Aufenthalts-Aktionen wie die anderen Ansichten, sonst wäre die Vereinheitlichung auf Titel-Basis für Grid-Nutzer eine Funktionslücke. Für **alle drei** Ansichten: wenn `copyCount > 1`, öffnet ein Klick auf einen exemplarbezogenen Menüpunkt (Geprüft, Ausleihen, Weitergeben, Rückgabe, Umlagern, Mängelvermerk bearbeiten, Deinventarisieren, Prüfung anfordern) zunächst ein Auswahl-Popup mit den verfügbaren Exemplaren (Zustand + Standort je Zeile, analog `GameCopiesSection`); erst nach Auswahl öffnet sich der eigentliche Mini-Dialog/die Aktion für genau dieses Exemplar. Ausnahme: „Weiteres Exemplar hinzufügen“ bleibt ohne Vorauswahl (braucht kein bestehendes Exemplar). Bei `copyCount === 1` entfällt das Popup, Verhalten wie bisher (direkt das einzige Exemplar).
      _DoD:_ neue Tests: `GameCard` zeigt das Aktionen-Menü bei `canManageGames`; bei 1 Exemplar kein Zwischenschritt; bei 2 Exemplaren öffnet ein exemplarbezogener Menüpunkt zuerst das Auswahl-Popup, Auswahl eines Exemplars öffnet danach den passenden Mini-Dialog mit der richtigen `gameCopyId`; „Weiteres Exemplar hinzufügen“ überspringt das Popup auch bei mehreren Exemplaren.
      `git commit -m "feat(ludothek): add the actions menu to grid cards, pick a copy before ambiguous per-copy actions"`

- [ ] **13. Abschluss: `pnpm run verify` + Zusammenfassung**
      Gesamten `pnpm run verify` laufen lassen, offene Design-Fragen (siehe oben) im Ergebnis dokumentieren, falls während der Umsetzung abweichend von der Annahme entschieden.
      _DoD:_ `pnpm run verify` komplett grün.
      `git commit -m "chore: final verify pass for ludothek feedback round"`

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5`, hoher Effort — insbesondere für Schritt 6 (Datenfluss-Umbau für Multi-Exemplar-Historie), Schritt 8 (Aggregations-/Filter-Semantik über alle drei Ansichten) und Schritt 12 (Aktionen-Menü neu im Grid + State-Machine für Popup → Mini-Dialog-Übergabe, konsistent über Grid/Liste/Kompakt).
- **Begründung:** Mehrere Schritte ändern Datenflüsse, die in der letzten Session gerade erst titelbasiert umgebaut wurden — Schritt 8 zieht diese Aggregation jetzt zusätzlich über **alle drei** Browser-Ansichten durch, während die Detailseite weiter pro Exemplar granular bleibt. Echtes Risiko für Verwechslung zwischen den Ebenen (Titel-Zeile vs. einzelnes Exemplar), daher kein Fall für ein kleineres Modell.
