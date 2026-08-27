# Ausführungsplan: Ludothek-Batch #253–#274 (10 GitHub Issues)

- **Erstellt/Aktualisiert:** 2026-08-27 00:00
- **Ziel:** 10 offene, `ready`-gelabelte GitHub Issues (#253, #255, #256, #261, #262, #263, #270, #272, #273, #274) im Repo `oecher-meeples/portal` umsetzen — von kleinen Fixes bis zur Standortmodell-Überarbeitung der Ludothek.
- **Quelle:** GitHub Issues #253, #255, #256, #261, #262, #263, #270, #272, #273, #274 (siehe `gh issue view <nummer> --repo oecher-meeples/portal --comments` für den vollen Text **inkl. Kommentare** — hier nicht dupliziert). **Wichtig:** `gh issue view` ohne `--comments` zeigt nur die Kommentar-Anzahl, nicht den Inhalt — immer mit `--comments` lesen, bevor an einem Issue-Schritt gearbeitet wird, auch wenn dieser Plan bereits alle zum Zeitpunkt 2026-08-27 vorhandenen Kommentare berücksichtigt (siehe Abschnitt "Grilling-Session" unten).
- **Git-Base-State:** Branch `develop`, HEAD `ba96f0b5896adeaa7790386f0735644bc543f4a0`

> Details, Given/When/Then und Checklisten stehen im jeweiligen GitHub-Issue — hier nicht dupliziert. Bei Bedarf `gh issue view <nummer> --repo oecher-meeples/portal --comments` ausführen (Flag nicht vergessen, siehe "Quelle" oben).

## Persona

Du bist Senior Full-Stack-Entwickler:in für dieses Next.js/TypeScript/Prisma-Repo mit strikter DDD-Layer-Architektur (`src/lib/<domäne>/` ↔ `src/components/{ui,entities,widgets,feature,layout}/`). Du kennst die Repo-eigenen Bausteine (`useAction`, `ActionButton`, `ActionDialog`, `Combobox`, etc.) und arbeitest bewusst gegen Wiederverwendung statt Neuerfindung, testgetrieben mit Vitest, und hältst dich strikt an die in `CLAUDE.md` festgelegte Import-Richtung und Dateigrößen-Grenzen.

## Getroffene Annahmen

- **Reihenfolge:** aufsteigend nach Komplexität/Risiko, nicht nach Issue-Nummer — kleine, isolierte Fixes zuerst, große strukturelle Features zuletzt. Zwischen den 10 Issues bestehen keine harten Abhängigkeiten (außer #255→#4, aber #4 ist nicht Teil dieses Batches).
- **Große Issues werden in mehrere Schritte/Commits zerlegt** (Richtwert < 1h pro Schritt), kleine Issues bleiben ein Schritt.
- **#261 Youtube-Suche:** einfacher öffentlicher Link (`youtube.com/results?search_query=...`), kein Wiederverwenden des API-basierten Admin-Suchdialogs — vermeidet Quota-Verbrauch durch nicht authentifizierte Besucher.
- **#261 Youtube-Icon:** Custom-SVG im Repo ergänzen (kein neues Icon-Paket als Dependency).
- **#270 Massenimport-Erweiterung** (Exemplar-Erzeugung) ist laut Issue explizit **nicht** Teil dieses Batches — nur das `inventoryNumber`-Feld + Validierung + UI-Anzeige.
- **#273 Standortmodell (Grilling-Session 2026-08-27, ersetzt Issue-Annahme "EventShelfAssignment bleibt unangetastet"):** Baum-Ansatz statt separater Zuordnungstabelle. Neue `StorageUnitKind.EVENT` — eine Event-`StorageUnit` pro Event ist die Wurzel des Standort-Baums für die Event-Dauer. Stufe 1 (Verladen zu Hause, noch keine Regal-QR-Codes bekannt): Exemplare werden per Sammel-Umlagern direkt auf die Event-Unit gebucht. Stufe 2 (vor Ort, Regale aufgebaut): die physischen Regal-`StorageUnit`s werden per normalem Umlagern unter die Event-Unit gehängt (`parentUnitId` = Event-Unit) — Exemplare wandern danach vom Sammel-Platz aufs jeweilige Regal. `isGameInEventRoom()` (`src/lib/events/guest-area.ts:75`) wird umgebaut: Anwesenheit = Ahnenkette der Holding-Unit erreicht die Event-Unit. `EventShelfAssignment` wird für diese Anwesenheits-Frage **nicht mehr gelesen** (Tabelle bleibt im Schema bestehen, verliert aber ihre Rolle) — Issue #273 wurde bereits entsprechend aktualisiert (2026-08-27). Event-Unit: `keeperMeepleId = null` (analog "Unsortiert", CONTEXT.md), Code `OM-EVENT-{event.slug}`, lazy per `upsert` erzeugt (analog `ensureUnsortiertUnit()`). Event-Auswahl in der Event-Ausgabe-Ansicht nutzt bestehendes `findUpcomingEvents()`/`resolveSelectedEventId()` (`lib/events/upcoming.ts`) statt neuer Query. Kein Zeit-Gate an `event.endsAt` — Anwesenheit bleibt rein Holding-basiert, auch nach Event-Ende (damit liegengebliebene/verlorene Spiele im Admin-Bestand auffallen statt still zu verschwinden). Event-Ausgabe und Event-Rückgabe nutzen einen gemeinsamen neuen "Sammel-Umlagern"-Baustein (CONTEXT.md-Konzept, bisher nirgends implementiert) in `src/lib/ludothek/` statt zweier separater Ad-hoc-Actions — Ziel-Unit einmal wählen/scannen, danach Loop aus Exemplar-Scan → Umlagern.
- Test-Framework (Vitest) ist bereits im Repo vorhanden und konfiguriert — Schritt 1 "Testframework einrichten" entfällt als Auswahl-Schritt, wird stattdessen als Verifikations-Schritt behandelt.
- Migrationen laufen über Prisma (`prisma migrate dev`), passend zum bestehenden Schema-Workflow des Repos.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt) — insbesondere die Repo-eigenen Bausteine aus `CLAUDE.md` (Abschnitt "Vor dem Wiedererfinden") nutzen statt neu erfinden.
- Halte dich strikt an die Schichten- und Import-Richtung aus `CLAUDE.md` (`src/lib/<domäne>/` ↔ `ui → entities → widgets → feature → layout`). Bei Unsicherheit: geteilten Code in die richtige Schicht verschieben statt die ESLint-Regel aufzuweichen.
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf das jeweilige GitHub-Issue.
- Dateien über 400 Zeilen aufteilen; Kleinkomponenten unter 100 Zeilen nur, wenn mehrfach importiert (siehe `CLAUDE.md`).
- Erstelle eine passende Ordnerstruktur, orientiert an bestehenden Feature-Ordnern.
- **Unit-Tests:** Für neue Logik/Funktionen Unit-Tests schreiben (Coverage-Scope: `src/lib/**` und `src/components/**/actions.ts`, siehe `CLAUDE.md`). Definition of Done gilt erst bei grünen Tests. Ausgenommen: rein mechanische/nicht-testbare Schritte (Migration-Boilerplate, reine UI-Verdrahtung ohne Logik).
- **Committe nur selbst geschriebene Dateien** — kein `git add .`, sondern gezielt `git add <datei>`.
- **Blockierende Prozesse** (Port, Datei-Lock) darfst du gezielt beenden, statt den Schritt abzubrechen.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert < 1h).
- **Vor jedem Commit:** `pnpm run verify` lokal laufen lassen (format:check + typecheck + lint + test) — analog zum pre-push-Hook, damit Fehler pro Schritt sichtbar werden statt sich zu häufen.
- **Bei Fehlschlag eines Schritts:** Definition of Done teilweise erfüllt? → Teilstand committen (Präfix `wip:`), Schritt mit `[!]` markieren, Fehler kurz notieren, **weiter mit dem nächsten Schritt** (nicht abbrechen). Nicht erfüllt → nichts committen, trotzdem `[!]` markieren und weiter. Erst nach **allen** Schritten alle offenen Punkte gesammelt auf Deutsch besprechen.
- Markiere jeden erledigten Schritt mit `[x]`, sobald abgeschlossen und committet.
- Bei jedem Issue-bezogenen Schritt: Prisma-Schema-Änderungen erfordern `prisma migrate dev --name <beschreibend>` und ggf. Anpassung von `prisma/seed.ts`, falls betroffene Modelle dort geseedet werden (Demo-Daten bleiben scope-konform, siehe `CONTEXT.md`).

