---
status: accepted
superseded-by: 0008-boardgame-titel-exemplar-trennung.md (Titel-/Exemplar-Trennung)
---

# Ludothek-Datenmodell: Aufenthalte statt Exemplare

> Die hier verworfene Titel-/Exemplar-Trennung wurde in [ADR 0008](0008-boardgame-titel-exemplar-trennung.md) umgesetzt, sobald echte Duplikate real wurden. Die Aufenthalts-Modellierung (dieses Dokument im Übrigen) bleibt gültig — `GameHolding` zeigt seither auf das Exemplar (`GameCopy`) statt auf `BoardGame`.

Der Verein besitzt von jedem Titel genau ein Spiel, hat kein Vereinsheim (die Kartons stehen bei den Mitgliedern) und braucht Weitergaben direkt von Person zu Person. Deshalb: **ein Datensatz pro physischem Spiel** — die EAN kennzeichnet das Produkt, nicht das Exemplar, und ist daher nicht eindeutig — sowie **eine einzige Aufenthalts-Tabelle**, in der jeder Aufenthalt entweder auf eine Aufbewahrungseinheit (Karton oder Regal) oder auf einen Meeple zeigt. Mit getrennten Standortfeldern und einer separaten Ausleih-Tabelle wären „im Karton" und „ausgeliehen" gleichzeitig speicherbar — ein physisch unmöglicher Zustand, der nur durch Anwendungslogik verhindert würde statt durch das Schema.

## Considered Options

- **Getrennte Titel- und Exemplar-Ebene (`GameCopy`) mit Ausleihbelegen (`BorrowReceipt`):** zukunftssicher für Duplikate, aber jeder Titel hätte heute genau ein Exemplar — eine Indirektion ohne Nutzen, dafür in jeder Abfrage und jeder Maske. **Nicht wieder vorschlagen, ohne dass es echte Duplikate gibt:** ein zweites Spiel desselben Titels ist einfach eine zweite Zeile mit derselben EAN, unterschieden über den Standort und bei Bedarf über einen zusätzlichen Vereins-QR-Code. Genau dafür sind `ean` und `bggId` **nicht** unique — ein `@unique` dort wieder einzuführen macht den Duplikatfall unmöglich.
- **Standortfelder am Spiel (`storageBoxId`) plus separate `Borrow`-Tabelle:** direktere Abfragen, aber drei Quellen für „wo ist es" (Freitext, Karton, offene Ausleihe), die konsistent gehalten werden müssen, und kein Platz für Weitergaben und Event-Standorte ohne ein viertes Feld.
- **Karton und Regal als getrennte Modelle:** fachlich präzise, aber Scan-Auflösung, Etikettendruck, Standortanzeige und Verantwortlichkeits-Ableitung existierten je zweimal.
- **Aufenthalt als Pflicht vs. „Standort unbekannt" erlauben:** die Pflicht gewonnen — Spiele ohne bekannten Standort liegen in der Einheit „Unsortiert", statt gar keinen Aufenthalt zu haben. Damit braucht keine Abfrage einen Null-Fall.

## Consequences

- Verfügbarkeit, „ausgeliehen" und „bei wem" sind **abgeleitet**, nicht gespeichert. Es gibt keine `Borrow`-Tabelle; „meine Ausleihen" ist eine Abfrage über Aufenthalte mit Ziel Meeple.
- Ein partieller Unique-Index (`WHERE endedAt IS NULL`) garantiert genau einen offenen Aufenthalt pro Spiel, eine `CHECK`-Constraint genau ein Ziel. Diese beiden Constraints sind das Sicherheitsnetz des ganzen Modells — nicht entfernen, um eine Migration einfacher zu machen.
- Kartons können in Regalen stehen; „Verantwortliche:r" wird die Kette hochgelaufen (Spiel → Karton → Regal → Meeple) und kann fehlen.
- `BoardGame.location` und `BoardGame.quantity` aus Phase 4 entfallen; Zeilen mit `quantity > 1` werden in entsprechend viele Datensätze aufgeteilt.
