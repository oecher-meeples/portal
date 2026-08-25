# Ausführungsplan: #216–#220 (Epic #215 Rollenverwaltung)

- **Branch:** `feature/rollenverwaltung-admin-215` (bereits ausgecheckt, Basis: `da91001`)
- **Reihenfolge:** #216 → #217 → #218 → #219 → #220 (Abhängigkeiten: 218 braucht 217, 219 braucht 216+217, 220 braucht 216+217+219)
- **Ein Commit pro Issue.** Kein Zwischencommit — Nacharbeiten aus der Review fließen in denselben Commit (`git commit --amend` oder `git add -A` vor dem finalen Commit, je nachdem ob schon committed wurde — siehe Ablauf unten).
- **Kontext leeren zwischen Issues:** Nach jedem "Done"-Schritt kannst du `/clear` ausführen. Zum Fortsetzen einfach: *"Lies `.claude/plans/216-220-rollenverwaltung.md` und mach weiter mit #<nächste Nummer>"*. Der Fortschritt steht unten in der Checkliste — beim Wiedereinstieg zuerst dort nachsehen, welches Issue als nächstes offen ist, dann NICHT die bereits erledigten Schritte wiederholen.
- **GH Projects Board:** Project #1 (`oecher-meeples/portal`), Feld `Status` (`PVTSSF_lADOCJfCSs4BertCzhZEEz0`), Projekt-ID `PVT_kwDOCJfCSs4BertC`. Options: In progress `47fc9ee4`, In review `df73e18b`, Done `98236657`.

## Fortschritt

- [x] #216 Server Actions für Rollen-CRUD
- [ ] #217 Dual-Listbox-Komponente
- [ ] #218 Drag & Drop zwischen den Rechte-Listen
- [ ] #219 Rollen-Verwaltungs-Dialog Integration
- [ ] #220 Tests für Rollen-Actions & -Komponenten

---

## Ablauf pro Issue (immer identisch)

1. **Board → In progress**
   ```
   gh project item-edit --id <ITEM_ID> --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 \
     --project-id PVT_kwDOCJfCSs4BertC --single-select-option-id 47fc9ee4
   ```
2. **Umsetzen** gemäß Issue-Body/Akzeptanzkriterien (Details je Issue unten) und den Schichtregeln aus `CLAUDE.md` (Server Actions → `src/lib/auth/roles.ts` + dünner Wrapper in `src/components/feature/admin-mitglieder/actions.ts`; UI-Komponenten in der richtigen Schicht: `entities`/`widgets`/`feature` je nach Wiederverwendbarkeit).
3. **Verify:** `pnpm run verify` muss grün sein, bevor der nächste Schritt passiert.
4. **Board → In review**
   ```
   gh project item-edit --id <ITEM_ID> --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 \
     --project-id PVT_kwDOCJfCSs4BertC --single-select-option-id df73e18b
   ```
5. **STOP.** Kurze Zusammenfassung der Änderungen ausgeben und auf Freigabe des Nutzers warten. Der Nutzer prüft Diff/Verhalten (ggf. `dev:restart` + manueller Klick-Test). Nacharbeiten aus dieser Prüfung fließen in dieselben, noch nicht committeten Dateien ein — **noch kein Commit vor Freigabe.**
6. **Nach Freigabe: genau ein Commit.**
   ```
   git add -A
   git commit -m "<type>(admin-mitglieder): <kurzbeschreibung> (#<nr>)

   Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
   ```
7. **Board → Done**
   ```
   gh project item-edit --id <ITEM_ID> --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 \
     --project-id PVT_kwDOCJfCSs4BertC --single-select-option-id 98236657
   ```
8. Checkbox oben in diesem Plan abhaken. **Jetzt Kontext leeren, wenn gewünscht.**

---

## #216 — Server Actions für Rollen-CRUD

Item-ID: `PVTI_lADOCJfCSs4BertCzg3CcKw`