## Schritte

- [x] **0. Repository-Zustand verifizieren**
      Prüfen: `git status` sauber auf `develop` bei HEAD `ba96f0b5`, `pnpm install` aktuell, `pnpm run verify` läuft grün als Baseline. Feature-Branch `feature/issues-batch-253-274` von `develop` abzweigen (Branch-Schutz auf `develop`, siehe `CLAUDE.md`).
      _Definition of Done:_ Branch erstellt, `pnpm run verify` grün auf Baseline.
      `git commit -m "chore: verify baseline before issue batch" --allow-empty`

- [x] **1. Testframework-Baseline verifizieren**
      Vitest ist bereits eingerichtet (`pnpm run test`). Nur verifizieren, dass ein Beispieltest existiert und grün läuft — kein neues Setup nötig.
      _Definition of Done:_ `pnpm run test` läuft grün, mind. ein bestehender Test dient als Referenzmuster für neue Tests.
      _(Kein Commit — reiner Verifikationsschritt, siehe Annahmen.)_

- [x] **2. #262 — BGG-Import: https-Validierung für Youtube-Links**
      `isYoutubeLink()` (`src/lib/bgg/client.ts:220-226`) um `protocol === "https:"`-Prüfung erweitern (oder neue Validierungsfunktion). `http://`-Links werden beim Import normalisiert auf `https://` oder verworfen (Entscheidung: verwerfen, da BGG selbst kein zuverlässiges `http`→`https`-Mapping garantiert — Feld bleibt leer statt fehlerhaftem Link). Test in `src/lib/bgg/client.test.ts` für den `http://`-Fall ergänzen.
      _Definition of Done:_ `pnpm run verify` grün, neuer Test für `http://`-Ablehnung ist grün.
      `git commit -m "fix: reject http:// youtube links during bgg import"`

