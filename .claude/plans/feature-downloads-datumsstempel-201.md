---
branch: feature/downloads-datumsstempel-201
created: 2026-08-19
issues:
  201: { status: done }
---

# Plan: Downloads – Datumsstempel "zuletzt geändert" anzeigen

## Issue #201 — Downloads: Datumsstempel 'zuletzt geändert' anzeigen

`Download.updatedAt` betrifft den Datensatz (tickt auch bei Umbenennen/Statuswechsel), nicht die Datei selbst — dafür braucht es ein eigenes Feld.

- Neues Feld `Download.fileUpdatedAt` im Schema (`@default(now())`, `NOT NULL`) — Bestandsdaten bekommen per Spalten-Default das heutige Datum (nicht das alte `updatedAt`, das keine verlässliche Aussage über die Datei hat). Migration gegen die Dev-DB angewendet und verifiziert: alle bestehenden Zeilen haben jetzt `fileUpdatedAt` = heute, kein `NULL`.
- `createDownload` lässt den Schema-Default greifen; `replaceDownloadFile` setzt `fileUpdatedAt` explizit auf `new Date()` — Rename/Status/Reorder fassen es nicht an.
- `listOfflineDownloadsForAdmin()` sortiert jetzt nach `fileUpdatedAt desc` statt `updatedAt desc`, damit Sortierung und angezeigtes Datum konsistent sind.
- `DownloadListItem` (`downloads-view.tsx`) um `fileUpdatedAt: Date` erweitert, `toDownloadListItem()` in `src/app/downloads/page.tsx` mappt es durch.
- `DownloadRow` komplett neu strukturiert (drei Zeilen statt einer Metazeile):
  1. Titel + Dateityp in Klammern (`{file.title} ({file.fileType})`), Meeple-Icon (`InternalOnlyBadge`) bei `status === "INTERNAL"` — für alle sichtbar.
  2. Nur für Admins (`canManage`): Dateiname · Dateigröße.
  3. „Geändert am …“ für alle sichtbar — Admins mit Datum+Uhrzeit (`formatDateTime`), Meeples/Gäste nur mit Datum (`formatDateMedium`).
- Gilt für beide Verwendungsstellen von `DownloadRow` (öffentliche Liste in `downloads-view.tsx` und die private OFFLINE-Tabelle in `private-downloads-table.tsx`) — keine Änderung dort nötig, da beide dieselbe Row-Komponente nutzen.
- Tests angepasst: `downloads.test.ts` (Sortierfeld), `actions.test.ts` (`replaceDownloadFile` setzt `fileUpdatedAt`).
