# Ausführungsplan: Implementierungs-Sprint #107, #110, #111, #134, #135

- **Erstellt/Aktualisiert:** 2026-08-13 14:30
- **Ziel:** Fünf Ready-Issues (Bild-Kompression, Wichtige-Links-Feature, Dashboard-Kacheln, Admin-News-Filter, News-Vorschau/Vollansicht mit Infinite Scroll) auf `feature/ludothek-detail-titelbasis` umsetzen.
- **Quelle:** `.claude/plans/2026-08-13-implementation-sprint-107-110-111-134-135.md`
- **Git-Base-State:** Branch `feature/ludothek-detail-titelbasis`, Head-Commit `17913f84ac4fbedb6aa2f1a54c5dbca9b3eca184`

> Details, Anforderungen und Kontext (Ist-Zustand, Dateien, Vorgehen je Issue) stehen in der Quelldatei — hier nicht dupliziert. Dieser Plan bricht sie in ausführbare, committete Einzelschritte herunter.

## Persona

Du bist Senior Full-Stack-Entwickler:in für ein Next.js/TypeScript/Prisma-Projekt (App Router, Server Actions, Tailwind, Vitest), das strikte Schicht-Trennung (`src/lib/<domäne>/` vs. `src/components/{ui,entities,widgets,feature,layout}/`) per ESLint erzwingt. Du kennst die bestehenden Muster des Repos (`src/lib/downloads/actions.ts`, `useAction()`, `useBlobUpload()`) und kopierst sie 1:1 statt neu zu erfinden, arbeitest testgetrieben nach DRY und hältst dich strikt an `CLAUDE.md`.

## Getroffene Annahmen

- **#107:** Kompression via Canvas-API (`createImageBitmap` + `canvas.toBlob`), kein neuer npm-Dependency. Ziel: längste Kante max. 1600px, Format WebP, Qualität ~0.82.
- **#110:** Eigenes Prisma-Modell `ImportantLink` (nicht `Download` wiederverwenden). Icon als Bild-Upload (nicht feste Icon-Auswahl). **Keine manuelle Sortierung** — Reihenfolge nach Erstellungsdatum, kein `order`-Feld-UI, kein `reorderImportantLinks`.
- **#111:** Neue Dashboard-Kacheln (`/lfg`, `/markt`) in eigener zweiter Zeile mit `sm:grid-cols-2`, bestehende Kachel-Reihe bleibt unverändert.
- **#134:** Filter-Konstante wird nach `src/lib/content/content.ts` gezogen (154 Zeilen, passt); `AdminNewsView` wird komplett `"use client"`.
- **#135:** `body` wird beim initialen Laden von `/news` mitgeschickt (kein Lazy-Load). Infinite Scroll ist reines Client-seitiges Slicing (10 initial, +5 pro Nachladen). Reset des `visibleCount` bei Filterwechsel.
- Reihenfolge der Umsetzung: #134 + #111 (parallel/nacheinander), dann #107, dann #110, dann #135 als separater, größerer PR.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt).
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf die Quelldatei.
- Dateien über 400 Zeilen möglichst in kleinere Dateien aufteilen (siehe Schicht-Regeln in `CLAUDE.md`).
- Erstelle eine passende Ordnerstruktur gemäß `src/lib/<domäne>/` bzw. `src/components/{ui,entities,widgets,feature,layout}/`.
- Import-Richtung strikt einhalten (`import/no-restricted-paths`, siehe `CLAUDE.md`) — nie aufweichen, um einen Import durchzubekommen.
- **Unit-Tests:** Für neue Logik/Funktionen unter `src/lib/**` und `**/actions.ts` Unit-Tests schreiben (Coverage-Pflicht laut `vitest.config.ts`, Schwelle 80 %). Die Definition of Done eines Schritts gilt erst als erfüllt, wenn die zugehörigen Tests grün sind. Ausgenommen sind rein mechanische/nicht-testbare Schritte (Config, Migration, Nav-Eintrag).
- **Committe nur Dateien, die du selbst geschrieben hast** — andere Dateien im Working Directory ignorieren (kein `git add .`, sondern gezieltes `git add <datei>`).
- **Blockierende Prozesse:** Erlaubnis, Prozesse zu beenden, die für einen Schritt benötigte Ressourcen blockieren (z. B. Dev-Server auf Prisma-Migrations-Port). Gezielt identifizieren und nur diesen beenden.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert: < 1 h Arbeit).
- **Bei Fehlschlag eines Schritts:** prüfen, ob die Definition of Done zumindest teilweise erfüllt ist. Falls ja, Teilstand committen (Präfix `wip:`); falls nein, nichts committen. In beiden Fällen Schritt mit `[!]` markieren, Fehler kurz notieren, mit nächstem Schritt fortfahren — **nicht abbrechen**. Erst nach **allen** Schritten offene Punkte gesammelt auf Deutsch mit dem Nutzer besprechen.
- Markiere jeden erledigten Schritt mit `[x]`, sobald abgeschlossen und committet.
- Vor Abschluss des gesamten Plans: `pnpm run verify` muss grün sein.