- [x] **3. #262 — Bestehende http://-Datensätze bereinigen**
      Einmaliges Skript in `scripts/` (Präzedenzfall: `scripts/merge-duplicate-catan-title.ts` — dort liegen bereits einmalige Daten-Cleanup-Skripte, nicht in `prisma/`) identifiziert `BoardGame.explainerVideoUrl`-Einträge mit `http://`-Schema und setzt sie auf `null` (oder auf `https://`, falls das Zielhost eindeutig YouTube ist und `https` unterstützt — pragmatisch: auf `null` setzen, da kein verlässliches Auto-Fix möglich ist). Skript einmalig gegen die lokale/Dev-DB laufen lassen und Ergebnis im Commit-Text dokumentieren.
      _Definition of Done:_ Skript läuft fehlerfrei, keine `http://`-Youtube-Links mehr in der DB (lokal verifiziert per Query).
      `git commit -m "chore: clean up existing http youtube links in db"`

- [x] **4. #253 — SingleSlider: Track-Fill ausblendbar machen**
      `SingleSlider` (`src/components/ui/range-slider.tsx`) erhält Prop `hideTrackFill` (Default `false`), der den `SliderPrimitive.Indicator` bedingt rendert. Spieleranzahl- und Sprachneutralität-Filter (`src/components/feature/ludothek/ludothek-filter-panel.tsx:185,272`) setzen `hideTrackFill`. Andere `SingleSlider`-Nutzungen bleiben unverändert (Default `false`).
      _Definition of Done:_ `pnpm run verify` grün; visuell (Storybook/Dev-Server) geprüft, dass nur Dot sichtbar ist.
      `git commit -m "feat: add hideTrackFill prop to SingleSlider for player-count and language filters"`

- [x] **5. #263 — Alter Haupttitel wird automatisch Sekundärtitel**
      `promoteAlternateNameToTitle()` (`src/lib/ludothek/board-game-alternate-names.ts:57-95`) erweitern: ist `secondaryTitle` leer, wird der bisherige Haupttitel dorthin geschrieben statt in die Alternativtitel-Liste. Ist bereits ein Sekundärtitel gesetzt, bleibt bisheriges Verhalten (Alternativtitel-Eintrag) unverändert. **Vor der Implementierung prüfen** (Grilling-Session 2026-08-27), ob sich das Lösch-oder-Ersetzen-Muster aus der Schwester-Funktion `promoteAlternateNameToSecondaryTitle()` (`:104-134`, identisches Verschiebe-/Lösch-Verhalten) als gemeinsamer Helper extrahieren lässt, statt die Fallunterscheidung ein zweites Mal zu schreiben. Tests für beide Fälle in der zugehörigen `.test.ts`-Datei ergänzen.
      _Definition of Done:_ beide Given/When/Then-Fälle aus dem Issue haben grüne Tests, `pnpm run verify` grün.
      `git commit -m "feat: auto-promote old main title to secondary title when unset"`

- [x] **6. #261 — Youtube-Such-URL-Builder + Icon**
      Neue Utility-Funktion (z. B. `src/lib/utils/youtube-search.ts` oder Erweiterung von `src/lib/utils/youtube.ts`) baut `https://www.youtube.com/results?search_query=<Titel>+Regeln` (DE) bzw. `+rules` (EN), inkl. URL-Encoding des Spieltitels. Custom-SVG-Icon `YoutubeIcon` als flache Datei `src/components/ui/youtube-icon.tsx`, 1:1 nach dem Vorbild von `InstagramIcon` (`src/components/ui/instagram-icon.tsx`: `SVGProps<SVGSVGElement>`, `stroke="currentColor"`) — kein neuer `icons/`-Unterordner. Unit-Test für den URL-Builder (Encoding, DE/EN-Suffix).
      _Definition of Done:_ Tests für URL-Builder grün, Icon rendert fehlerfrei in Isolation.
      `git commit -m "feat: add youtube rules-search url builder and icon"`

