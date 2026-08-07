# Aufgabe: Downloads-Verwaltung für Admins

## Ziel

Als angemeldeter Admin möchte ich auf der Seite "Downloads & Rechtliches"
(`/downloads`) Downloads deaktivieren/entfernen und neue Downloads hinzufügen
können. Neue Dateien werden über einen Upload direkt korrekt abgelegt (kein
manuelles Ablegen in `public/downloads/` mehr). Der Zustand jedes Downloads
(Public/Intern/Offline) wird über eine DB-Tabelle verwaltet.

## Ist-Zustand (bereits recherchiert, nicht erneut erforschen)

- Statische Liste in [src/data/downloads.ts](../../src/data/downloads.ts)
  (`DOWNLOADS: Download[]`, Felder `title`, `filetype`, `size`, `href`) wird
  in [src/app/downloads/page.tsx](../../src/app/downloads/page.tsx) gelesen
  und von
  [src/components/feature/downloads/downloads-view.tsx](../../src/components/feature/downloads/downloads-view.tsx)
  gerendert. Die zugehörigen PDFs/XLSX liegen aktuell direkt unter
  `public/downloads/`.
- `LEGAL_DOCS` (Satzung, Datenschutzerklärung, Impressum, Beitragsordnung) in
  derselben Datei ist **nicht** Teil dieser Aufgabe — das bleibt statischer
  Text aus `src/data/legal.ts`, wird nicht in die DB migriert.
- `/downloads` ist eine öffentliche Route (`minTier: "gast"` in
  [src/lib/utils/nav-config.ts](../../src/lib/utils/nav-config.ts)), aktuell
  ohne jeden Auth-Check.
- Schichtregeln aus `CLAUDE.md`/`docs/project-structure.md` gelten
  unverändert: `src/lib/<domäne>/` für Prisma/Geschäftsregeln/Server Actions,
  `src/components/{ui,entities,widgets,feature,layout}` mit fester
  Import-Richtung, max. 400 Zeilen/Datei, Coverage-Pflicht für `lib/**` und
  `**/actions.ts`.

## Vorgegebene technische Entscheidungen

Diese Entscheidungen sind bereits getroffen — der Plan referenziert sie, statt
sie erneut zur Diskussion zu stellen:

1. **Neues Prisma-Modell** `Download` in `prisma/schema.prisma`:
   - `id String @id @default(cuid())`
   - `title String`
   - `fileUrl String` (Vercel-Blob-URL bzw. bestehender lokaler Pfad für die
     migrierten Bestandsdateien)
   - `fileType String` (z. B. `"PDF"`, `"XLSX"` — aus MIME-Type/Dateiendung
     beim Upload abgeleitet)
   - `fileSizeBytes Int`
   - `status DownloadStatus @default(PUBLIC)`
   - `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`
   - Neues Enum `DownloadStatus { PUBLIC INTERNAL OFFLINE }`
   - Sortierung der öffentlichen Liste: `createdAt asc` (keine eigene
     Sortier-Spalte in diesem Schritt).
   - Migration wird gegen die Neon-Dev-DB ausgeführt
     (`prisma migrate dev`), analog zu bisherigen Migrationen im Repo.

2. **Sichtbarkeitsregel** (Analogie zu `Post.internal` in
   `src/lib/content/content.ts`):
   - `PUBLIC` → für alle sichtbar (auch nicht eingeloggte Gäste).
   - `INTERNAL` → nur sichtbar für eingeloggte Mitglieder (Tier `mitglied`
     oder `admin`, unabhängig vom Mitgliedschaftsstatus-Sonderfall
     `requireMember`).
   - `OFFLINE` → nirgends auf der öffentlichen/internen Seite sichtbar, taucht
     nur in der Admin-Verwaltungsansicht auf.
   - Query-Funktion in `src/lib/downloads/downloads.ts` analog zu
     `getPublicPosts`/`canViewContentItem`.

3. **Neue Permission** `downloads:manage` in `prisma/seed.ts`
   (`PERMISSIONS`-Array ergänzen, ausschließlich der Rolle `admin`
   zuweisen), Beschreibung z. B. "Downloads verwalten (hochladen,
   Sichtbarkeit ändern, löschen)".

4. **Upload-Flow**: bestehenden Hook
   `useBlobUpload(pathPrefix, getToken)` aus
   `src/lib/utils/use-blob-upload.ts` wiederverwenden (Pfad-Prefix z. B.
   `"downloads"`), Server-Action `getDownloadUploadToken` analog zu
   `getUploadToken` in `src/components/feature/admin-news/actions.ts`
   (`generateClientTokenFromReadWriteToken`, Content-Type-Whitelist
   `application/pdf`, `application/vnd.openxmlformats-officedocument.*`
   o. ä., `normaliseBlobPath`). Beim Löschen/Ersetzen eines Downloads
   `deleteBlobs()` aus `src/lib/utils/blob-delete.ts` aufrufen, damit keine
   verwaisten Blob-Dateien zurückbleiben.

