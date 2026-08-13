# Anforderung: Ludothek — Titel-Detailseite, Erweiterungs-Modell, Aktionen-Dropdown

Ergebnis einer `/grill-with-docs`-Session (Grilling + Domain-Modeling). Alle Punkte sind
mit dem Nutzer einzeln durchgesprochen und bestätigt — nicht erneut zur Diskussion stellen.

## Domänenmodell (bereits in `CONTEXT.md` eingetragen)

1. `BoardGame.kind` ist alleinige Quelle der Wahrheit für Basisspiel/Erweiterung —
   dauerhafte Eigenschaft, kein automatischer Rückfall auf `BOARDGAME` beim Entfernen
   der letzten `GameCollection`-Zuordnung. Rückstufung nur manuell über
   `EditBoardGameTitle`.
2. `GameCollection` ist many-to-many (eine Erweiterung kann zu mehreren Basisspielen
   passen), beidseitig zuweisbar (Basisspiel fügt Erweiterung hinzu, oder Erweiterung
   ordnet sich einem Basisspiel zu — fachlich derselbe Vorgang). Zuweisung setzt `kind`
   der Erweiterung automatisch auf `BOARDGAME_EXPANSION`, falls noch nicht gesetzt.
3. Eine Erweiterung kann selbst keine Erweiterungen haben — Auswahllisten in der
   Zuordnung müssen nach `kind` gefiltert werden: als Basisspiel-Kandidat nur
   `BOARDGAME`, als Erweiterungs-Kandidat beliebiger `kind`.
4. „Mängelvermerk" (`GameCopy.condition`) ist der Begriff für den **materiellen**
   Zustand eines Exemplars — klar abgegrenzt von „Zustand" (Ausleih-Situation:
   frei/ausgeliehen/Wartung/nicht erfasst). Siehe `CONTEXT.md`.
5. „Nicht erfasst"-Pill in der UI komplett entfernen (Zustand „nicht erfasst" impliziert
   per Definition schon fehlenden Standort — die Pille dupliziert nur eine
   selbstverständliche Abwesenheit).

## Spiele-Detailseite: Umbau von Exemplar- auf Titel-Basis

6. `/ludothek/[slug]` matcht künftig auf `BoardGame.slug` (neues Feld, aus dem Titel
   generiert, Kollisions-Suffix bei Namensgleichheit). `GameCopy.slug` entfällt als
   Routing-Basis. Migration ohne Redirects — alte Exemplar-Slug-URLs verfallen
   ersatzlos (kleine Vereinsbibliothek, kein SEO-Anspruch, keine extern geteilten
   Deep-Links).
7. Detailseite zeigt Titel-Stammdaten (Bild, Beschreibung, Spieleranzahl, Mechaniken,
   Erweiterungen/Basisspiel-Referenzen, Erklärbären, offene Gesuche — wie bisher,
   nur nicht mehr an ein einzelnes Exemplar gebunden).
8. Exemplare der Ludothek-Detailseite:
   - **Mehrere Exemplare** → Tabelle: Zustand, Standort/Kontakt, Admin-Aktionen pro
     Zeile.
   - **Genau ein Exemplar** → Card mit denselben Feldern/Aktionen.
   - Aktion **„+ Exemplar hinzufügen"** (bestehender `AddGameCopyDialog`) muss in
     beiden Fällen erreichbar sein.
9. Neue, komponierbare Bearbeiten-Bausteine:
   - `EditBoardGameTitle` — Titel-Stammdaten (Titel, Beschreibung, Mechaniken,
     Spieleranzahl, `kind`, BGG-Felder, EAN).
   - `EditBoardGameExemplar` — Exemplar-Stammdaten (Mängelvermerk/`condition`).
   - Beide einzeln nutzbar (Detailseite: Titel-Button oben, Exemplar-Button pro
     Zeile/Karte) **und** gemeinsam, visuell getrennt, in einem Dialog (Neuanlage,
     siehe Punkt 17).