- [x] **7. #261 — Buttons auf Spiele-Detailseite integrieren**
      Zwei Buttons ("Nach Regeln auf Youtube suchen" / "Search for rules on Youtube") mit Youtube-Icon neben/unter dem Erklärvideo in `src/components/feature/ludothek/game-detail-view.tsx` (nahe `explainer-video.tsx`-Einbindung, Zeile ~261). Buttons sind normale `<a target="_blank" rel="noopener noreferrer">`-Links auf die in Schritt 6 gebaute URL.
      _Definition of Done:_ `pnpm run verify` grün; manuell im Dev-Server geprüft, dass beide Buttons die korrekte Youtube-Suche öffnen.
      `git commit -m "feat: add youtube rules-search buttons to game detail page"`

- [x] **8. #272 — Query: aktive GameHoldings nach Meeple gruppiert**
      Neue Query-Funktion in `src/lib/ludothek/` (z. B. `holdings-by-meeple.ts`, analog zu `holdings-lookup.ts`) gruppiert aktive `GameHolding`-Einträge nach `meepleId`, liefert je Meeple die Liste ausgeliehener Spiele inkl. Ausleihdatum. **Bewusste Abweichung von `isLoanHolding()`:** alle offenen Personen-Holdings werden gezeigt, unabhängig vom `origin` — auch ein Meeple, der gerade nur eine Rückgabe zur Einlagerung entgegennimmt, taucht auf (Grilling-Session 2026-08-27: Ziel ist "wo befinden sich Spiele gerade physisch", nicht die engere Ausleihe-Definition aus CONTEXT.md). Unit-Tests mit mehreren Meeples/Exemplaren, inkl. Fall Rückgabe-Empfänger.
      _Definition of Done:_ Tests grün, `pnpm run verify` grün.
      `git commit -m "feat: add query grouping active game holdings by meeple"`

- [x] **9. #272 — Ausleihe-Übersichtsseite (Accordion + Badge)**
      Neue Route/Ansicht (z. B. Unterseite von `admin/bestand`), UI-Pattern 1:1 nach Vorbild `src/components/feature/admin-mitglieder/mitglieder-table.tsx:78-86` (Accordion + Badge mit Anzahl). Nutzt die Query aus Schritt 8.
      _Definition of Done:_ Seite lädt fehlerfrei, zeigt Meeples mit Badge und aufklappbarem Akkordion; `pnpm run verify` grün.
      `git commit -m "feat: add borrowed-games-by-meeple overview page for game wardens"`

- [x] **10. #274 — Permission-Bypass im Holding-Erzeugungspfad**
      Bypass sitzt **nur im Erzeugungspfad**, nicht in `confirmHolding()` (Grilling-Session 2026-08-27: Issue-GWT beschreibt nur den Zuweisungs-Moment, nicht ein nachträgliches Erzwingen fremder offener Zuweisungen). Bestehende gemeinsame Stelle `confirmationFor(recordedByMeepleId, receivingMeepleId)` (`src/lib/ludothek/holdings.ts:90-95`, genutzt von `borrowGame` und `handOverGame`) wird permission-aware: hat die zuweisende Person (`recordedByMeepleId`) die Permission `games:manage`, wird sofort `confirmedAt = new Date()` zurückgegeben, unabhängig davon ob sie mit `receivingMeepleId` übereinstimmt. `confirmHolding()` bleibt unverändert. Tests für beide Pfade (mit/ohne `games:manage`) ergänzen.
      _Definition of Done:_ Given/When/Then aus Issue #274 (Spielewart-Pfad) hat grünen Test, bestehender Meeple-Bestätigungs-Pfad bleibt unverändert getestet.
      `git commit -m "feat: allow games:manage permission to bypass holding confirmation"`

- [x] **11. #274 — Meeple-Such-Combobox**
      Neue Komponente auf Basis von `src/components/ui/combobox.tsx` für Meeple-Suche (z. B. `src/components/entities/meeple-combobox.tsx`, da fachobjektbezogene Anzeige ohne Mutation). Ersetzt `MeeplePickerFor` (`game-holding-panel.tsx`) und den "Bei"-Filter-Picker (`ludothek-filter-panel.tsx`).
      _Definition of Done:_ beide bisherigen Picker-Stellen nutzen die neue Combobox, `pnpm run verify` grün, manuell geprüft (Suche filtert korrekt).
      `git commit -m "feat: replace meeple picker lists with searchable combobox"`