5. **Neue Feature-Struktur**:
   - `src/lib/downloads/downloads.ts` — Queries (`listPublicDownloads`,
     `listAllDownloadsForAdmin`), Größen-Formatierung
     (`formatFileSize(bytes)` analog zu vorhandenen Format-Utilities,
     ggf. Wiederverwendung von `lib/utils/format.ts`, falls dort schon etwas
     Passendes existiert), deutsche Status-Labels
     (`DOWNLOAD_STATUS_LABELS`).
   - `src/lib/downloads/actions.ts` (oder Kolokation direkt in
     `src/components/feature/admin-downloads/actions.ts`, je nachdem was der
     bestehenden Konvention für andere Admin-Features entspricht — siehe
     `admin-news`) — Server Actions `createDownload`, `setDownloadStatus`,
     `deleteDownload`, `getDownloadUploadToken`, jede mit
     `hasPermission(user.id, "downloads:manage")`-Check nach dem Muster in
     `src/components/feature/admin-news/actions.ts`.
   - `src/components/entities/download-status-pill.tsx` — Statuspill analog
     zu `game-zustand-pill.tsx`/`membership-state-pill.tsx` (Public = grün,
     Intern = gelb/blau, Offline = grau).
   - `src/components/feature/admin-downloads/` — neues Admin-Feature:
     `admin-downloads-view.tsx` (Tabelle aller Downloads inkl. Offline,
     Status-Umschalter, Löschen-Button via `ActionButton`/`ActionDialog`),
     `download-upload-form.tsx` (Upload-Formular mit `useBlobUpload`, Titel
     Eingabefeld über `TextField`).
   - Neue Route `src/app/admin/downloads/page.tsx` (`requireAdmin()`-Guard
     wie andere `admin/*`-Routen), in die Admin-Navigation eintragen
     (`nav-config.ts`, `minTier: "admin"`, analog zu anderen
     Admin-Einträgen).
   - `DownloadsView`/`src/app/downloads/page.tsx` umstellen: statt
     statischem `DOWNLOADS`-Array die neue `listPublicDownloads()`-Query
     aufrufen und dabei die aktuelle Session-Tier berücksichtigen (Public +
     ggf. Internal), Legal-Doks-Teil (`LEGAL_DOCS`) unverändert lassen.

6. **Datenmigration Bestandsdateien**: Die vier aktuellen Einträge aus
   `DOWNLOADS` (`Mitgliedsantrag.pdf`, `SEPA-Lastschriftmandat.pdf`,
   `Ludotheks-Ordnung.pdf`, `Bring-Buy-Vorlage.xlsx`) werden per Seed-Daten
   (`prisma/seed-data/demo-downloads.ts` + Eintrag in `prisma/seed.ts`) als
   `Download`-Zeilen mit `status: PUBLIC` und `fileUrl` = bisheriger lokaler
   Pfad (`/downloads/...`) angelegt, damit nach der Migration keine
   Downloads verschwinden. `src/data/downloads.ts` wird danach auf
   `LEGAL_DOCS` reduziert (der `Download`-Typ und `DOWNLOADS`-Array
   entfallen, `LegalDoc`/`LEGAL_DOCS` bleiben bestehen).

7. **Tests**: Unit-Tests für `src/lib/downloads/downloads.ts` (Sichtbarkeits-
   filterung PUBLIC/INTERNAL/OFFLINE je Tier) und für die neuen Server
   Actions (Permission-Check greift, Blob-Löschung bei `deleteDownload`
   wird aufgerufen) — analog zu vorhandenen Tests
   `src/lib/content/content.test.ts` und
   `src/components/feature/admin-news/actions.test.ts`.

## Abgrenzung (explizit außerhalb des Scopes)

- Keine Änderungen an `LEGAL_DOCS`/`src/data/legal.ts` oder der
  Rechtliches-Detailseite (`src/app/rechtliches/[slug]/page.tsx`).
- Keine Versionierung/Historie von Downloads (kein "alte Version ersetzen
  und behalten") — ein Download-Datensatz hat genau eine aktuelle Datei.
- Keine Freigabe-Workflows (kein Vier-Augen-Prinzip) — jeder mit
  `downloads:manage` darf direkt veröffentlichen/offline nehmen/löschen.
