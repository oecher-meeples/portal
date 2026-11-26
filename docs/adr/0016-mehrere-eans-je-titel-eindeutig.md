---
status: accepted
supersedes: 0001-ludothek-aufenthalte-statt-exemplare.md (Aussage „EAN nicht eindeutig“)
---

# Mehrere EANs je Titel, global eindeutig

Issue #668. Jede Edition/Version eines Spiels trägt eine eigene EAN; die Spielemeta-API (`spielemeta.rodnoc.dev`) liefert sie pro Titel gleich mehrfach. Seit ADR 0008 liegen Exemplare in `GameCopy` — die Begründung aus ADR 0001, die EAN dürfe mehrfach vorkommen, weil mehrere Exemplare desselben Titels dieselbe EAN tragen, entfällt damit.

**Entscheidung:** Neue Tabelle `board_game_eans` (`BoardGameEan { boardGameId, ean @unique }`); `BoardGame.ean` entfällt. Eine EAN gehört zu **genau einem** Titel, erzwungen per DB-Unique — nicht nur in der UI.

- EANs werden vor dem Speichern über `normaliseEan()` normalisiert und mit `isValidEan()` geprüft (`lib/ludothek/board-game-eans.ts`).
- Ordnet man eine bereits vergebene EAN einem zweiten Titel zu, ist das ein Fehler, der den besitzenden Titel nennt (`EanConflictError`); der DB-Unique-Verstoß (`P2002`, Race) wird auf denselben Fehler abgebildet. Das ersetzt den früheren, nur warnenden `duplicateEanHint`.
- Jeder Lookup (Scan, Suche, Admin-Bestand) matcht über `eans: { some: { ean } }` (`eanWhere()`), findet den Titel also über jede seiner EANs.
- Datenmigration: bestehende `board_games.ean` werden normalisiert nach `board_game_eans` kopiert. Ein Duplikat über mehrere Titel lässt die Migration hart fehlschlagen — nichts wird stillschweigend verworfen.
- `BoardGameVersion.productCode` (BGG) bleibt unverändert; ein gültiger Code dient als EAN-Vorschlag, wird aber nicht automatisch gespiegelt.

**EAN-Quellen** (`searchEanForBoardGame`): gültiger BGG-Product-Code → Spielemeta (`lib/spielemeta/client.ts`, Bearer-Key `EAN_API_KEY`) → UPCitemdb als Fallback bei leerem Ergebnis oder Spielemeta-Fehler. `PARENTEAN` der API wird ignoriert.

**Nicht wieder vorschlagen:** ein erneutes „EAN nicht unique“ — Duplikate zwischen Titeln sind ein Datenfehler, der bewusst über eine Admin-Aktion aufgelöst wird, nie automatisch.