- [x] **12. #270 — Schema: inventoryNumber auf GameCopy**
      Prisma-Schema: `GameCopy` erhält `inventoryNumber String @unique` (nullable während Migration falls Bestandsdaten fehlen, danach ggf. befüllen). `prisma migrate dev --name add-game-copy-inventory-number`. Eindeutigkeits-Constraint auf DB-Ebene.
      _Definition of Done:_ Migration läuft fehlerfrei gegen lokale Dev-DB, Prisma-Client generiert.
      `git commit -m "feat: add unique inventoryNumber field to GameCopy schema"`

- [x] **13. #270 — Vorschlagslogik + Validierung**
      Neue Funktion in `src/lib/ludothek/` (z. B. `game-copy-inventory-number.ts`) berechnet Vorschlag = höchste geparste vorhandene Nummer + 1 (Grilling-Session 2026-08-27: **kein** Lücken-Auffüllen wie bei `nextUnitCode()`/`codes.ts` — bewusst einfacher, da `inventoryNumber` freier Text mit externer Fortsetzung ist). Validierungsfunktion prüft Eindeutigkeit beim Speichern und liefert Fehlermeldung bei Kollision. Unit-Tests für Vorschlagslogik (leere Tabelle, nicht-numerische Bestandswerte) und Kollisionsfall.
      _Definition of Done:_ Tests grün für Vorschlag + Kollisionserkennung, `pnpm run verify` grün.
      `git commit -m "feat: add inventory number suggestion and uniqueness validation"`

- [x] **14. #270 — UI-Integration (Dialoge + Anzeige)**
      Inventarnummer-Feld (vorbelegt, editierbar) in `add-game-copy-dialog.tsx` und `edit-board-game-exemplar-dialog.tsx`. Anzeige auf Detailseite, Admin-Bestand, Copy-Picker (Ausleihe), Scan/Inventur — jeweils an bestehende Anzeige-Stellen für Exemplar-Kennung angehängt (keine neue Komponente je Stelle, gemeinsame Formatierung falls mehrfach verwendet nach DRY in `src/lib/` oder `components/entities/` auslagern).
      _Definition of Done:_ Inventarnummer sichtbar an allen fünf genannten Stellen, Kollisions-Fehlermeldung im Dialog sichtbar getestet, `pnpm run verify` grün.
      `git commit -m "feat: wire inventory number field into copy dialogs and display surfaces"`

- [x] **15. #256 — Filter-UI + Meeple-Kontext-Query**
      Neue Filter-Option "Erklärbär vorhanden" im Ludothek-Filterpanel (`ludothek-filter-panel.tsx`). Query-Erweiterung: filtert Spiele auf ≥1 `ExplainerGame`-Eintrag (Meeple-Kontext, immer sichtbar). Unit-Test für den Meeple-Kontext-Pfad.
      _Definition of Done:_ Test grün, Filter im UI sichtbar und funktional für eingeloggte Meeples.
      `git commit -m "feat: add explainer-available filter for logged-in meeples"`

- [x] **16. #256 — Gast-während-Event-Kontext**
      Query-Erweiterung: im Gast-während-Event-Kontext gilt eine UND-Verknüpfung (Grilling-Session 2026-08-27, deckt sich mit Issue-GWT) — ein Spiel zeigt "Erklärbär vorhanden" nur, wenn mind. ein Meeple sowohl einen `ExplainerGame`-Eintrag für **dieses** Spiel **als auch** `ExplainerAttendance` = "heute anwesend" fürs laufende Event hat. `ExplainerAttendance` ist pro Event, nicht pro Spiel — reine Anwesenheit irgendeines Erklärbären reicht nicht. Kein neues Zeit-Scheduling (Design-Entscheidung aus `CONTEXT.md` bleibt bestehen). Unit-Test für den Gast-Kontext-Pfad inkl. Fall "anwesend, aber kennt das Spiel nicht".
      _Definition of Done:_ beide Kontext-Tests (Meeple/Gast-während-Event) grün, `pnpm run verify` grün.
      `git commit -m "feat: add explainer-attendance filter variant for event guests"`

- [x] **17. #255 — BGG-Collection-Endpoint im Client**
      `src/lib/bgg/client.ts` um Funktion zum Abruf der öffentlichen BGG-Collection eines Benutzernamens erweitern (neuer XML-Endpoint-Client analog zu bestehenden Item-Lookup-Funktionen, inkl. Fehlerbehandlung für privates/nicht-existentes Profil). Unit-Test mit gemocktem XML-Response.
      _Definition of Done:_ Test grün für Erfolgs- und Fehlerfall (privates Profil, unbekannter Username), `pnpm run verify` grün.
      `git commit -m "feat: add bgg collection endpoint client"`

