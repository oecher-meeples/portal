---
status: accepted
---

# `kind` statt `GameCollection`-Existenz als Quelle der Wahrheit für Erweiterung/Basisspiel

Ob ein Titel eine Erweiterung ist, wurde bisher nur implizit über die Existenz einer `GameCollection`-Zuordnung (Basisspiel↔Erweiterung, #30) oder gar nicht abgebildet — vor einer Zuordnung sah ein Erweiterungs-Titel identisch aus wie ein Basisspiel. Die Detailseiten-Überarbeitung (#121/#122) braucht aber schon vor jeder Zuordnung ein verlässliches Signal (Ribbon-Corner, Options-Filterung im Zuordnungs-Dialog, Anzeige-Reihenfolge), und die manuelle Zuordnung ist aktuell der einzige Weg, `kind` zu setzen, weil der BGG-Import dafür blockiert ist (#12).

## Considered Options

- **`GameCollection`-Zeile weiterhin als alleiniges Signal, `kind` nur informativ:** verworfen — ein frisch angelegter Erweiterungs-Titel ohne Zuordnung wäre von einem Basisspiel nicht zu unterscheiden, obwohl der Titel selbst (BGG-`type`, `kind`-Feld) das eigentlich weiß.
- **`kind` als Quelle der Wahrheit, automatisch bei Zuordnung gesetzt, nie automatisch zurückgesetzt:** bevorzugt. `assignExpansion` setzt `kind` der zugewiesenen Erweiterung auf `BOARDGAME_EXPANSION`, sofern noch nicht gesetzt; `removeExpansionAssignment` lässt `kind` unverändert — ein Titel, der einmal als Erweiterung erkannt wurde, bleibt es auch nach dem Entfernen einer einzelnen Basisspiel-Zuordnung (er kann zu mehreren Basisspielen gehören, #30).
- **Zwei getrennte Booleans (`isExpansion`, `hasBaseGameAssigned`):** verworfen als unnötige Verdopplung — `kind` plus die bestehende `GameCollection`-Tabelle decken denselben Zustandsraum ab, ohne dass beide synchron gehalten werden müssten.

## Consequences

- `assignExpansion` (`lib/ludothek/board-games.ts`) aktualisiert `BoardGame.kind` als Seiteneffekt der Zuordnung — kein separater Migrations- oder Korrektur-Schritt nötig.
- Die Zuordnungs-Options-Liste (`findExpansionAssignmentOptions`) filtert Basisspiel-Kandidaten auf `kind: BOARDGAME`; Erweiterungs-Kandidaten bleiben ungefiltert, weil der BGG-Import `kind` nicht zuverlässig setzt, solange #12 offen ist.
- `EditBoardGameTitle` erlaubt zusätzlich die manuelle Korrektur von `kind` — der einzige Weg, einen Titel als Erweiterung zu markieren, bevor eine Basisspiel-Zuordnung existiert oder wenn der BGG-Import falsch lag.
- Sobald #12 den BGG-Import freigibt, sollte dieser `kind` ebenfalls direkt aus dem BGG-`type`-Attribut setzen — diese ADR ändert daran nichts, macht `kind` aber schon jetzt zur verlässlichen Anzeige-Grundlage.