- Neu: `createRole`, `updateRole`, `deleteRole`, `setRolePermissions` — vermutlich in `src/lib/auth/roles.ts`, dünne Wrapper in `src/components/feature/admin-mitglieder/actions.ts` (Muster: bestehendes `setMeepleRole` in derselben Datei ansehen).
- Alle vier Actions: `requirePermission("members:manage")`-Gate + `revalidatePath("/admin/mitglieder")` nach Mutation.
- Doppelter Rollenname → verständlicher Fehler statt DB-Constraint-Crash (Unique-Constraint abfangen).
- `deleteRole`: reines `prisma.role.delete(...)` reicht (Cascade via FK, `prisma/schema.prisma:153`) — keine Ersatzrolle, keine Blockade.
- `setRolePermissions`: Transaktion, die die `RolePermission`-Zeilen der Rolle exakt auf die übergebene Liste setzt (auch leere Liste = alle entfernen).
- Keine UI in diesem Issue — reine Actions, ggf. mit minimalem manuellen Test (Node-REPL/temporärer Aufruf) statt echter Tests (Tests kommen in #220).

## #217 — Dual-Listbox-Komponente

Item-ID: `PVTI_lADOCJfCSs4BertCzg3CcK4`

- Neue Komponente, vermutlich `src/components/widgets/admin/role-permissions-editor.tsx` oder unter `components/feature/admin-mitglieder/` (Layer-Entscheidung: wenn nur von diesem Feature gebraucht → `feature/admin-mitglieder/`, wenn potenziell wiederverwendbar → `widgets/`).
- Zwei Listen (verfügbar/zugewiesen) + Verschiebe-Buttons, Mehrfachauswahl, kontrollierter Client-State (Props rein/raus, keine eigene Persistierung — die übernimmt #219 via `setRolePermissions`).
- Tastaturbedienbarkeit: Tab/Pfeiltasten/Enter für Selektion und Verschieben.
- Deaktivierte Buttons bei leerer Auswahl.
- Isoliert entwickelbar/testbar ohne #216 — ggf. mit Storybook-losem manuellem Rendering in einer Testseite oder direkt mit Platzhalterdaten prüfen.

## #218 — Drag & Drop zwischen den Rechte-Listen

Item-ID: `PVTI_lADOCJfCSs4BertCzg3CcLU`

- Baut auf #217 auf — Komponente aus #217 erweitern, nicht duplizieren.
- Native HTML5 DnD (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) — keine neue Dependency.
- Mehrfachauswahl wandert beim Drag mit; Abbruch (Esc/Drop außerhalb) lässt Zustand unverändert; Buttons bleiben zusätzlich voll funktionsfähig.

## #219 — Rollen-Verwaltungs-Dialog Integration

Item-ID: `PVTI_lADOCJfCSs4BertCzg3CcMQ`

- In `src/components/feature/admin-mitglieder/admin-mitglieder-view.tsx`: neuer Bereich/Dialog, Muster `<ActionDialog>` aus `ui/` (siehe CLAUDE.md-Bausteintabelle) + `useAction()` fürs Submit-/Fehler-Handling (analog `MeepleRoleSelect`).
- "Neue Rolle anlegen": Name + Beschreibung, startet mit leerer Rechte-Zuordnung.
- "Rolle bearbeiten": Name/Beschreibung + Dual-Listbox aus #217/#218, vorbelegt mit aktuell zugewiesenen Rechten, speichert über `setRolePermissions` (#216).
- Löschen: Bestätigungsdialog mit explizitem Warntext, dass zugewiesene Mitglieder dabei rollenlos werden.
- Fehler aus Server Actions (z. B. doppelter Name) sichtbar im Dialog, kein stiller Fehlschlag.
- Rollenverwaltungs-Einstieg nur sichtbar mit `members:manage`.

## #220 — Tests für Rollen-Server-Actions und -Komponenten

Item-ID: `PVTI_lADOCJfCSs4BertCzg3CcM0`

- Unit-Tests für alle vier Actions aus #216 (Erfolg + Duplikat + fehlende Berechtigung + Cascade-Löschung).
- Komponententests Dual-Listbox (#217/#218: Verschieben beide Richtungen per Button, deaktivierter Button bei leerer Auswahl).
- Komponententests Rollen-Dialog (#219: Anlegen-Flow, Bearbeiten-Flow, Fehleranzeige).
- Ziel: `pnpm run verify` grün, Coverage-Schwelle 80 % für die neuen/betroffenen Dateien unter `src/lib/**` und `actions.ts` eingehalten (Scope siehe `vitest.config.ts`).
- Letztes Issue im Batch — nach Freigabe/Commit/Done hier: Plan ist fertig, ggf. `git push` + PR gegen `develop` (regulärer Merge-Commit, kein Squash — siehe Repo-Konvention).