- [x] **18. #255 — Sichtbarkeits-Flag auf Meeple (kein neues Datenmodell)**
      **Scope drastisch verkleinert (Grilling-Session 2026-08-27):** `PrivateGameCollectionEntry` (`schema.prisma:532-544`, `meepleId` + `boardGameId` + `syncedAt`, `@@unique([meepleId, boardGameId])`) existiert bereits vollständig deckungsgleich mit dem in Issue #255 beschriebenen Ziel-Modell — aktuell nur per Seed befüllt, siehe CONTEXT.md "Privatbesitz-Eintrag". **Kein neues Modell.** Nur `Meeple` um ein Sichtbarkeits-Flag erweitern (z. B. `privateCollectionVisible Boolean @default(false)`, Feldname final abstimmen) — laut Issue-Text gehört das Freigabe-Flag explizit aufs Meeple-Profil, nicht auf die Collection-Tabelle. `prisma migrate dev --name add-meeple-private-collection-visibility`.
      _Definition of Done:_ Migration läuft fehlerfrei, Prisma-Client generiert.
      `git commit -m "feat: add private collection visibility flag to meeple"`

- [x] **19. #255 — Import-Action mit Duplikat-Erkennung**
      Neue Server Action (analog zu bestehendem Massenimport `board-games-bgg-import.ts`, aber schreibt nur `PrivateGameCollectionEntry`, keine `GameCopy`): lädt Collection über den Client aus Schritt 17, gleicht jeden Titel per BGG-ID gegen den bestehenden Katalog ab (neu anlegen falls nicht vorhanden, sonst referenzieren), schreibt Einträge per `prisma.privateGameCollectionEntry.upsert(...)` — Duplikat-Erkennung läuft über den bestehenden `@@unique([meepleId, boardGameId])`-Constraint, keine eigene Prüf-Logik nötig (Grilling-Session 2026-08-27). Manueller Trigger-Button im Meeple-Profil (`useAction`/`ActionButton` nutzen, siehe `CLAUDE.md`-Bausteine). Unit-Tests für den Upsert-Fall (Titel existiert bereits / existiert nicht).
      _Definition of Done:_ Given/When/Then "Meeple importiert Collection" aus Issue #255 hat grünen Test, `pnpm run verify` grün.
      `git commit -m "feat: add manual private bgg collection import via upsert"`

- [x] **20. #255 — Sichtbarkeits-Filter in bestehende Query einziehen**
      **Scope drastisch verkleinert (Grilling-Session 2026-08-27):** Filter-UI, Anzeige-Komponente und Query existieren bereits vollständig und scharf geschaltet — `ludothek-browser.tsx:185-194` (private Sektion inkl. "privat"-Kennzeichnung), `app/ludothek/page.tsx:56-76` (lädt `PrivateGameCollectionEntry`), `buildPrivateCollectionResults()` (`private-collection.ts`, filtert nach Spieleranzahl/Dauer). **Aktuelle Lücke:** die Query in `page.tsx:60` lädt bislang ausnahmslos alle Einträge — kein Freigabe-Check, kein Ausschluss von Titeln mit bestehendem Vereinsexemplar. Nur die `where`-Klausel dieser bestehenden Query erweitern: `meeple: { privateCollectionVisible: true }` (Flag aus Schritt 18) **und** Ausschluss von Titeln, die bereits mind. ein aktives `GameCopy` haben. Tests für alle drei Given/When/Then-Fälle aus Issue #255.
      _Definition of Done:_ alle drei Tests grün (Import ohne Exemplare, Freigabe sichtbar, keine Freigabe unsichtbar), `pnpm run verify` grün.
      `git commit -m "feat: enforce visibility and inventory-exclusion on private collection query"`

- [x] **21. #273 — Prüfbogen erweitern (Inventur-Zustände + Scan-Loop)**
      `pruefbogen-panel.tsx` um die zwei fehlenden Zustände "Unvollständig spielbar" und "Nicht spielbar" erweitern (bestehend: Vollständig / Mangel→Wartung) sowie zusätzlich "Beschädigt", je mit Freitext-Kommentarfeld. Nach Speichern öffnet sich direkt der Scanner für das nächste Spiel (nahtloser Scan-Loop). Unit-Tests für die neuen Zustandsübergänge.
      _Definition of Done:_ Tests für alle vier Zustände grün, `pnpm run verify` grün.
      `git commit -m "feat: extend pruefbogen with additional inventory states and scan loop"`

