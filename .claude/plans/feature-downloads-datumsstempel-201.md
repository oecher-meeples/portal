---
branch: feature/downloads-datumsstempel-201
created: 2026-08-19
issues:
  201: { status: in-review }
---

# Plan: Downloads – Datumsstempel "zuletzt geändert" anzeigen

## Issue #201 — Downloads: Datumsstempel 'zuletzt geändert' anzeigen

`Download.updatedAt` existiert bereits im Schema, wird aber nicht bis zur UI durchgereicht.

- `DownloadListItem` (`downloads-view.tsx`) um `updatedAt: Date` erweitert.
- `toDownloadListItem()` in `src/app/downloads/page.tsx` mappt `updatedAt` durch (Prisma liefert es bereits ohne `select`).
- `DownloadRow` zeigt das Datum über `formatDateTime` aus `lib/utils/format.ts` in der Metazeile an ("Geändert am …").
- Gilt für beide Verwendungsstellen von `DownloadRow` (öffentliche Liste in `downloads-view.tsx` und die private OFFLINE-Tabelle in `private-downloads-table.tsx`) — keine Änderung dort nötig, da beide dieselbe Row-Komponente nutzen.
- Kein Backend-/Migrationsaufwand, keine neuen Tests nötig (keine bestehenden Tests für diese Dateien).
