# Ausführungsplan: Downloads — Unified View (`/admin/downloads` → `/downloads`)

- **Erstellt/Aktualisiert:** 2026-08-13 14:00
- **Ziel:** `/admin/downloads` entfernen und alle Verwaltungsfunktionen (Drag & Drop, Datei-Name, Reupload, Status, Löschen, Upload) permission-gated in `/downloads` integrieren.
- **Quelle:** GitHub Issues [#116](https://github.com/oecher-meeples/portal/issues/116), [#113](https://github.com/oecher-meeples/portal/issues/113), [#114](https://github.com/oecher-meeples/portal/issues/114), [#115](https://github.com/oecher-meeples/portal/issues/115) (Repo `oecher-meeples/portal`)
- **Git-Base-State:** Branch `develop`, Commit `a93954c09b3642cf7878c87f72f859cfb7b333de`

> Details, Anforderungen und Akzeptanzkriterien stehen in den vier verlinkten Issues — hier nicht duplizieren. Dieser Plan bündelt sie, weil #113/#114/#115 laut #116-Checkliste explizit Teilaufgaben derselben Umsetzung sind.

## Persona

Du bist ein erfahrener Next.js/TypeScript-Entwickler mit Fokus auf Prisma-basierte Server-Actions-Architekturen und DDD-geschichtete React-Komponenten (`src/lib/<domäne>/` ↔ `src/components/ui|entities|widgets|feature`). Du arbeitest in kleinen, testgetriebenen Schritten und hältst dich strikt an bestehende Repo-Konventionen, statt neue Muster zu erfinden.

## Getroffene Annahmen

- **Drag & Drop:** Native HTML5 Drag & Drop API (`draggable`, `onDragStart`/`onDragOver`/`onDrop`) — keine neue Abhängigkeit (`@dnd-kit` o. ä.). Kein eingebauter Tastatur-/Touch-Support; das ist für diesen Umsetzungsschritt akzeptiert.
- **Meeple-Icon:** Bestehendes `public/meeple.png` wiederverwenden (z. B. als `<img>` mit gelbem Badge-Hintergrund/CSS-Filter), kein neues SVG.
- **Reihenfolge (aus #113):** Hauptliste (PUBLIC + INTERNAL) hat ein eigenes `order`-Feld, manuell sortierbar. Private Tabelle (OFFLINE) hat kein `order`-Feld und sortiert zwingend nach `updatedAt desc`.
- **Suchfeld (aus #116):** rein client-seitige Titel-Filterung über die bereits geladene Liste, kein neuer Server-Roundtrip.
- **Ein Plan für alle vier Issues**, da sie am selben Component-Tree arbeiten und laut #116 gemeinsam abgeschlossen werden. Schritte referenzieren die jeweilige Issue-Nummer.
- Bestehendes Test-Setup (Vitest, `prismaMock`-Muster aus `src/lib/downloads/actions.test.ts` und `downloads.test.ts`) wird fortgeführt — kein neues Framework nötig.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt).
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf die Quell-Issues.
- Dateien über 400 Zeilen möglichst in kleinere Dateien aufteilen (Repo-Grenzwert, siehe `CLAUDE.md`).
- Erstelle eine passende Ordnerstruktur — halte dich an die Schichten `src/lib/<domäne>/` und `src/components/ui → entities → widgets → feature → layout` sowie deren Import-Richtung (siehe `CLAUDE.md`).
- **Unit-Tests:** Für neue Logik/Funktionen Unit-Tests schreiben. Die Definition of Done eines Schritts gilt erst als erfüllt, wenn die zugehörigen Tests grün sind. Ausgenommen sind rein mechanische/nicht-testbare Schritte (Config, Doku, Boilerplate).
- **Committe nur Dateien, die du selbst geschrieben hast** — andere Dateien im Working Directory ignorieren (kein `git add .`, sondern gezieltes `git add <datei>`).
- **Blockierende Prozesse:** Du hast die Erlaubnis, Prozesse zu beenden, die für die Ausführung eines Schritts benötigte Ressourcen blockieren (z. B. einen Port, eine Datei oder einen Lock belegen). Identifiziere den blockierenden Prozess gezielt und beende nur diesen, statt den Schritt abzubrechen.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert: < 1 h Arbeit).
- **Bei Fehlschlag eines Schritts:** prüfen, ob die Definition of Done zumindest teilweise erfüllt ist. Falls ja, den erreichten Teilstand committen (Commit-Message mit Präfix `wip:`); falls nein, nichts committen. In beiden Fällen den Schritt mit `[!]` markieren, den Fehler kurz im Schritt selbst notieren (Stichpunkt unter dem Schritt) und mit dem nächsten Schritt fortfahren — **nicht abbrechen**. Erst nachdem **alle** Schritte durchlaufen wurden (egal ob `[x]` oder `[!]`), alle offenen Punkte/Fehlschläge gesammelt auf Deutsch mit dem Nutzer besprechen.
- Markiere jeden erledigten Schritt mit `[x]`, sobald er abgeschlossen und committet ist.
- Nach Abschluss aller Schritte: `pnpm run verify` muss grün sein, bevor der letzte Schritt als erledigt gilt.
- Wenn die Struktur geändert wird (Schicht, Ordner, geteilter Baustein), `docs/project-structure.md` mit anpassen.

## Schritte

- [x] **0. Repository prüfen**
      Ist bereits ein Git-Repo (siehe Git-Base-State oben) — nur prüfen, dass `git status` sauber ist und der Branch `develop` aktuell ist (`git pull` falls nötig). Kein `git init` nötig.
      _Definition of Done:_ `git status` zeigt keine unerwarteten Änderungen; Arbeitsbranch angelegt (`git checkout -b feature/downloads-unified-view`).
      `git commit --allow-empty -m "chore: start downloads unified view work (#116)"`

- [x] **1. Testframework verifizieren**
      Bereits vorhanden (Vitest, siehe `src/lib/downloads/actions.test.ts`, `downloads.test.ts`). Nur `pnpm run test` einmal ausführen und grünen Ist-Zustand bestätigen.
      _Definition of Done:_ `pnpm run test` läuft grün durch, keine neue Konfiguration nötig.
      (Kein Commit nötig, da keine Änderung — falls Fixes nötig waren, mit `chore: fix pre-existing test failures` committen.)

- [x] **2. Schema: `fileName` hinzufügen (#114)**
      In `prisma/schema.prisma` beim `Download`-Model (Zeile ~666) ein Pflichtfeld `fileName String` ergänzen. Migration erzeugen (`pnpm prisma migrate dev --name download_file_name`). Für bestehende Zeilen den Wert per Backfill aus dem `fileUrl`-Basename setzen (SQL in der generierten Migration ergänzen, z. B. `UPDATE "downloads" SET "fileName" = split_part(...)` oder äquivalent für die verwendete DB — Spalte vorher nullable anlegen, befüllen, dann `NOT NULL` setzen, analog zu bestehenden mehrstufigen Migrationen im Repo, falls vorhanden. Prüfen, wie frühere Migrationen mit Pflichtfeld-Backfills umgegangen sind, bevor ein neues Muster erfunden wird).
      _Definition of Done:_ `pnpm prisma migrate dev` läuft ohne Fehler durch, `prisma generate` liefert den neuen Typ, `pnpm run test` weiterhin grün.
      `git commit -m "feat(db): add fileName column to Download model (#114)"`
      - Abweichung: Keine `DATABASE_URL` in dieser Umgebung verfügbar, `prisma migrate dev` kann nicht gegen eine echte DB laufen. Migration von Hand im bestehenden Repo-Stil geschrieben (`prisma/migrations/20260813010000_download_file_name/migration.sql`), `pnpm prisma generate` für die Typen ausgeführt (funktioniert ohne DB-Verbindung).

- [x] **3. `createDownload` speichert `fileName` (#114)**
      `CreateDownloadInput`/`createDownload()` in `src/lib/downloads/actions.ts` um `fileName` erweitern. `DownloadUploadForm` (`src/components/feature/admin-downloads/download-upload-form.tsx`) übergibt `file.name` als `fileName`.
      _Definition of Done:_ Neuer/angepasster Test in `src/lib/downloads/actions.test.ts` prüft, dass `fileName` im `prisma.download.create`-Aufruf ankommt.
      `git commit -m "feat: persist original file name on download upload (#114)"`

- [x] **4. Schema: `order` hinzufügen (#113)**
      In `prisma/schema.prisma` beim `Download`-Model ein Feld `order Int` ergänzen (Default z. B. `0`). Migration erzeugen (`pnpm prisma migrate dev --name download_order`). Backfill bestehender Zeilen mit einer Reihenfolge passend zur bisherigen `createdAt asc`-Sortierung (z. B. `ROW_NUMBER() OVER (ORDER BY "createdAt" ASC)` in der Migration).
      _Definition of Done:_ Migration läuft durch, bestehende Downloads haben eine konsistente, lückenlose `order`.
      `git commit -m "feat(db): add order column to Download model (#113)"`
      - Abweichung: Wie Schritt 2 von Hand geschrieben (`prisma/migrations/20260813011000_download_order/migration.sql`), keine DB-Verbindung verfügbar.

- [x] **5. `listVisibleDownloads` sortiert nach `order`, neue Query für private Tabelle (#113, #116)**
      In `src/lib/downloads/downloads.ts`: `listVisibleDownloads()` sortiert nach `order asc` statt `createdAt asc`. Neue Funktion `listOfflineDownloadsForAdmin()` (ersetzt `listAllDownloadsForAdmin()` inhaltlich, filtert auf `status: "OFFLINE"`, `orderBy: { updatedAt: "desc" }`).
      _Definition of Done:_ `downloads.test.ts` deckt beide Funktionen ab (Sortierfeld korrekt, Status-Filter korrekt); alte `listAllDownloadsForAdmin`-Tests entsprechend angepasst/entfernt.
      `git commit -m "feat: sort visible downloads by manual order, add offline-downloads query (#113, #116)"`

- [x] **6. Server Action `reorderDownloads` (#113)**
      Neue Server Action in `src/lib/downloads/actions.ts`: `reorderDownloads(orderedIds: string[])` — prüft `downloads:manage`, aktualisiert `order` für jede übergebene ID entsprechend ihrer Position in `orderedIds` (nur PUBLIC/INTERNAL-Einträge dürfen enthalten sein; OFFLINE-IDs in der Eingabe werden ignoriert/abgelehnt), `revalidateDownloadPaths()`.
      _Definition of Done:_ Tests in `actions.test.ts`: fehlende Berechtigung → Fehler; erfolgreicher Aufruf setzt `order` korrekt; OFFLINE-IDs werden nicht mit reordert.
      `git commit -m "feat: add reorderDownloads server action (#113)"`

- [x] **7. Server Action `replaceDownloadFile` (#115)**
      Neue Server Action in `src/lib/downloads/actions.ts`: `replaceDownloadFile(id, { fileUrl, fileType, fileSizeBytes, fileName })` — prüft `downloads:manage`, lädt den bestehenden Eintrag (Fehler falls nicht gefunden), aktualisiert die Datei-Felder (id/title/status/order bleiben unverändert), löscht **danach** den alten Blob per `deleteBlobs()`, `revalidateDownloadPaths()`. Neue/erweiterte Token-Funktion für den Reupload-Fall (gleiches Allowed-Content-Type-/Size-Limit wie `getDownloadUploadToken`) — bestehende Funktion wiederverwenden statt duplizieren, falls sie generisch genug ist.
      _Definition of Done:_ Tests in `actions.test.ts`: fehlende Berechtigung → Fehler; Eintrag nicht gefunden → Fehler; erfolgreicher Reupload aktualisiert Felder und löscht alten Blob erst nach dem Datenbank-Update; alter Blob bleibt erhalten, wenn der Upload-Schritt selbst fehlschlägt (kein `replaceDownloadFile`-Aufruf ohne neuen `fileUrl`).
      `git commit -m "feat: add replaceDownloadFile server action for reupload (#115)"`

- [x] **8. Meeple-Badge-Komponente (#116)**
      Neue Komponente `src/components/entities/download-internal-badge.tsx` (analog zu `download-status-pill.tsx`): zeigt `public/meeple.png` in Gelb (CSS-Filter, z. B. `sepia`/`hue-rotate` oder Badge-Hintergrund) mit `Tooltip` (`src/components/ui/tooltip.tsx`) "Nur für Mitglieder", nur wenn `status === "INTERNAL"`.
      _Definition of Done:_ Komponente rendert nichts bei `PUBLIC`/`OFFLINE`, rendert Icon+Tooltip-Trigger bei `INTERNAL`. (UI-Komponente ohne Geschäftslogik — laut Coverage-Scope in `CLAUDE.md` kein Pflicht-Unit-Test, da `src/components/entities` nicht im Coverage-Scope liegt; optional Snapshot/Interaction-Test, falls unkompliziert.)
      `git commit -m "feat: add internal-only meeple badge for downloads (#116)"`

- [x] **9. `DownloadsView` erhält `canManage`-Flag + Datei-Name + Meeple-Badge (#114, #116)**
      `src/app/downloads/page.tsx`: `hasPermission(user.id, "downloads:manage")` prüfen (analog `canManageGames` in `src/app/ludothek/[slug]/page.tsx:81-82`), als `canManage`-Prop an `DownloadsView` reichen. `DownloadListItem`-Typ um `fileName`, `status`, `order` erweitern. In `downloads-view.tsx`: Datei-Name in Grau zwischen Titel und Typ nur bei `canManage`; Meeple-Badge (Schritt 8) neben jedem `INTERNAL`-Eintrag, unabhängig von `canManage`.
      _Definition of Done:_ Kein automatisierter Test nötig für die reine Page/View-Verdrahtung (außerhalb Coverage-Scope), aber manuell im Dev-Server geprüft: mit/ohne Recht unterscheidet sich die Anzeige wie in #114 beschrieben.
      `git commit -m "feat: show file name to managers and internal-only badge in downloads list (#114, #116)"`

- [x] **10. Drag & Drop in der Hauptliste (#113)**
      In `downloads-view.tsx`: bei `canManage` pro Zeile ein Hamburger-Icon (`lucide-react`, z. B. `GripVertical`) als Drag-Handle links. Native HTML5 DnD: `draggable` auf der Zeile, `onDragStart` merkt die gezogene ID, `onDragOver`/`onDrop` berechnet die neue Reihenfolge und ruft `reorderDownloads(newOrderedIds)` über `useAction()` auf. Optimistisches Reordern im Client-State, Rollback bei Fehler.
      _Definition of Done:_ Manuell im Dev-Server geprüft (Drag & Drop funktioniert, Reihenfolge bleibt nach Reload erhalten). Kein Pflicht-Unit-Test für reine DOM-Interaktion (außerhalb Coverage-Scope) — die zugrundeliegende Server Action ist bereits in Schritt 6 getestet.
      `git commit -m "feat: drag-and-drop reordering for the main downloads list (#113)"`

- [x] **11. Dropdown-Menü pro Zeile: Status/Reupload/Löschen (#115, #116)**
      In `downloads-view.tsx` bei `canManage`: `DropdownMenu` (`src/components/ui/dropdown-menu.tsx`) links vom bestehenden "Download"-Button mit Einträgen "Status ändern" (Untermenü/Optionen Privat/Intern/Public → `setDownloadStatus`), "Reupload" (öffnet verstecktes File-Input, ruft nach Upload `replaceDownloadFile` auf, Upload-Mechanik via `useBlobUpload` wie in `download-upload-form.tsx`), "Löschen" (`deleteDownload`, mit Confirm analog `ActionButton`/`ActionDialog`-Konvention).
      _Definition of Done:_ Manuell geprüft: alle drei Aktionen funktionieren aus der neuen Zeile heraus; zugrundeliegende Server Actions bereits getestet (Schritte 6, 7, bestehend).
      `git commit -m "feat: add per-row admin dropdown (status, reupload, delete) to downloads list (#115, #116)"`

- [x] **12. Obere Upload-Zeile + Suchfeld (#116)**
      `downloads-view.tsx`: bei `canManage` `DownloadUploadForm` oberhalb der Hauptliste einbinden (statt bisher separat unter der Admin-Tabelle) — Formular ggf. auf eine kompakte Zeilen-Variante (Titel-Input, Datei-Input, Button nebeneinander) umstellen, falls nötig. Für alle Nutzer: Suchfeld oberhalb der Liste, `useState` für den Suchbegriff, client-seitiger Filter über `title` (case-insensitive, `includes`).
      _Definition of Done:_ Kein Pflicht-Unit-Test (reine UI/Page, außerhalb Coverage-Scope); manuell geprüft: Suche filtert sichtbar, Upload-Formular funktioniert an neuer Stelle.
      `git commit -m "feat: move upload form above the list and add title search (#116)"`
      - Abweichung: `download-upload-form.tsx` musste in diesem Schritt (statt erst in Schritt 14) nach `feature/downloads/` verschoben werden, weil `downloads-view.tsx` es sonst aus `feature/admin-downloads/` importiert hätte — verboten durch die harte `import/no-restricted-paths`-Regel (keine Feature-zu-Feature-Importe). Da die alte Admin-Seite dadurch keine Existenzberechtigung mehr hatte, wurde Schritt 14 (`/admin/downloads` + `admin-downloads-view.tsx` entfernen, Nav-Eintrag, `revalidatePath`) direkt hier miterledigt.

- [x] **13. Private-Downloads-Tabelle unterhalb der Hauptliste (#116)**
      `src/app/downloads/page.tsx` lädt bei `canManage` zusätzlich `listOfflineDownloadsForAdmin()` (Schritt 5) und reicht sie an `DownloadsView`. Neue Sektion unterhalb der Hauptliste (Tabellen-Optik analog zur bisherigen `AdminDownloadsView`, aber ohne Drag-Handle, sortiert nach `updatedAt desc`), inkl. Dropdown-Menü (Schritt 11 wiederverwenden statt duplizieren) und Datei-Name-Anzeige.
      _Definition of Done:_ Manuell geprüft: OFFLINE-Downloads erscheinen ausschließlich in dieser Tabelle, nicht in der Hauptliste; Reihenfolge folgt `updatedAt desc`.
      `git commit -m "feat: add private-downloads table below the main list (#116)"`

- [x] **14. Alte Admin-Downloads-Seite entfernen (#116)**
      `src/app/admin/downloads/page.tsx`, `src/components/feature/admin-downloads/admin-downloads-view.tsx` löschen. `download-upload-form.tsx` nach `src/components/feature/downloads/` verschieben (jetzt nur noch dort gebraucht), Importe anpassen. Referenzen/Links auf `/admin/downloads` im Repo suchen und entfernen (z. B. Navigation, falls vorhanden — sollte nach #100 bereits keine geben).
      _Definition of Done:_ `pnpm run build` bzw. `pnpm run typecheck` findet keine toten Importe mehr; `/admin/downloads` existiert nicht mehr im Routing.
      `git commit -m "refactor: remove standalone admin downloads page (#116)"`
      - Bereits in Schritt 12 erledigt (siehe Abweichungsnotiz dort) — hier nur verifiziert: keine Treffer mehr für `admin/downloads`, `admin-downloads`, `listAllDownloadsForAdmin` im Repo; `pnpm run typecheck` sauber. Zusätzlich den Nav-Eintrag „Downloads verwalten“ (`src/lib/utils/nav-config.ts`) und den toten `revalidatePath("/admin/downloads")`-Aufruf entfernt, die der Plan nicht explizit genannt hatte.

- [x] **15. Aufräumen & Verify**
      `docs/project-structure.md` aktualisieren, falls sich die Ordnerstruktur unter `components/feature/downloads` geändert hat. `pnpm run verify` (format:check + typecheck + lint + test) ausführen und alle Findings beheben. Issues #113, #114, #115, #116 im Kommentar auf den finalen Commit/Branch verweisen (kein automatisches Schließen — das macht der PR-Merge).
      _Definition of Done:_ `pnpm run verify` grün.
      `git commit -m "docs: update project structure notes for unified downloads view"`

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Sonnet 5)
- **Reasoning/Thinking:** an, mittlerer Effort — die Schritte sind überwiegend reguläre Feature-Arbeit (Server Actions, Prisma-Migrationen, React-Komponenten), aber Schritt 10 (natives Drag & Drop mit optimistischem State) und Schritt 7 (Reupload mit sicherer Blob-Reihenfolge) enthalten nicht-triviale Nebenläufigkeits-/Fehlerfall-Logik.
- **Begründung:** Der Plan bewegt sich vollständig innerhalb bestehender Repo-Konventionen (Server Actions, Prisma, Vitest-Mocks) ohne größere Architektur-Unsicherheit — Opus wäre hier Overkill. Haiku würde bei den DnD- und Blob-Fehlerfall-Schritten zu oberflächlich bleiben.