- [x] **22. #273 — Event-Standort-Mechanismus: Baum-Ansatz (Schema + Logik)**
      **Ersetzt das ursprüngliche Standortmodell — Issue #273 bereits entsprechend aktualisiert (2026-08-27).** Neue `StorageUnitKind.EVENT`. Event-`StorageUnit` wird lazy per `upsert` erzeugt (analog `ensureUnsortiertUnit()`, `holdings-lookup.ts:107-116`), Code = `OM-EVENT-{event.slug}`, `keeperMeepleId = null` (analog "Unsortiert"). `codes.ts` (`PREFIXES`, `CODE_PATTERN`, `parseScannedCode`) um den neuen Kind/Präfix erweitern — Event-Unit wird nicht gescannt, sondern aus einer Liste gewählt, braucht also keinen im Scan-Regex vorgesehenen Code. Neue Sammel-Umlagern-Funktion in `src/lib/ludothek/` (Ziel-Unit einmal wählen, danach Loop aus Exemplar-Scan → Umlagern) — von Schritt 23 und 24 gemeinsam genutzt. `isGameInEventRoom()` (`src/lib/events/guest-area.ts:75`) umbauen: Anwesenheit = Ahnenkette der Holding-Unit erreicht die Event-Unit (ersetzt den bisherigen `EventShelfAssignment`-Ahnenketten-Check). Unit-Tests für Anlage, Sammel-Umlagern und die neue `isGameInEventRoom`-Logik (inkl. Fall "Regal wurde unter Event-Unit gehängt").
      _Definition of Done:_ Migration läuft fehlerfrei, Tests für Event-Standort-Zuordnung und umgebaute `isGameInEventRoom()` grün.
      `git commit -m "feat: add event storage unit tree mechanism to holding chain"`

- [x] **23. #273 — Event-Ausgabe-Scan-Ansicht (Stufe 1: Verladen)**
      Neue Subroute unter `admin/bestand/` — Event-Auswahl nutzt bestehendes `findUpcomingEvents()`/`resolveSelectedEventId()` (`lib/events/upcoming.ts`) statt neuer Query, danach Scan-Ansicht auf Basis des Sammel-Umlagern-Bausteins aus Schritt 22: jedes eingescannte Exemplar wird direkt auf die Event-Unit gebucht (grober Sammel-Platz, noch kein Regal bekannt). Unit-Test für die zugrundeliegende Zuordnungs-Action.
      _Definition of Done:_ Scan-Flow funktional geprüft (manuell + Test der Action), `pnpm run verify` grün.
      `git commit -m "feat: add event checkout scan view under admin/bestand"`

- [x] **24. #273 — Regal-Zuordnung vor Ort (Stufe 2: Aufbau)**
      Vor Ort, sobald Regale aufgebaut sind: bestehender Umlagern-Mechanismus wird genutzt, um die physischen Regal-`StorageUnit`s per Scan unter die Event-Unit zu hängen (`parentUnitId` = Event-Unit) — kein neuer Mechanismus, Wiederverwendung von `moveStorageUnit()` (`holdings.ts:294`). Einzelne Exemplare wandern danach vom Sammel-Platz (Event-Unit direkt) aufs jeweilige Regal, ebenfalls per Sammel-Umlagern-Baustein aus Schritt 22. Unit-Test für das Umhängen einer Regal-Unit unter die Event-Unit.
      _Definition of Done:_ Test grün, `pnpm run verify` grün.
      `git commit -m "feat: nest event shelves under event storage unit on setup"`

- [x] **25. #273 — Event-Rückgabe-Scan-Ansicht**
      Neue Subroute unter `admin/bestand/` (Ziel-Lagereinheit-Auswahl + Scan-Ansicht), Sammel-Umlagern-Baustein aus Schritt 22. Eingescannte Exemplare werden der gewählten Ziel-Lagereinheit zugeordnet (weg vom Event-Standort bzw. dem Regal darunter). Unit-Test für die Zuordnungs-Action.
      _Definition of Done:_ Scan-Flow funktional geprüft, Test grün, `pnpm run verify` grün.
      `git commit -m "feat: add event return scan view under admin/bestand"`

- [x] **26. #273 — Ludothek-Übersicht: Event-Filter "nur anwesende Spiele"**
      Umgebaute `isGameInEventRoom()`-Logik aus Schritt 22 (bisher nur Detailseite) als Filter auf die Ludothek-Übersichtsseite übertragen — während eines laufenden Events werden nur Spiele angezeigt, deren Holding-Ahnenkette die Event-Unit erreicht. Kein Zeit-Gate an `event.endsAt` (Grilling-Session 2026-08-27) — Exemplare, die nach Event-Ende noch auf der Event-Unit liegen, bleiben sichtbar als Hinweis auf vergessene Rückgabe/verlorene Spiele.
      _Definition of Done:_ Filter funktional auf Übersichtsseite geprüft, `pnpm run verify` grün.
      `git commit -m "feat: add event-presence filter to ludothek overview page"`

