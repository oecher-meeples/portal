# Ausführungsplan: Downloads-Verwaltung für Admins (DB-Tabelle + Upload)

- **Erstellt/Aktualisiert:** 2026-08-04 00:00
- **Ziel:** Admins können Downloads auf `/downloads` per Upload hinzufügen sowie deren Sichtbarkeit (Public/Intern/Offline) ändern oder sie entfernen, statt der bisherigen statischen Liste in `src/data/downloads.ts`.
- **Quelle:** `.claude/plans/downloads-admin-management-task.md`
- **Git-Base-State:** Branch `develop`, Commit `f6ff93767adaa0a212b7c9a85a9392fe0243ec87`

> Details, Anforderungen und Kontext stehen in der Quelldatei — hier nicht duplizieren.

## Persona

Du bist ein Senior Full-Stack-Entwickler mit Schwerpunkt Next.js (App Router), Prisma/PostgreSQL (Neon) und Vercel Blob Storage. Du kennst die DDD-Schichtenregeln dieses Repos (`src/lib/<domäne>/` vs. `src/components/{ui,entities,widgets,feature,layout}/`) aus dem Effeff und hältst dich strikt an bestehende Konventionen (Server Actions, `useAction`, `ActionDialog`, Permission-Checks), statt sie neu zu erfinden.

## Getroffene Annahmen

