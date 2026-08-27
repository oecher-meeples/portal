# Ausführungsplan: #19 „Epic: Events" + #151 „Epic: Event Helferplanung"

- **Erstellt:** 2026-08-27
- **Scope:** #19 (5 Sub-Issues: #122, #121, #99, #150, #151) + #151 (11 Sub-Issues: #152–#162)
- **Nicht im Scope:** #99 „Epic: Event-Essen-Gruppenbestellung" bleibt bewusst als eigener Grob-Plan (Priorität Low laut Issue, Zahlungsabwicklung ungeklärt) — wird hier nur eingeordnet, nicht in Arbeitspakete zerlegt.
- **Ausführungsmodell:** Ein-Personen-Projekt, Issues werden nacheinander abgearbeitet (`quick-sprint`-Workflow) — die Reihenfolge unten ist daher **strikt linear**, nicht parallelisierbar. Wo keine Abhängigkeit die Reihenfolge erzwingt, ist die Position eine bewusste, aber austauschbare Empfehlung.

## Ergebnis der Grilling-Session (2026-08-27)

- Domain-Modell unverändert — Abgleich gegen `CONTEXT.md` und ADR-0006/ADR-0012 ergab keine Widersprüche, keine neuen Begriffe, keine ADR-würdige Entscheidung.
- #121 wurde während der Session per `/issue-refine` geprüft: **bereits verfeinert und `ready`** (Kommentarverlauf vom 2026-08-27), inklusive AC. Neue Erkenntnis dabei: #121 hängt für einen AC-Punkt (Event-gescopter Empfehlungsfilter) an **#276 „Ludothek: Regal-Kategorisierung anhand BGG-Daten"** (offen, außerhalb #19-Scope) — blockiert aber nicht die restlichen AC-Punkte.
- #121 wird bewusst **nach #154** eingeordnet (statt vor #151-Kette): Es prüft Zugriffsschutz über die Schicht-Rechte-Logik. Vor #152/#154 gebaut, müsste dieser Zugriffsschutz nach der `ShiftType` → `HelperRole`-Migration nachträglich umgebaut werden. Nach #154 gebaut, kann es direkt gegen `hasRoleGrantedPermission` implementiert werden — kein Rework.
- #99 und #122 bleiben **außerhalb der linearen Kette**: #122 hat ungeklärte Fachfragen (Haftung, Eigentümer-Zustimmung), #99 ist bewusst grob und Priorität Low. Beide werden erst einsortiert, sobald sie geklärt bzw. priorisiert sind.

## Abhängigkeitsgraph #151 (Helferplanung)

```
152 HelperRole-Modell (Migration ShiftType)
 ├─ 153 Shift als Bedarfs-Container + Ziel-Zeitraum
 │   ├─ 157 Kalendergerüst
 │   │   ├─ 158 Helferpool-Leiste ─┐
 │   │   │                         ├─ 159 Drag & Drop (@dnd-kit)
 │   │   │   156 Meeple-Verfügbarkeit ┘   ├─ 160 Resize
 │   │   │   (braucht 155)                └─ 161 Zustand nach Zuweisung/Unassign
 │   │   └────────────────────────────────┘
 │   └─ 162 Positions-Vollständigkeitsstatus (braucht 153 + 159/160)
 └─ 154 Rechte-Generalisierung (hasRoleGrantedPermission)
       └─ 121 Ausleihe/Rückgabe-Seite (braucht zusätzlich #276 für einen AC-Punkt)

155 „Helfer suchen"-Flag & Dashboard (unabhängig)
 └─ 156 Meeple-Verfügbarkeit pro Tag (braucht 155 + 152 für Rollenauswahl)
```

## Lineare Ausführungsreihenfolge

| # | Issue | Abhängigkeit | Begründung der Position |
| --- | --- | --- | --- |
| 1 | **#150** Event anlegen: Uhrzeit fehlt | — | Grundlage für alle Zeitraum-Rechnungen (#153, #157) |
| 2 | **#152** Datenmodell `HelperRole` | — | Fundament, alles andere in #151 hängt daran |
| 3 | **#154** Rechte-Generalisierung | #152 | Direkt danach, da nur an #152 gekoppelt |
| 4 | **#121** Ausleihe/Rückgabe-Seite | #154, extern: #276 | Vermeidet Rework des Zugriffsschutzes nach der Enum-Migration; #276 blockiert nur einen AC-Punkt, Rest kann starten |
| 5 | **#153** Shift-Bedarfs-Container + Ziel-Zeitraum | #150, #152 | Nach dem Fundament, vor dem Editor |
| 6 | **#155** „Helfer suchen"-Flag & Dashboard | — | Unabhängig, aber vor #156 nötig (Einstiegspunkt) |
| 7 | **#156** Meeple-Verfügbarkeit pro Tag | #152, #155 | Rollenauswahl + Dashboard-Einstieg müssen stehen |
| 8 | **#157** Kalendergerüst | #153 | Statisches Editor-Gerüst |
| 9 | **#158** Helferpool-Leiste | #157, #156 | Braucht Kalenderspalten + Verfügbarkeitsdaten |
| 10 | **#159** Drag & Drop (@dnd-kit) | #157, #158 | Kritischer Pfad des Editors |
| 11 | **#161** Zustand nach Zuweisung & Unassign | #159 | Kleineres, in sich abgeschlossenes Stück zuerst (Empfehlung, keine Zwangsreihenfolge zu #160) |
| 12 | **#160** Zeitraum-Resize | #159 | Nach Unassign (Empfehlung) |
| 13 | **#162** Positions-Vollständigkeitsstatus | #153, #159, #160 | Braucht finale, korrekt begrenzte Zeitblöcke |