- [x] **27. Abschluss: PR erstellen** — PR #279: https://github.com/oecher-meeples/portal/pull/279
      Feature-Branch pushen, PR gegen `develop` öffnen (Titel referenziert alle 10 Issue-Nummern, Body verlinkt `Closes #253, #255, #256, #261, #262, #263, #270, #272, #273, #274`). CI (`verify`-Check) abwarten.
      _Definition of Done:_ PR offen, CI grün.
      _(Kein Code-Commit — reiner PR-Schritt.)_

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Sonnet 5)
- **Reasoning/Thinking:** an, mittlerer bis hoher Effort — gekoppelt an den schwierigsten Schritt (#273, Schritt 22: neuer Standort-Mechanismus in der `GameHolding`-Kette ohne `EventShelfAssignment` zu missbrauchen, plus #255 Schritt 18: neues Datenmodell mit Sichtbarkeits-Constraint auf Query-Ebene).
- **Begründung:** Der Batch enthält mehrere Schritte mit echten Architektur-Trade-offs (Standortmodell #273, Sichtbarkeits-Logik #255, Permission-Bypass #274) neben rein mechanischen Fixes (#262, #253) — Sonnet 5 mit aktiviertem Thinking deckt beide Enden ab, ohne für die einfachen Schritte überzudimensioniert zu sein.

## Grilling-Session 2026-08-27 — Änderungen ggü. ursprünglichem Issue-Text

Vor der Umsetzung per `/grill-with-docs` gegen `CONTEXT.md`, `prisma/schema.prisma` und den Live-Code geprüft. Die GitHub-Issues #273, #255 und #274 wurden bereits entsprechend aktualisiert (Issue-Text und dieser Plan sind konsistent, Stand 2026-08-27):

- **#273** ([aktualisiert](https://github.com/oecher-meeples/portal/issues/273)): Standortmodell komplett neu — Baum-Ansatz (Event-`StorageUnit` als Wurzel, Regale werden vor Ort per Umlagern eingehängt) statt `EventShelfAssignment` + neuer paralleler Event-Standort. `EventShelfAssignment` wird für die Anwesenheits-Frage nicht mehr genutzt.
- **#255** ([aktualisiert](https://github.com/oecher-meeples/portal/issues/255)): Kein neues Datenmodell — `PrivateGameCollectionEntry` sowie Filter-UI/Query existieren bereits, nur ungefiltert (Datenschutz-Lücke). Scope schrumpft auf Sichtbarkeits-Flag + `where`-Erweiterung + Sync-Action.
- **#274** ([aktualisiert](https://github.com/oecher-meeples/portal/issues/274)): Bypass sitzt in `confirmationFor()`, nicht in `confirmHolding()` — engerer Scope als der ursprüngliche Issue-Befund ("confirmHolding UND handOverGame").
- **#272** (nur Plan, Issue-Text unverändert korrekt): bewusst keine `isLoanHolding()`-Filterung — zeigt alle Personen-Holdings, auch Rückgabe-Empfänger.

Details je Schritt siehe Inline-Vermerke "(Grilling-Session 2026-08-27)" oben.

**Kommentar-Check (2026-08-27):** Nur #256, #270 und #273 hatten zu diesem Zeitpunkt Kommentare — alle drei sind ältere "Für ready fehlt noch"-Notizen, deren Fragen bereits durch die (in den Issue-Bodies festgehaltenen) Entscheidungen beantwortet sind. Kein Kommentar enthielt zu diesem Zeitpunkt Information, die nicht auch im Body steht. Trotzdem vor jedem Schritt mit `--comments` neu prüfen (siehe oben) — dieser Stand kann durch neue Kommentare veralten.

## Offene mechanische Punkte (keine Entscheidung nötig, aber vor den jeweiligen Schritten beachten)

- **Schritt 12 (#270):** `GameCopy.inventoryNumber` ist `@unique`. Bereits per Seed angelegte `GameCopy`-Zeilen (`prisma/seed-data/`) brauchen beim Befüllen eindeutige Werte — bei der Umsetzung `prisma/seed.ts` prüfen (siehe generelle Regel oben, "ggf. Anpassung von `prisma/seed.ts`").
- **Schritt 22 (#273):** `PREFIXES` in `src/lib/inventory/codes.ts` ist als `Record<StorageUnitKind, string>` typisiert — das Hinzufügen von `StorageUnitKind.EVENT` zwingt den Compiler zu einem zusätzlichen Eintrag, auch wenn er von `nextUnitCode()` nie genutzt wird (Event-Codes sind deterministisch, nicht fortlaufend).
- **Schritte 9, 23–26 (#272, #273):** neue Unterseiten unter `admin/bestand/` — Definition of Done sollte explizit die `games:manage`-Permission-Gate der neuen Routen prüfen, nicht nur "Seite lädt fehlerfrei".
