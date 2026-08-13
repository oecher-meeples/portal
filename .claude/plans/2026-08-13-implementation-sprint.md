# Implementation Sprint — 2026-08-13

- **Scope:** #123, #124, #125, #126, #128, #129, #130, #131
- **Branch-Modus:** weiter auf `feature/ludothek-detail-titelbasis`
- **Board:** oecher meeples portal (Projects v2, `#1`), Status-Feld aus `.claude/project-board.json`

## Refinement-Ergebnis (via `issue-refine`)

| Issue | Einordnung | Beleg |
| --- | --- | --- |
| #123 | **already-done** | `src/components/ui/ribbon-corner.tsx` hat seit Commit `b91d1f3` bereits `justify-center` + `text-center` — Text ist in Grid (`GameCard`) und Liste (`GameListRow`) zentriert, beide nutzen die gemeinsame Komponente. Kommentar mit Beleg auf dem Issue hinterlegt, auf Nutzerwunsch **offen gelassen** (nicht geschlossen). **Nicht Teil dieses Umsetzungsplans.** |
| #124 | ready | Mechaniken-Feld ist noch Freitext (`edit-board-game-title.tsx:115`, `label="Mechaniken"`), Dialog-Breite noch nicht verdoppelt. |
| #125 | ready | `GameZustandPill` kennt nur den "besten" Zustand, keine X/Y-Verteilung (`game-zustand-pill.tsx`). |
| #126 | ready | `getSessionTier()` fällt für Admins auf `"admin"` zurück (`session.ts:65`), nicht `"mitglied"`. |
| #128 | ready | Kein `GameActionsMenu` in `game-copies-section.tsx` verdrahtet — noch keine Treffer für Menu/Ausleihen/etc. |
| #129 | ready | Kein Tooltip/ENVIRONMENT-Bezug in `logo.tsx`; `.env.example` hat `ENVIRONMENT` bereits. |
| #130 | ready | Rollen-Anzeige in `mitglieder-table.tsx:138` ist reines `join(", ")`, kein Dropdown, keine Server Action zum Ändern. |
| #131 | ready | Kein Scroll-Puffer-Block nach `<InvitesSection>` in `admin-mitglieder-view.tsx`. |

Keine unbeantworteten Diskussionen (0 Kommentare je Issue vor diesem Lauf), keine Doku-Widersprüche gefunden (`docs/Concept.md`, `docs/features.md`, `docs/schema.md` durchsucht).

## Empfohlene Umsetzungsreihenfolge

Reihenfolge nach Layer-Nähe (weniger Kontextwechsel) und Abhängigkeit (#131 baut inhaltlich auf #130 auf, gleiche Seite).

1. **#126** — Admin-Default-Ansicht = Mitglied
   - Datei: `src/lib/auth/session.ts` (`getSessionTier`)
   - Kleine, isolierte Logikänderung, aber sicherheitsrelevant (Auth-Layer) → sorgfältig testen, dass `requireAdmin`/`hasRole` unangetastet bleiben.
   - **Modell: Sonnet**

2. **#130** — Rollen-Dropdown auf `/admin/mitglieder`
   - Dateien: `mitglieder-table.tsx`, `admin-mitglieder/page.tsx`, neue Server Action für `UserRole`-Änderung.
   - Größter Scope im Sprint: neue Mutation + serverseitige Berechtigungsprüfung + UI. Sicherheitsrelevant (Rollenänderung).
   - **Modell: Sonnet, hoher Reasoning-Aufwand** — Server Action separat gegen `games:manage`/Admin-Pattern aus bestehenden Actions abgleichen (DRY: existierendes Pattern für serverseitige Rechteprüfung wiederverwenden, nicht neu erfinden).

3. **#131** — Scroll-Puffer am Ende von `/admin/mitglieder`
   - Datei: `admin-mitglieder-view.tsx`, nach `<InvitesSection>`.
   - Trivial (ein `<div>` mit `h-[20vh]` o. ä.).
   - **Modell: Sonnet (schnell/niedriger Aufwand)**

4. **#129** — Tooltip am Logo für `ENVIRONMENT`
   - Dateien: `src/components/layout/logo.tsx`, bestehender `components/ui/tooltip.tsx`.
   - Klein, keine neue Infrastruktur nötig.
   - **Modell: Sonnet (schnell/niedriger Aufwand)**

5. **#125** — Aggregierte Zustands-Pille mit X/Y-Zähler
   - Dateien: `lib/ludothek/title-grouping.ts` (muss Verteilung mitliefern), `game-zustand-pill.tsx`.
   - Erfordert Anpassung der Aggregationslogik, nicht nur der Anzeige — auf bestehende Tests für `title-grouping.ts` achten.
   - **Modell: Sonnet**

6. **#128** — Aktionsmenü in der Exemplar-Übersicht (Detailseite)
   - Datei: `game-copies-section.tsx`, Wiederverwendung von `GameActionsMenu` (bereits in Grid/Liste/Kompakt vorhanden — hier ohne Copy-Picker-Popup, da jede Zeile schon ein Exemplar ist).
   - Vier Aktionspfade (Ausleihen/Weitergeben/Prüfung/Deinventarisieren) mit unterschiedlichen Sichtbarkeitsbedingungen — DRY beachten, `GameActionsMenu`-Props wiederverwenden statt Logik zu duplizieren.
   - **Modell: Sonnet**

7. **#124** — Titel-Bearbeiten-Dialog: Breite, Reihenfolge, Mechaniken-Multiselect
   - Dateien: `edit-board-game-title.tsx`, `edit-board-game-title-dialog.tsx`, `board-game-form-values.ts` (`boardGameFormToTitleInput`/`parseMechanics`/`formatMechanics`).
   - Größter reiner Frontend-Scope: neues Multiselect+Autocomplete-Pattern für Mechaniken — prüfen, ob es im Repo schon eine Multiselect-Autocomplete-Primitive gibt (DRY), sonst als `ui/`-Baustein anlegen statt lokal in der Dialog-Datei.
   - **Modell: Sonnet**

## Hinweise für die Umsetzungssession

- Vor jedem Issue kurz gegen die oben genannten Datei:Zeile-Belege prüfen — der Code kann sich zwischen Planung und Umsetzung noch verschoben haben.
- `pnpm run verify` vor jedem Push (Format, Typecheck, Lint, Test).
- Nach Abschluss jedes Issues den Board-Status auf `In review`/`Done` setzen (Status-Feld-IDs siehe `.claude/project-board.json`).
- #123 bleibt offen (Nutzerentscheidung) — nicht Teil dieses Durchlaufs, keine Aktion nötig.