## Schritte

- [x] **0. Repository vorbereiten**
      Repo existiert bereits (`feature/ludothek-detail-titelbasis`, Head `17913f8`). Kein `git init` nötig. `git status` prüfen, sicherstellen, dass keine fremden uncommitteten Änderungen versehentlich mitgezogen werden.
      _Definition of Done:_ `git status` sauber interpretiert (nur eigene Änderungen ab Schritt 1 werden committet).
      _Kein Commit nötig — reine Prüfung._

- [x] **1. Testframework prüfen**
      Vitest ist bereits eingerichtet (`vitest.config.ts`, Coverage-Scope `src/lib/**` + `**/actions.ts`, Schwelle 80 %). Kein neues Framework nötig.
      _Definition of Done:_ `pnpm run test` läuft fehlerfrei auf dem aktuellen Stand.
      _Kein Commit nötig — reine Prüfung._

- [x] **2. #134 — Filter-Logik extrahieren und `/admin/news` filterbar machen**
      Filter-Konstante (`ContentType | "alle"` + Label-Map) aus `src/components/feature/news/news-browser.tsx` nach `src/lib/content/content.ts` ziehen (falls `filterByType()` als echte Funktion extrahiert wird: Unit-Test in `content.test.ts`). `news-browser.tsx` auf den geteilten Import umstellen. `admin-news-view.tsx` zu `"use client"` machen und `PillToggle`-Filter-State analog `news-browser.tsx` ergänzen.
      _Definition of Done:_ Filter-Pills auf `/admin/news` filtern sichtbar nach Typ; `news-browser.tsx` nutzt dieselbe Konstante (kein Duplikat mehr); `pnpm run test` grün; `pnpm run lint` grün.
      `git commit -m "feat(admin-news): add type filter pills, extract shared filter constant"`

- [x] **3. #111 — Dashboard-Kacheln für offene LFGs & Marktplatz-Angebote**
      In `src/app/dashboard/page.tsx` zwei zusätzliche Counts in den bestehenden `Promise.all` aufnehmen: `prisma.lfgPost.count({ where: { closedAt: null } })` und `prisma.marketListing.count()`. Neue Props `totalOpenLfgCount`, `activeMarketListingCount` an `DashboardView` durchreichen. In `dashboard-view.tsx` neue `<Link><StatTile/></Link>`-Blöcke zu `/lfg` und `/markt` in eigener zweiter Zeile mit `sm:grid-cols-2` ergänzen; bestehende „Offene Gesuche (von dir)“-Kachel bleibt unverändert.
      _Definition of Done:_ Dashboard zeigt beide neuen Kacheln mit korrekten Live-Zahlen, verlinkt zu `/lfg` bzw. `/markt`; `pnpm run lint` und `pnpm run typecheck` grün.
      `git commit -m "feat(dashboard): add stat tiles for total open LFGs and market listings"`

