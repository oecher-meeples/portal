---
status: accepted
---

# `createStorageUnit` akzeptiert einen expliziten Code statt immer `nextUnitCode` zu generieren

Aufbewahrungseinheiten-Codes (`OM-BOX-0001`, `OM-SHELF-0002`, …) wurden bisher ausschließlich fortlaufend über `nextUnitCode` vergeben. Das neue Standort-Feld im „Neues Spiel anlegen"-Dialog (#121/#122) scannt aber ggf. einen bereits physisch vorhandenen, aber im System noch unbekannten Einheiten-Code (z. B. eine vorbereitete, aber noch nicht digital erfasste Kiste) und muss genau diesen Code übernehmen, nicht den nächsten freien.

## Considered Options

- **Getrennte Funktion `createStorageUnitWithCode` neben dem bestehenden `createStorageUnit`:** verworfen — beide Pfade teilen sich Label-Validierung, Kollisions-Semantik und die spätere `keeperMeepleId`/`parentUnitId`-Behandlung; eine zweite Funktion hätte das doppelt pflegen müssen.
- **`createStorageUnit` um optionales `code?: string` erweitern, mit Kollisionsprüfung gegen alle Einheiten (nicht nur gleicher `kind`):** bevorzugt. Ist `code` gesetzt, wird er direkt übernommen (Fehler bei bereits vergebenem Code); ohne `code` bleibt das bisherige `nextUnitCode`-Verhalten unverändert. Die Kollisionsprüfung läuft über die gesamte Tabelle, weil `StorageUnit.code` global eindeutig ist (nicht nur pro `kind`).
- **`keeperMeepleId: "self"` als eigener Parameter statt Sentinel-String:** verworfen zugunsten des Sentinels — der Aufrufer (Standort-Feld-Komponente) kennt die eigene Meeple-ID nicht (Client-Komponente, keine Session-Daten), müsste sie sonst über einen zusätzlichen Server-Roundtrip erst abfragen. `"self"` löst serverseitig zur bereits vorhandenen `requireGamesManage()`-Rückgabe auf.

## Consequences

- `CreateStorageUnitInput.code` ist optional; bei Kollision liefert `createStorageUnit` `{ error }` statt eine Exception zu werfen, konsistent mit dem restlichen Error-Handling der Aktion.
- `CreateStorageUnitInput.keeperMeepleId` akzeptiert zusätzlich den Sentinel `"self"`, aufgelöst gegen den durch `requireGamesManage()` ermittelten Akteur.
- `createStorageUnit` und `findStorageUnitByCode` wurden dafür von `components/feature/admin-einheiten/actions.ts` nach `lib/ludothek/storage-units.ts` verschoben (Schichtregel: eine von zwei Features gebrauchte Server Action gehört nach `lib/<domäne>`, nicht in eine einzelne Feature-Slice). `components/feature/admin-einheiten/actions.ts` reexportiert beide, damit die bestehende `/admin/einheiten`-UI unverändert bleibt.
- Der „Neues Spiel anlegen"-Dialog nutzt den expliziten Code, um bei einem Scan-Fehlschlag „Aufbewahrungseinheit neu anlegen und mir zuweisen" anzubieten, statt den Nutzer zu zwingen, erst in `/admin/einheiten` zu wechseln.
