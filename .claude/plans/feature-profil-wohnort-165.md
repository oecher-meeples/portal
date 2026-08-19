---
branch: feature/profil-wohnort-165
created: 2026-08-19
issues:
  165: { status: pending }
---

# Plan: Profil — Wohnort + Klingelschild-Notiz

## Issue #165 — Profil: Wohnort + Klingelschild-Notiz speicherbar machen

Datenschutz-Regel: `address`/`doorbellNote` sind Default nur für den Meeple selbst sichtbar
(eigenes Profil, Datenexport). Keine öffentliche Sichtbarkeit über normale Meeple-Queries.
Freigabe an LFG-Gäste passiert ausschließlich durch die explizite Autofill-Aktion in #166
(nicht Teil dieses Issues).

### Umsetzung

1. **Schema** (`prisma/schema.prisma`): `Meeple.address String?`, `Meeple.doorbellNote String?`
   direkt bei den übrigen optionalen Profilfeldern (z. B. neben `bggUsername` etc.).
2. **Migration**: `pnpm prisma migrate dev --name meeple-address-doorbell-note`.
3. **Profil-Formular** (`src/components/feature/profil/profile-details-form.tsx`) + Server
   Action (`src/components/feature/profil/actions.ts`): zwei neue optionale Freitextfelder
   ("Wohnort", "Notiz zum Klingelschild") mit `<TextField>`/`<TextAreaField>`, bestehendes
   Formularmuster wiederverwenden.
4. **Sichtbarkeit prüfen**: alle bestehenden Meeple-Listen-/Übersichts-Queries (Mitgliederliste,
   öffentliche Ansichten) daraufhin prüfen, dass `address`/`doorbellNote` nicht mit-selektiert
   werden — nur der eigene Profil-Fetch (`profil-view.tsx`) und der Datenexport dürfen sie lesen.
5. **Datenexport** (`src/lib/members/data-export.ts`, `getMemberDataExport`): `address` und
   `doorbellNote` in den `select`-Block aufnehmen (analog `bggUsername`/`telegramHandle`,
   Zeilen 58–68).
6. **Datenschutzerklärung**: Abschnitt zu Wohnort/Klingel-Notiz und Zweckbindung (LFG-Autofill,
   #166) im `LegalDocument` mit Slug `datenschutz` ergänzen — Content-Änderung, kein reiner
   Code-Task; prüfen wie bestehende Abschnitte gepflegt werden (Seed vs. Admin-Editor).
7. Tests: Server-Action-Test (Feld speichern/leer lassen), Datenexport-Test um neue Felder
   erweitern.

### Betroffene Dateien (erwartet)

- `prisma/schema.prisma` (+ Migration)
- `src/components/feature/profil/profile-details-form.tsx`
- `src/components/feature/profil/actions.ts`, `actions.test.ts`
- `src/lib/members/data-export.ts`, `data-export.test.ts`
- Datenschutzerklärung-Content (Ort noch zu ermitteln — Seed-Datei oder Admin-UI)