- [x] **4. #107 — Bild-Kompression bei News-Titelbild-Upload**
      Neue `src/lib/utils/compress-image.ts`: `compressImage(file, { maxDimension = 1600, quality = 0.82 })` via `createImageBitmap` + `canvas.toBlob("image/webp", quality)`. Reine Berechnungslogik `computeTargetDimensions(width, height, maxDimension)` als separate, DOM-freie Funktion extrahieren. Aufruf in `post-form.tsx`s `handleCoverImageChange`, vor `uploadFiles([file])`. `useBlobUpload()` bleibt unverändert.
      _Definition of Done:_ `computeTargetDimensions()` per Unit-Test abgedeckt (Coverage-Pflicht, `src/lib/utils/compress-image.test.ts`); Titelbild-Upload auf `/admin/news` erzeugt sichtbar komprimiertes WebP (max. 1600px Kante); `pnpm run test` grün.
      `git commit -m "feat(news): compress cover images to WebP on upload"`

- [x] **5. #110a — Prisma-Modell, Migration und Permission für Wichtige Links**
      Neues Modell `ImportantLink` in `prisma/schema.prisma` (Felder: `id`, `title`, `targetUrl`, `iconUrl?`, `createdAt`, `updatedAt` — **kein** `order`-Feld, da keine manuelle Sortierung). Migration: `pnpm prisma migrate dev --name add_important_link`. Neue Permission `links:manage` in `prisma/seed.ts` `PERMISSIONS`, Rolle `admin` zuweisen.
      _Definition of Done:_ Migration läuft fehlerfrei gegen die lokale DB; `prisma generate` erfolgreich; Seed-Skript läuft idempotent durch (`pnpm run db:seed` o. Ä. — Skript-Name in `package.json` prüfen).
      `git commit -m "feat(links): add ImportantLink model, migration and links:manage permission"`

- [x] **6. #110b — Lib-Layer für Wichtige Links (Queries, Actions, Tests)**
      `src/lib/links/links.ts`: `listImportantLinks()` (sortiert nach `createdAt`). `src/lib/links/actions.ts`: `createImportantLink`, `updateImportantLink`, `deleteImportantLink`, `getImportantLinkUploadToken` — 1:1 nach Muster `src/lib/downloads/actions.ts` (Permission-Check `links:manage`, `revalidatePath("/admin/wichtige-links")` + `revalidatePath("/dashboard")`, `deleteBlobs()` bei Löschung). **Kein** `reorderImportantLinks`.
      _Definition of Done:_ `src/lib/links/links.test.ts` und `src/lib/links/actions.test.ts` grün (Permission-Verweigerung, CRUD, Blob-Löschung bei Delete); Coverage-Schwelle 80 % eingehalten (`pnpm run test -- --coverage` oder äquivalent).
      `git commit -m "feat(links): add lib layer with CRUD actions and tests"`

- [x] **7. #110c — Admin-UI, Nav-Eintrag und Dashboard-Sektion für Wichtige Links**
      `src/components/feature/admin-links/admin-links-view.tsx` (Tabelle analog `admin-news-view.tsx`/`downloads-view.tsx`). `src/components/feature/admin-links/link-form.tsx` (Create/Edit-Formular analog `download-upload-form.tsx`, Icon via `useBlobUpload("important-links", getImportantLinkUploadToken)` + `compressImage()` aus Schritt 4). `src/components/widgets/important-links-grid.tsx` (datengetriebenes Card-Grid für `/dashboard`, ersetzt hartcodiertes `QUICK_LINKS`-Grid falls vorhanden). `nav-config.ts`: neuer Eintrag unter „Administration“, `href: "/admin/wichtige-links"`. Neue Route `src/app/admin/wichtige-links/page.tsx`. `dashboard/page.tsx`: `listImportantLinks()`-Aufruf ergänzen, an `DashboardView` durchreichen, neue Sektion rendern.
      _Definition of Done:_ `/admin/wichtige-links` erreichbar über Nav, CRUD funktioniert end-to-end (manuell geprüft oder via Playwright, falls vorhanden); `/dashboard` zeigt die konfigurierten Links als klickbare Karten; `pnpm run lint` und `pnpm run typecheck` grün.
      `git commit -m "feat(links): add admin UI, nav entry and dashboard section"`

