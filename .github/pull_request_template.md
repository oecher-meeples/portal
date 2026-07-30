## Was & warum

<!-- Kurz: was ändert sich, welches Problem löst es. -->

## Review-Checkliste

Automatisch geprüft (CI + `pre-push`) — hier nur ankreuzen, wenn bewusst abgewichen wurde:

- [ ] `pnpm run verify` läuft durch (typecheck, lint inkl. Schichtenregeln & 400-Zeilen-Limit, Tests)

Nicht automatisierbar — bitte bewusst prüfen (Details: [docs/project-structure.md](../docs/project-structure.md)):

- [ ] **Richtige Schicht:** Neuer Code liegt in `ui/` (fachfrei) / `entities/` (zeigt Fachobjekt) / `widgets/` (geteilter Use Case) / `feature/` (ein Use Case) / `lib/` (Geschäftsregel) — und nicht dort, wo er zuerst gebraucht wurde.
- [ ] **Kein neuer Einweg-Splitter:** Dateien unter 100 Zeilen werden mehrfach importiert, oder es ist eine begründete Ausnahme (Route-Einstieg, `"use client"`-Grenze, `layout/`-Baustein, `ui/`-Primitive).
- [ ] **DRY:** Nichts neu geschrieben, was es in der Tabelle in [CLAUDE.md](../CLAUDE.md) schon gibt (`useAction`, `ActionButton`, `ActionDialog`, `TextField`, `CodeScanner`, Datums-Formatter, Entity-Pills, `findUpcomingEvents`). `pnpm run dup` zeigt keine neuen Klone.
- [ ] **Vokabular:** „Domain" = `src/lib/<domäne>/`; Anzeige-Wissen (Farben/Tones) in `entities/`, Fach-Labels in `lib/`.
- [ ] **Doku:** Bei Struktur-/Schichtänderungen ist `docs/project-structure.md` mit angepasst.