10. Standort-Kette (`locationChain`) überall dort, wo sie zur Abhol-Orientierung dient
    (Standort-Block auf der Detailseite, `/admin/bestand`, Compact-Zeile, neue
    Basisspiel-Referenzkarte), neu formatiert: beginnt mit **Person** oder **Event**,
    danach Regal/Karton (z. B. „Jan Herwig → Karton 3 → Regal C4"). Bisher getrennte
    Zeilen „Standort" + „Verantwortlich" werden zu **einer** Zeile zusammengeführt.
    Der Person-Name ist ein Link, der einen **Kontakt-Dialog** öffnet (siehe Punkt 11).
11. Neue geteilte Komponente **Kontakt-Dialog**: Klick auf einen Meeple-Namen öffnet
    einen Dialog mit allen Kontaktoptionen (`getContactLinks` — Mail/Telegram).
    Ersetzt zusätzlich die bisherigen inline Icon-Links im Flohmarkt
    (`market-listing-card.tsx`, `market-listing-detail-view.tsx`) — gleiches Muster
    an beiden Stellen.
12. Basisspiel-Referenz („Erweiterung zu") und Erweiterungs-Liste — **symmetrisch**,
    beide Richtungen als rechteckige Karte: Bild links, Titel (Link zum jeweiligen
    Titel) + Standort-Kette rechts (Standort nur sichtbar wenn auflösbar, siehe
    Punkt 13 für Gast-Sicht).
13. Standort-Sichtbarkeit für Gäste (nicht eingeloggt), gilt für Basisspiel-Referenz-
    Karte und die Exemplar-Übersicht gleichermaßen:
    - **Normalfall (kein Event):** Gast sieht nur die reine Exemplar-**Anzahl** des
      Titels (z. B. „3 Exemplare im Bestand"), keine Verfügbarkeits-Bruchzahl — jedes
      existierende Exemplar ist außerhalb des Event-Betriebs bei jedem Meeple
      abholbar (siehe bestehende `Zustand`-Definition in `CONTEXT.md`).
    - **Im Event-Betrieb:** zusätzlich eine aggregierte Kennzahl „X von Y verfügbar
      (Regal Z)" — Y = Exemplare, deren Einheit aktuell per Regal-Zuordnung dem
      laufenden Event zugeordnet ist (nicht der Gesamtbestand), X = davon nicht
      gerade ausgeliehen. **Keine** einzelne Zustand-Pille pro Exemplar für Gäste,
      nur diese aggregierte Zahl. Dieselbe Regel wie im bestehenden Gäste-Bereich
      (`Regal-Zuordnung`, siehe `CONTEXT.md`).
14. Corner-Badge (`RibbonCorner`, Standard-Variante) zusätzlich am großen Cover-Bild
    der Detailseite selbst, wenn der Titel eine Erweiterung ist — zusätzlich zu den
    Basisspiel-Referenzkarten.

## Ludothek-Übersicht (Grid/Liste/Kompakt)

15. Corner-Badge (`RibbonCorner`) im Grid ist schlecht lesbar — weiter nach innen
    schieben, mehr Platz für den Text.
16. Listen-Ansicht (`GameListRow`): Hover-Overlay wirkt aktuell wie zwei getrennte
    Karten — zu **einer** visuell zusammenhängenden Karte verschmelzen (kein Gap,
    gemeinsamer Rahmen/Radius). Zeilengröße und Cover-Bild-Größe wie im Grid
    (`GameCard`) beibehalten, nicht kompakter.
17. Liste (`GameListRow`) und Kompakt (`GameCompactRow`) bekommen dieselben
    Admin-Bearbeiten-Buttons wie das Grid (`GameCardEditOverlay`-Äquivalent).
    Weitere Aktionen als **Dropdown-Menü**, rechtebasiert:
    - `games:manage`: Prüfung anfordern, Deinventarisieren, Weiteres Exemplar
      hinzufügen.
    - Jeder Meeple: „Geprüft" (Popup für Prüfungsergebnis → Statuswechsel,
      bestehend: `confirmGameCondition`/`reportGameDefect`), Ausleihen, Weitergeben,
      Rückgabe, Umlagern.
    Die Aufenthalts-Aktionen (Ausleihen/Weitergabe/Rückgabe/Umlagern) öffnen dabei
    **eigene Mini-Dialoge mit Scan-Option** (Scan als Kurzweg, manuelle
    Auswahl/Suche als Alternative) statt auf `/scan` zu verlinken.
    `/scan` bleibt unverändert in der Navigation erreichbar, wird aber nicht
    zusätzlich von der Ludothek/Detailseite aus verlinkt.
18. „+ Neues Spiel anlegen"-Button auch auf `/ludothek` (nur `canManageGames`),
    gleicher `CreateBoardGameDialog` wie in `/admin/bestand` — zeigt
    `EditBoardGameTitle` + `EditBoardGameExemplar` visuell getrennt in einem Dialog.
19. `CreateBoardGameDialog`-Erweiterung:
    - EAN-Feld bekommt ein Scan-Icon (`ScanSearchDialog`-Muster) — nach
      erfolgreichem Scan schließt der Dialog automatisch und übernimmt den Text.
    - Neues optionales **Standort**-Feld: befüllbar per Scan (löst gegen eine
      bestehende Aufbewahrungseinheit auf) **oder** über einen Button
      „Mir zuweisen" (Standort = die anlegende Person selbst, keine Einheit).
    - Scan-Fehlschlag (Code entspricht keiner bestehenden Einheit) →
      Fehlermeldung **mit** Lösungsoption „Aufbewahrungseinheit neu anlegen und mir
      zuweisen". Die neue Einheit übernimmt dabei den **exakt gescannten Code**
      (nicht neu generiert) — erfordert eine Erweiterung von `createStorageUnit`
      (`src/components/feature/admin-einheiten/actions.ts`), das bisher nur
      selbst-generierte Codes (`nextUnitCode`) kennt, um optional einen expliziten
      Code entgegenzunehmen (mit Kollisions-Check).

## Bereits erledigt (nicht Teil des Ausführungsplans)

- `CONTEXT.md` wurde während der Grilling-Session bereits aktualisiert (Erweiterung,
  GameCollection, Mängelvermerk, BGG-Abgleich-Notiz).
- GitHub Issue [#121](https://github.com/oecher-meeples/portal/issues/121) —
  Event-Schnellausleihe-Seite (`needs-refinement`, für später, nicht Teil dieses Plans).
- GitHub Issue [#122](https://github.com/oecher-meeples/portal/issues/122) —
  Private Exemplare am Event ausgeben (`needs-refinement`, für später, nicht Teil
  dieses Plans).

## ADR-Kandidaten (im Rahmen dieses Plans schreiben)

- (a) `kind` vs. `GameCollection` als Quelle der Wahrheit für „ist Erweiterung".
- (b) Slug-Migration Exemplar → Titel ohne Redirects.
- (c) `createStorageUnit` akzeptiert künftig explizite Codes statt nur generierte.
