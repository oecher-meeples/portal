---
branch: feature/epic-490-mitwirkende
created: 2026-10-07
issues:
  494: { status: pending }
  493: { status: pending }
---

# Plan: quick-sprint #494, #493 (Mitwirkende, Live-Review-Nachträge)

Beide Issues sind Teil von Epic #490 und bereits teilweise auf diesem Branch umgesetzt (Commits 58dbcdd, 96183ca, 4679d88, 6fdd6f8). Dieser Sprint arbeitet die verbleibenden Checklistenpunkte ab, die beim Live-Review zu Strang A entstanden sind.

## Issue #494 — Mitwirkende: Admin-Unterseite

Ursprüngliche AC (Route, Liste, Anlegen, Zusammenführen) bereits erledigt. Offen:

- Card-Layout pro Eintrag (`components/ui/card.tsx` statt `divide-y`) in `admin-contributors-view.tsx`
- 2×2-Grid in `contributor-admin-row.tsx`: (1,1) Name+Rollen-Badges, (1,2) Anzahl Titel · BGG-ID, Zeile 2 rechtsbündig über beide Spalten (Umbruch erlaubt): Umbenennen/Zusammenführen/Löschen
- Sortier-Select (alphabetisch Default / nach Anzahl Titel absteigend) — betrifft `admin-contributors-view.tsx` (Client-seitige Sortierung der bereits geladenen `rows`, analog zum bestehenden `useMemo`-Filter)
- `pnpm run verify` grün

## Issue #493 — Mitwirkende: Spiel-Editor, Suche, Filter, Anzeige, Cutover

Bereits erledigt: Contributor-Chips im Titel-Editor, Illustrator-Filter+-Suche, Migration `publisher`/`author` entfernt. Offen:

- Verlag-/Autor-Filter in `ludothek-filter-panel.tsx`, analog `LudothekIllustratorFilter`/`mechanicsOptions`
- Illustrator-Anzeige in `game-card.tsx` und `game-list-row.tsx` (nicht `game-compact-row.tsx`)
- Warnsymbol + „+"-Button für unbekannte Namen in `contributor-names-field.tsx` (Contributor direkt mit passender Rolle anlegen, Speichern blockiert solange offen)
- Illustrator-Filter-Position: aus dem Slider-Block raus, in die Mechanik/Kategorie-Zeile (`ludothek-filter-panel.tsx:225-230` → Block ab Zeile 287)
- Neue Komponenten `ContributorRolePill` (Icon+Farbe je Rolle) und `ContributorPill` (Name+Rollen-Icons), Einsatz in Admin-Liste, Ludothek-Karten/-Liste, Boardgame-Detailseite (zwischen Spieler/Dauer/Gewichtung-Zeile und Mechaniken)
- `docs/project-structure.md`, `docs/schema.md` prüfen/aktualisieren
- `pnpm run verify` grün

Reihenfolge im Sprint: #494 zuerst (kleinerer, abgeschlossener Scope), dann #493 (größerer Scope, ggf. in mehreren Zwischen-Commits).