- [x] **8. #135a — Body-Daten und Slicing-Logik für News-Liste**
      `src/app/news/page.tsx` und zugehörige Query in `src/lib/content/content.ts` erweitern, sodass `body` beim initialen Laden von `/news` mitgeschickt wird (kein `Omit<ContentItem, "body">` mehr für diesen Pfad). Neue, DOM-freie Slicing-Berechnungsfunktion in `src/lib/content/` (z. B. `computeVisibleItems(items, visibleCount)` oder passend benannt), die bestimmt, welche Items bei welchem Filter/Count sichtbar sind.
      _Definition of Done:_ Neue Slicing-Funktion per Unit-Test abgedeckt (Coverage-Pflicht); `/news` liefert `body` im initialen Server-Response (verifizierbar über Query/Server-Komponente); `pnpm run test` grün.
      `git commit -m "feat(news): load body eagerly and add slicing logic for infinite scroll"`

- [x] **9. #135b — Infinite-Scroll-Hook**
      Neue `src/components/ui/use-infinite-scroll.ts`: generischer Hook `{ items, initialCount, step } → { visibleItems, sentinelRef }` mit `IntersectionObserver`-Wiring, analog zur Einordnung von `use-code-scanner.ts`. DOM-/Browser-Abhängigkeit ist hier zulässig (liegt bewusst in `components/ui/`, keine Coverage-Pflicht laut `vitest.config.ts`-Scope), freiwilliger Test empfohlen.
      _Definition of Done:_ Hook kompiliert typsicher, `pnpm run typecheck` grün; manueller Smoke-Test (Scroll löst Nachladen aus) dokumentiert im Commit oder PR.
      `git commit -m "feat(ui): add generic use-infinite-scroll hook"`

- [x] **10. #135c — Vorschau/Vollansicht-Umschalter in `news-browser.tsx` und `content-timeline-entry.tsx`**
      Neue `src/components/entities/content-timeline-entry.tsx`: Vollansicht-Eintrag mit vollem Markdown-Body, Cover, Metadaten. `news-browser.tsx` orchestriert: Filter-State (wiederverwendet aus Schritt 2), neuer View-Toggle-State (Vorschau/Vollansicht), ruft `useInfiniteScroll` aus Schritt 9 mit den Slicing-Ergebnissen aus Schritt 8. `visibleCount` wird bei Filterwechsel auf die initiale Anzahl (10) zurückgesetzt. `admin-news-view.tsx` bleibt unverändert (AC schließt `/admin/news` explizit aus).
      _Definition of Done:_ `/news` zeigt standardmäßig Vorschau, Umschalter wechselt zu Vollansicht mit vollem Body; Scrollen lädt in 5er-Schritten nach; Filterwechsel setzt sichtbare Anzahl zurück; `news-browser.tsx` und `content-timeline-entry.tsx` bleiben unter 400 Zeilen (ggf. weiter aufteilen); `pnpm run verify` (format:check + typecheck + lint + test) komplett grün.
      `git commit -m "feat(news): add preview/full view toggle with infinite scroll"`

- [x] **11. Abschluss-Check**
      `pnpm run verify` einmal über den gesamten Diff laufen lassen. `docs/project-structure.md` aktualisieren, falls neue Ordner (`src/lib/links/`, `src/components/feature/admin-links/`) dort ergänzt werden müssen.
      _Definition of Done:_ `pnpm run verify` grün über alle Schritte hinweg; `docs/project-structure.md` konsistent mit neuer Struktur (falls Änderung nötig).
      `git commit -m "docs: update project structure for links feature"` (nur falls `docs/project-structure.md` geändert wurde — sonst Schritt ohne Commit abschließen)

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** Sonnet (`claude-sonnet-5`) für Schritte 2–7, 8–9; **Opus** (`claude-opus-5`) für Schritt 10.
- **Reasoning/Thinking:** Mittlerer Effort für Schritte 2–9 (Muster-Replikation, klare Vorbilder im Repo); hoher Effort für Schritt 10 (State-Design ohne Vorbild: Filter × View-Umschaltung × Scroll-Reset).
- **Begründung:** Die Mehrheit der Schritte kopiert bestehende Muster 1:1 (Downloads-CRUD, PillToggle-Filter, Canvas-Resize) — Sonnet reicht. Schritt 10 kombiniert drei unabhängige State-Achsen ohne Vorbild im Repo und ist die einzige Stelle mit echtem Architektur-/Trade-off-Bedarf im Sprint — dafür Opus mit höherem Reasoning-Effort.