**Außerhalb der Kette, erst nach Klärung/Priorisierung einsortieren:**

- **#99** Epic: Event-Essen-Gruppenbestellung — Zahlungsabwicklung ungeklärt, Priorität Low.
- **#122** Feature-Idee: Private Exemplare am Event ausgeben — offene Haftungs-/Zustimmungsfragen, braucht eigene Grilling-Runde vor Einordnung.

## Offene Punkte vor Umsetzungsstart

- **#150**: konkreten Dateipfad des „Neues Event"-Dialogs verifizieren (`grep -rn "Neues Event" src/components`).
- **#154**: existierende Tests für `shift-rights.ts` finden/ergänzen, bevor umgebaut wird.
- **#121**: AC-Punkt zum Empfehlungsfilter bleibt blockiert, bis #276 umgesetzt ist — restliche AC-Punkte sind unabhängig umsetzbar.
- **#122**: eigene Grilling-Session vor Einordnung in eine Reihenfolge nötig (Haftungsfrage ist eine Grundsatzentscheidung).
- **#99**: Zahlungsabwicklung (bar vs. PayPal) ist eine Nutzer-Entscheidung, keine technische — vor Sub-Issue-Erstellung klären.

## Manuelle UI-Testcheckliste (nach Abschluss der jeweiligen Issues)

- [ ] **#150** — „Neues Event" anlegen: Beginn und Ende jeweils mit Datum **und** Uhrzeit erfassbar, Werte werden korrekt gespeichert (nicht mehr `--:--`).
- [ ] **#152** — Admin-UI: neue Helferrolle anlegen; bestehende Events zeigen weiterhin ihre bisherigen Rollen (Theke/Kasse/Leihe) korrekt an, jetzt als `HelperRole`-Einträge.
- [ ] **#154** — Kassen-Rechte: Meeple in einer Kassen-Schicht kann weiterhin Flohmarkt-Kassenfunktionen nutzen; außerhalb der Schicht ist der Zugriff gesperrt (Verhalten unverändert nach dem Umbau).
- [ ] **#121** — Ausleihe-Meeple in aktiver Ausleihe-Schicht: Exemplar scannen → Ausgabe ohne manuelle Eingabe; Rückgabe zeigt „bekannter Standort" (ein Klick) und „neuen Standort scannen" als gleichwertige Optionen; Seite ohne aktive Schicht gesperrt.
- [ ] **#153** — Beim Event-Anlegen/-Bearbeiten je Tag Rolle + Stellenzahl + eigenen Ziel-Zeitraum setzen können, unabhängig vom Event-Start/-Ende.
- [ ] **#155** — Checkbox „Helfer suchen" am Event aktivieren → Dashboard-Karte erscheint für Meeples und verlinkt korrekt auf die Eventseite.
- [ ] **#156** — Auf der Eventseite pro Tag Verfügbarkeitsfenster + mehrere Rollen auswählen und absenden können.
- [ ] **#157** — Schichtplan-Editor öffnen: ein Tab pro Event-Tag, Spalten je Rolle mit Breite proportional zur Stellenzahl, Zeitraster zeigt Event-Zeitraum ±4h.
- [ ] **#158** — Pool-Leiste über dem Kalender zeigt verfügbare Meeples je Rolle für den gewählten Tag; Meeples mit mehreren Rollen erscheinen in mehreren Spalten.
- [ ] **#159** — Helfer aus der Pool-Leiste per Drag&Drop auf eine Kalenderspalte derselben Rolle ziehen; Drop außerhalb der gemeldeten Verfügbarkeit oder bei zeitlicher Überlappung wird verhindert; während des Drags wird derselbe Helfer in anderen Spalten rot markiert.
- [ ] **#161** — Zugewiesenen Block fokussieren, Entf drücken → Zuweisung verschwindet; Helfer bleibt gelb markiert im Pool, solange mindestens eine weitere Zuweisung an dem Tag besteht, sonst verschwindet die Markierung.
- [ ] **#160** — Fokussierten Block per Griffpunkt oben/unten strecken/stauchen; Resize über die Verfügbarkeitsgrenze hinaus oder in eine Überlappung wird verhindert.
- [ ] **#162** — Rolle vollständig mit lückenlosen Zeitblöcken über allen Parallel-Plätzen belegen → visuelles „voll geplant"-Signal (z. B. Spalten-Header-Farbe) erscheint; bei Lücke verschwindet es wieder.