- Alle technischen Entscheidungen aus dem Abschnitt "Vorgegebene technische Entscheidungen" der Quelldatei gelten unverändert (Prisma-Modell `Download` + Enum `DownloadStatus{PUBLIC,INTERNAL,OFFLINE}`, Permission `downloads:manage`, Blob-Upload-Pfad `"downloads"`, Sichtbarkeitsregel analog `Post.internal`, Seed-Migration der vier Bestandsdateien, `LEGAL_DOCS`/`legal.ts` bleiben unangetastet).
- **Löschen ist ein Hard-Delete** (DB-Zeile + zugehöriger Blob via `deleteBlobs()`), zusätzlich zum separaten `OFFLINE`-Status für "nicht sichtbar, aber behalten". Kein Soft-Delete/Archivierungsfeld wie bei `BoardGame` — der Nutzer hat explizit "entfernen" als eigene Aktion neben "deaktivieren" verlangt.
- **Erlaubte Datei-Typen beim Upload:** `application/pdf` und `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (PDF/XLSX, deckt die migrierten Bestandsdateien ab). Weitere Typen sind eine spätere Erweiterung, kein Teil dieses Plans.
- **Maximale Upload-Größe:** 20 MB (`MAX_UPLOAD_BYTES`), analog zur bestehenden Konstante in `admin-news/actions.ts` (dort 8 MB für Bilder), großzügiger bemessen für Dokumente.
- `fileType` wird beim Upload aus dem MIME-Type abgeleitet (`"PDF"` / `"XLSX"`), nicht aus der Dateiendung.
- Admin-Verwaltungsseite liegt unter `/admin/downloads`, neuer Sidebar-Eintrag in `nav-config.ts` unter der bestehenden Admin-Gruppe (`minTier: "admin"`), Icon `FileText` (bereits importiert) oder `Upload` (lucide-react, falls vorhanden — sonst `FileText` wiederverwenden).
- Server Actions für Downloads liegen in `src/lib/downloads/actions.ts` (nicht in `components/feature/admin-downloads/actions.ts`), weil `src/lib/<domäne>/` die vorgeschriebene Schicht für Server Actions ist (siehe CLAUDE.md-Tabelle: "Ganzer Use Case" → `widgets/`, aber Geschäftsregeln/Prisma/Mutation → `lib/`). Die öffentliche Query wird ebenfalls dort abgelegt (`src/lib/downloads/downloads.ts`), Labels in `src/lib/downloads/labels.ts`.
- Die öffentliche `DownloadsView` bekommt serverseitig bereits gefilterte Downloads übergeben (keine Client-seitige Tier-Prüfung) — `src/app/downloads/page.tsx` ermittelt Session/Tier und ruft `listVisibleDownloads(tier)` auf.
- Bestehendes Testframework: Vitest (bereits im Repo eingerichtet, `pnpm run test`) — Schritt 1 des Standard-Templates entfällt daher inhaltlich, wird aber als No-Op-Bestätigung durchlaufen.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt).
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf die Quelldatei.
- Dateien über 400 Zeilen möglichst in kleinere Dateien aufteilen.
- Erstelle eine passende Ordnerstruktur (siehe Annahmen oben).
- **Unit-Tests:** Für neue Logik/Funktionen Unit-Tests schreiben. Die Definition of Done eines Schritts gilt erst als erfüllt, wenn die zugehörigen Tests grün sind. Ausgenommen sind rein mechanische/nicht-testbare Schritte (Config, Doku, Boilerplate).
- **Committe nur Dateien, die du selbst geschrieben hast** — andere Dateien im Working Directory ignorieren (kein `git add .`, sondern gezieltes `git add <datei>`). Insbesondere die bereits im Working Directory vorhandenen, nicht zu diesem Plan gehörenden Änderungen (`.github/ruleset-protect-develop.json`, `CLAUDE.md`, `src/lib/utils/cn.ts`, neue PDF-Dateien unter `public/downloads/`) unangetastet lassen und nicht mitcommitten.
- **Blockierende Prozesse:** Du hast die Erlaubnis, Prozesse zu beenden, die für die Ausführung eines Schritts benötigte Ressourcen blockieren (z. B. einen Port, eine Datei oder einen Lock belegen). Identifiziere den blockierenden Prozess gezielt und beende nur diesen, statt den Schritt abzubrechen.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert: < 1 h Arbeit).
- **Bei Fehlschlag eines Schritts:** prüfen, ob die Definition of Done zumindest teilweise erfüllt ist. Falls ja, den erreichten Teilstand committen (Commit-Message mit Präfix `wip:`); falls nein, nichts committen. In beiden Fällen den Schritt mit `[!]` markieren, den Fehler kurz im Schritt selbst notieren (Stichpunkt unter dem Schritt) und mit dem nächsten Schritt fortfahren — **nicht abbrechen**. Erst nachdem **alle** Schritte durchlaufen wurden (egal ob `[x]` oder `[!]`), alle offenen Punkte/Fehlschläge gesammelt auf Deutsch mit dem Nutzer besprechen.
- Markiere jeden erledigten Schritt mit `[x]`, sobald er abgeschlossen und committet ist.
- Nach jedem Schritt, der Produktionscode ändert: `pnpm run lint` und `pnpm run typecheck` fehlerfrei, bevor committet wird (Repo-Konvention, siehe `pnpm run verify`).

## Schritte

- [ ] **0. Repository vorbereiten**
      Git-Repo ist bereits vorhanden (`develop`, siehe Git-Base-State). Prüfen: `git status` zeigt den erwarteten Stand (u. a. die in den Ausführungsregeln genannten fremden Änderungen), kein `git init` nötig.
      _Definition of Done:_ `git status` läuft fehlerfrei, Branch ist `develop`.
      Kein Commit in diesem Schritt (nichts geändert).

- [ ] **1. Testframework bestätigen**
      Prüfen, dass Vitest lauffähig ist: `pnpm run test` gegen den unveränderten Stand ausführen.
      _Definition of Done:_ Bestehende Test-Suite läuft grün durch.
      Kein Commit in diesem Schritt (nichts geändert).

- [ ] **2. Prisma-Schema: Modell `Download` + Enum `DownloadStatus`**
      In `prisma/schema.prisma` das Enum `DownloadStatus { PUBLIC INTERNAL OFFLINE }` und das Modell `Download` (Felder wie in der Quelldatei Abschnitt 1: `id`, `title`, `fileUrl`, `fileType`, `fileSizeBytes`, `status @default(PUBLIC)`, `createdAt`, `updatedAt`, `@@map("downloads")`, `@@index([status])`) ergänzen. Migration erzeugen und gegen die Neon-Dev-DB ausführen: `pnpm prisma migrate dev --name add_downloads_table`. Prisma-Client neu generieren (läuft automatisch mit `migrate dev`).
      _Definition of Done:_ Migration liegt unter `prisma/migrations/`, `pnpm prisma validate` fehlerfrei, `pnpm run typecheck` fehlerfrei (Prisma-Client kennt `Download`/`DownloadStatus`).
      `git commit -m "feat(db): add Download model with PUBLIC/INTERNAL/OFFLINE status"`

- [ ] **3. Permission `downloads:manage` seeden**
      In `prisma/seed.ts` den Eintrag `{ key: "downloads:manage", description: "Downloads verwalten (hochladen, Sichtbarkeit ändern, löschen)" }` zum `PERMISSIONS`-Array hinzufügen und ausschließlich der Rolle `admin` zuweisen (ist automatisch der Fall, da `admin.permissionKeys = PERMISSIONS.map(p => p.key)`). `pnpm run db:seed` (bzw. das im Repo definierte Seed-Skript) gegen die Dev-DB ausführen.
      _Definition of Done:_ Seed läuft ohne Fehler durch, `permissions`-Tabelle enthält `downloads:manage`, der `admin`-Rolle zugeordnet.
      `git commit -m "feat(auth): add downloads:manage permission"`

- [ ] **4. Bestandsdaten migrieren (Seed-Daten für die vier vorhandenen Downloads)**
      Neue Datei `prisma/seed-data/demo-downloads.ts` mit den vier bisherigen Einträgen aus `src/data/downloads.ts` (`Mitgliedsantrag.pdf`, `SEPA-Lastschriftmandat.pdf`, `Ludotheks-Ordnung.pdf`, `Bring-Buy-Vorlage.xlsx`) als Rohdaten (`title`, `fileUrl: "/downloads/<Dateiname>"`, `fileType`, `fileSizeBytes` — Byte-Werte aus den vorhandenen `size`-Strings ableiten, z. B. "210 KB" → `215040`), `status: "PUBLIC"`. In `prisma/seed.ts` idempotent upserten (`prisma.download.upsert` je Eintrag, `where: { fileUrl }` als natürlicher Schlüssel für Idempotenz — analog zur bereits behobenen Idempotenz-Regel für `seedDemoGames`, siehe Memory `seed_not_idempotent.md`).
      _Definition of Done:_ `pnpm run db:seed` zweimal hintereinander ausgeführt erzeugt keine Duplikate (`prisma.download.count()` bleibt bei 4), Unit-Test für die Upsert-Logik falls als eigene Funktion extrahiert.
      `git commit -m "feat(db): seed existing downloads as Download rows"`

- [ ] **5. `src/lib/downloads/` — Domain-Layer (Queries, Labels, Formatierung)**
      Neue Dateien:
      - `src/lib/downloads/downloads.ts`: `listVisibleDownloads(tier: "gast" | "mitglied" | "admin")` (PUBLIC immer, INTERNAL nur ab `mitglied`, OFFLINE nie), `listAllDownloadsForAdmin()` (alle Status, `createdAt desc`), `formatFileSize(bytes: number): string` (B/KB/MB-Stufen).
      - `src/lib/downloads/labels.ts`: `DOWNLOAD_STATUS_LABELS: Record<DownloadStatus, string>` (`PUBLIC: "Öffentlich"`, `INTERNAL: "Intern"`, `OFFLINE: "Offline"`).
      Unit-Tests `src/lib/downloads/downloads.test.ts` (Sichtbarkeitsmatrix je Tier × Status, `formatFileSize`-Grenzwerte) nach dem Muster von `src/lib/content/content.test.ts`.
      _Definition of Done:_ `pnpm run test src/lib/downloads` grün, Coverage-Schwelle für `lib/**` erfüllt.
      `git commit -m "feat(downloads): add domain queries, labels and file-size formatting"`

- [ ] **6. Server Actions `src/lib/downloads/actions.ts`**
      `"use server"`-Datei mit: `createDownload({ title, fileUrl, fileType, fileSizeBytes })`, `setDownloadStatus(id, status)`, `deleteDownload(id)` (liest zuerst `fileUrl`, ruft `deleteBlobs([fileUrl])` auf, dann `prisma.download.delete`), `getDownloadUploadToken(pathname)` (analog `getUploadToken` in `admin-news/actions.ts`: `generateClientTokenFromReadWriteToken` mit `normaliseBlobPath(pathname, "downloads")`, `allowedContentTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]`, `maximumSizeInBytes: MAX_UPLOAD_BYTES`). Jede Funktion beginnt mit `hasPermission(user.id, "downloads:manage")`-Check (Fehlerobjekt zurückgeben, kein Redirect, analog `admin-news`). Nach Mutation `revalidatePath("/downloads")` und `revalidatePath("/admin/downloads")`.
      Unit-Tests `src/lib/downloads/actions.test.ts` (Permission verweigert ohne `downloads:manage`, `deleteDownload` ruft `deleteBlobs` mit der korrekten URL auf — Mocks analog `admin-news/actions.test.ts`).
      _Definition of Done:_ Tests grün, Coverage-Schwelle für `actions.ts` erfüllt.
      `git commit -m "feat(downloads): add admin server actions for upload, status and delete"`

- [ ] **7. `src/components/entities/download-status-pill.tsx`**
      Neue Pill-Komponente analog `flea-market-status-pill.tsx`: Tonalität `PUBLIC` = grün, `INTERNAL` = blau/gelb, `OFFLINE` = grau, Text aus `DOWNLOAD_STATUS_LABELS`.
      _Definition of Done:_ Komponente rendert alle drei Zustände korrekt (kurzer Komponententest oder Storybook-freier manueller Check reicht, UI-Komponenten sind von der Coverage-Pflicht ausgenommen).
      `git commit -m "feat(downloads): add download status pill entity"`

- [ ] **8. Admin-Feature `src/components/feature/admin-downloads/`**
      - `admin-downloads-view.tsx`: Tabelle aller Downloads (`listAllDownloadsForAdmin`), pro Zeile Titel, Dateityp, Größe (`formatFileSize`), `DownloadStatusPill`, Status-Umschalter (drei `ActionButton`s oder ein Dropdown, die `setDownloadStatus(id, status)` binden) und Löschen-Button via `ActionButton`/`ActionDialog` (`deleteDownload`-Bestätigungsdialog).
      - `download-upload-form.tsx`: Client-Komponente mit `useBlobUpload("downloads", getDownloadUploadToken)`, `TextField` für Titel, Dateiauswahl (`accept="application/pdf,.xlsx"`), ruft nach erfolgreichem Upload `createDownload(...)` auf.
      _Definition of Done:_ `pnpm run lint`/`pnpm run typecheck` fehlerfrei; manueller Check im Dev-Server (`pnpm run dev`): Upload einer Test-PDF legt einen sichtbaren Eintrag an, Status-Wechsel und Löschen funktionieren.
      `git commit -m "feat(downloads): add admin downloads management UI"`

- [ ] **9. Route `/admin/downloads` + Navigation**
      Neue Datei `src/app/admin/downloads/page.tsx` mit `requireAdmin()`-Guard (analog anderer `admin/*`-Routen) und `<AdminDownloadsView />`. In `src/lib/utils/nav-config.ts` neuen Eintrag in der Admin-Navigationsgruppe ergänzen (Label "Downloads verwalten", `href: "/admin/downloads"`, `minTier: "admin"`).
      _Definition of Done:_ Als eingeloggter Admin ist `/admin/downloads` erreichbar und in der Sidebar sichtbar; als Nicht-Admin liefert die Route `403`.
      `git commit -m "feat(downloads): add admin downloads route and nav entry"`

- [ ] **10. Öffentliche `/downloads`-Seite auf DB umstellen**
      `src/app/downloads/page.tsx`: `DOWNLOADS`-Import entfernen, stattdessen Session-Tier ermitteln (`getSessionTier()` aus `src/lib/auth/session.ts`) und `listVisibleDownloads(tier)` aufrufen; `LEGAL_DOCS`-Teil unverändert lassen. `DownloadsView`/`downloads-view.tsx` auf den neuen `Download`-Typ aus `src/lib/downloads/downloads.ts` umstellen (Größe bereits als formatierter String über `formatFileSize` übergeben). `src/data/downloads.ts`: `Download`-Typ und `DOWNLOADS`-Array entfernen, `LegalDoc`/`LEGAL_DOCS` bleiben. Prüfen, dass `src/components/feature/rechtliches/legal-doc-view.tsx` (importiert `LegalDoc` aus derselben Datei) weiterhin kompiliert.
      _Definition of Done:_ `pnpm run typecheck` fehlerfrei, `pnpm run test` grün, manueller Check: `/downloads` zeigt als Gast nur PUBLIC-Einträge, als eingeloggtes Mitglied zusätzlich INTERNAL-Einträge, nie OFFLINE-Einträge.
      `git commit -m "feat(downloads): serve public downloads page from the database"`

- [ ] **11. Aufräumen: alte statische Download-Dateien**
      Prüfen, ob die vier migrierten Dateien unter `public/downloads/` weiterhin benötigt werden (ja — `fileUrl` der Seed-Zeilen zeigt weiterhin dorthin, siehe Annahme in Schritt 4). Keine Datei löschen. Stattdessen kurzen Hinweis-Kommentar in `prisma/seed-data/demo-downloads.ts` ergänzen, dass ein künftiger Re-Upload über die Admin-UI die `fileUrl` auf eine Blob-URL umstellen würde (kein Code, nur Doku-Kommentar dort, falls noch nicht vorhanden).
      _Definition of Done:_ Kein Downloadlink auf `/downloads` ist gebrochen (manueller Klick-Check auf alle vier Bestandsdateien).
      `git commit -m "docs(downloads): note migration path from static files to blob uploads"`

- [ ] **12. Gesamtverifikation**
      `pnpm run verify` (format:check + typecheck + lint + test) über den gesamten Diff dieses Plans ausführen.
      _Definition of Done:_ `pnpm run verify` läuft fehlerfrei durch.
      `git commit -m "chore(downloads): final verification pass"` (nur falls durch die Verifikation noch Dateien geändert wurden, z. B. Formatierung — sonst kein Commit).

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Sonnet 5)
- **Reasoning/Thinking:** an, mittlerer Effort — kein Extremfall an Architekturkomplexität, aber mehrere zusammenhängende Schichten (Prisma-Migration, Server Actions mit Permission- und Blob-Handling, Sichtbarkeitslogik über drei Tiers) verlangen zusammenhängendes Schlussfolgern statt reiner Mechanik.
- **Begründung:** Die Aufgabe folgt bestehenden, gut dokumentierten Mustern (admin-news-Upload-Flow, Post.internal-Sichtbarkeitsfilter, admin-bestand-CRUD) — kein Opus-Bedarf —, ist aber kein reines Boilerplate (Idempotenz der Seed-Migration, korrekte Tier-Sichtbarkeitsmatrix, Hard-Delete + Blob-Cleanup), weshalb Sonnet mit aktivem Reasoning statt Haiku die richtige Wahl ist.
