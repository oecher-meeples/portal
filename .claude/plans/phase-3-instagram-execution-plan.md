# Ausführungsplan: Phase 3 — Instagram-Anbindung

- **Erstellt/Aktualisiert:** 2026-07-28 14:30
- **Ziel:** Automatisiertes Cross-Posting von Blog-Beiträgen nach Instagram über die Meta Graph API inkl. OAuth-Verbindung, Hintergrund-Warteschlange und Editor-Checkbox (Meilensteine 3.1–3.2 aus `docs/roadmap.md`).
- **Quelle:** `docs/roadmap.md` (Abschnitt "Phase 3: Instagram-Anbindung"), ergänzend `docs/flow.md`, `docs/features.md`, `docs/schema.md`.
- **Git-Base-State:** Branch `develop`, HEAD `b8777cb126230658396d18e1fcac2f3742114629`

> Details, Anforderungen und Kontext stehen in `docs/roadmap.md` — hier nicht duplizieren.

> ⚠️ **Vorbestehender Working-Tree-Zustand:** Zum Zeitpunkt der Planerstellung ist `docs/roadmap.md` bereits modifiziert (Phase-2-Status-Updates) und `.claude/plans/component-architecture-refactor.md` liegt untracked vor. Beides gehört nicht zu diesem Plan — nicht anfassen, nicht committen, nicht überschreiben.

> ⚠️ **Externe Vorbedingung (außerhalb dieses Plans):** Es existiert aktuell **kein** Vereins-Instagram-Account und **keine** Meta-App-Zugangsdaten. Dieser Plan implementiert das Feature vollständig lauffähig, aber mit Platzhalter-Env-Variablen — es kann erst nach Abschluss folgender, vom Nutzer separat zu erledigender Schritte produktiv genutzt werden:
> 1. Instagram-Business-Account anlegen und mit einer Facebook-Seite verknüpfen.
> 2. Meta-App im Meta-Developer-Portal erstellen, Produkt "Instagram Graph API" hinzufügen.
> 3. App-Review für die Berechtigung `instagram_content_publish` (und `pages_show_list`, `instagram_basic`) beantragen und genehmigt bekommen.
> 4. `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `CRON_SECRET` in `.env.local` (lokal) bzw. den Vercel-Projekt-Env-Variablen (Produktion) eintragen.
> 5. Danach im Admin-Bereich unter „Einstellungen → Instagram" (`/admin/einstellungen/instagram`, Schritte 10a/10b dieses Plans) einmalig den OAuth-Connect-Flow durchlaufen.
> Bis dahin bleibt die Funktion vollständig gebaut und getestet (Mocks), aber inaktiv.

## Persona

Du bist ein erfahrener Fullstack-TypeScript-Entwickler mit Schwerpunkt Next.js 15 (App Router), Prisma/PostgreSQL, OAuth-Integrationen und asynchroner Job-Verarbeitung auf Vercel. Du arbeitest inkrementell, testgetrieben und hältst dich strikt an bestehende Code-Konventionen dieses Repos (flache `src/lib/`-Module mit co-lokalisierten `.test.ts`-Dateien, dünne Server-Actions mit zentralem Permission-Check, externe HTTP-Aufrufe hinter einem schmalen, mockbaren Client).

## Getroffene Annahmen

- **OAuth & API-Client:** Der komplette Meta-Graph-API-Client (OAuth-Code-Exchange, Long-Lived-Token, Token-Refresh, Media-Container erstellen, Media veröffentlichen) wird real implementiert. In Tests wird ausschließlich der `fetch`-Aufruf gemockt (analog zu `src/lib/calendar.ts`/`calendar.test.ts`, dort aber für ICS statt JSON). Es entsteht kein Stub/TODO — das Feature ist fachlich fertig, nur echte Zugangsdaten fehlen (siehe Hinweis oben).
- **Env-Konfiguration:** Es existiert noch keine `.env.example`. Diese wird in Schritt 3 neu angelegt und dokumentiert sowohl die bereits bestehenden Variablen (`DATABASE_URL`, `PUBLIC_CALENDAR_ICS_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`) als auch die neuen Instagram-Variablen (`META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `META_GRAPH_API_VERSION`, `CRON_SECRET`). Weiterhin rohes `process.env.X` (kein zod/t3-env-Layer), analog zu `src/lib/auth/server.ts`.
- **Queue-Technologie:** Kein externer Queue-Dienst. Die Warteschlange ist eine reine DB-Spalten-Lösung auf `Post` (Status-Enum `InstagramStatus`), verarbeitet durch einen täglichen **Vercel-Cron-Job** (`vercel.json`, 1×/Tag, Hobby-Plan-kompatibel), der eine geschützte Route (`CRON_SECRET`-Bearer-Token) aufruft.
- **Bildquelle für den IG-Post:** `Post` erhält ein neues optionales Feld `coverImageUrl` (Upload via Vercel Blob im Editor). Ist beim Aktivieren der Instagram-Checkbox kein Cover-Bild hinterlegt, wird zur Post-Zeit automatisch eine einfache Text-Karte aus Titel/Excerpt via `@vercel/og` generiert, als PNG zu Vercel Blob hochgeladen und deren URL als Fallback-Bild verwendet — Moderatoren müssen also nie manuell abbrechen, weil ein Bild fehlt.
- **Retry-Strategie:** Fester Zähler `instagramAttempts` (Start 0). Bei Fehlschlag wird der Zähler erhöht; ab 3 Fehlschlägen wechselt der Status endgültig auf `FAILED` (kein weiterer automatischer Versuch durch den Cron). Ein manueller "Erneut versuchen"-Button (nur sichtbar bei `FAILED`) setzt `instagramAttempts` auf 0 zurück, Status auf `PENDING` und stößt die Verarbeitung für genau diesen Post **sofort synchron** an (ruft dieselbe Kernfunktion wie der Cron auf), damit Moderatoren nicht bis zum nächsten Tag warten müssen.
- **Berechtigungen:** Die Editor-Checkbox "Auch auf Instagram teilen" sowie der manuelle Retry-Button werden — wie bereits für Erstellen/Bearbeiten von Beiträgen — mit der bestehenden Permission `posts:write` gegated (passt zu `docs/features.md`, das die Instagram-Freigabe der Moderator-Rolle zuordnet). Für das Verbinden/Trennen des Instagram-Accounts (Admin-Einstellungsseite, Schritt 10) wird eine **neue, sensiblere Permission** `instagram:connect` eingeführt und ausschließlich der `admin`-Rolle zugewiesen, da hierüber echte OAuth-Zugangsdaten verwaltet werden.
- **Caption-Format:** Die Instagram-Caption wird aus `title` + `excerpt` + einem Link-Hinweis auf die Blog-Detailseite (`/news/{slug}`) zusammengesetzt (Instagram erlaubt keine klickbaren Links in der Caption — der Link wird als Text angezeigt, kein Kurz-URL-Dienst wird integriert).
- **Datenhaltung Connection:** Ein neues, separates Modell `InstagramConnection` (nicht auf `Post` verteilt) hält genau einen aktiven Datensatz mit Access-Token, IG-Business-Account-ID, Page-ID und Ablaufdatum, da es sich um eine vereinsweite (nicht post-bezogene) Verbindung handelt.
- **Admin-„Einstellungen"-Bereich:** Es gibt aktuell keine generische Settings-Seite im Adminbereich (`nav-config.ts` kennt nur `/admin`, `/admin/bestand`, `/admin/mitglieder`, `/admin/bringbuy`). Dieser Plan legt eine neue, bewusst erweiterbare Sektion `/admin/einstellungen` an: eine Index-Seite mit Karten-Layout (ein Eintrag pro Einstellungs-Modul) plus eine erste Unterseite `/admin/einstellungen/instagram` für den OAuth-Connect-Flow. Weitere zukünftige Einstellungs-Module (nicht Teil dieses Plans) werden als zusätzliche Karten + Unterseiten nach demselben Muster ergänzt. Die Index-Seite wie auch alle Unterseiten sind über `requireAdmin()` (Tier `admin`) gegated, zusätzlich prüft die Instagram-Unterseite die granulare Permission `instagram:connect` (siehe unten), damit spätere Module unabhängig granular berechtigt werden können.
- **Token-Refresh:** Läuft im selben täglichen Cron-Lauf wie die Queue-Verarbeitung mit (kein separater Cron nötig): Ist der gespeicherte Long-Lived-Token in weniger als 10 Tagen abgelaufen, wird er vor der Queue-Abarbeitung automatisch per Meta-Refresh-Endpoint erneuert.
- **Kein neues Draft/Publish-Konzept:** `Post`-Zeilen sind weiterhin sofort live (kein `publishedAt`/Status). Die Instagram-Checkbox steuert ausschließlich das Cross-Posting, nicht die Sichtbarkeit auf der eigenen Seite.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt).
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf die Quelldatei.
- Dateien über 400 Zeilen möglichst in kleinere Dateien aufteilen.
- Erstelle eine passende Ordnerstruktur (neue Instagram-Logik gebündelt unter `src/lib/instagram/`, analog zur bestehenden Flach-Struktur unter `src/lib/`).
- **Unit-Tests:** Für neue Logik/Funktionen Unit-Tests schreiben. Die Definition of Done eines Schritts gilt erst als erfüllt, wenn die zugehörigen Tests grün sind. Ausgenommen sind rein mechanische/nicht-testbare Schritte (Config, Doku, Boilerplate).
- **Committe nur Dateien, die du selbst geschrieben hast** — andere Dateien im Working Directory ignorieren (kein `git add .`, sondern gezieltes `git add <datei>`). Insbesondere `docs/roadmap.md` (siehe Hinweis oben) nicht anfassen, außer im letzten Schritt (Roadmap-Status-Update).
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert: < 1 h Arbeit).
- **Bei Fehlschlag eines Schritts:** nicht mit dem nächsten Schritt fortfahren, nichts committen, Fehler auf Deutsch melden.
- Markiere jeden erledigten Schritt mit `[x]`, sobald er abgeschlossen und committet ist.

## Schritte

- [x] **0. Repository-Zustand prüfen**
      `git status` ausführen und bestätigen, dass Git funktioniert. Die vorbestehenden Änderungen (`docs/roadmap.md`, `.claude/plans/component-architecture-refactor.md`) zur Kenntnis nehmen und **nicht** in diesem Plan committen.
      _Definition of Done:_ `git status` läuft fehlerfrei, vorbestehende fremde Änderungen bleiben unangetastet.
      Kein Commit in diesem Schritt (rein informativ).

- [x] **1. Fetch-Mocking-Strategie für externe HTTP-Clients etablieren**
      Vitest ist bereits vorhanden (`vitest.config.ts`), bisher aber nur für Prisma-Mocks (`src/lib/__mocks__/prisma.ts`) und Fixture-Dateien (ICS) genutzt — es fehlt eine Konvention für das Mocken von JSON-basierten `fetch`-Aufrufen an externe REST-APIs. Lege `src/lib/__fixtures__/instagram/` mit 2–3 Beispiel-JSON-Antworten (Erfolg Media-Container, Erfolg Publish, Fehler/Rate-Limit) an und einen minimalen Beispieltest, der `global.fetch` per `vi.fn()` mockt und eine Fixture zurückgibt.
      _Definition of Done:_ `pnpm test` läuft grün, Beispieltest mit gemocktem `fetch` und JSON-Fixture vorhanden.
      `git commit -m "test: add fetch mocking convention for external json apis"`

- [x] **2. Prisma-Schema erweitern**
      `prisma/schema.prisma`: neues Enum `InstagramStatus { PENDING QUEUED POSTED FAILED }`. `Post` erhält `coverImageUrl String?`, `instagramStatus InstagramStatus?`, `instagramPostUrl String?`, `instagramAttempts Int @default(0)`, `instagramLastError String?` (bestehendes Feld `instagram Boolean?` bleibt als "Freigabe erwünscht"-Flag erhalten). Neues Modell `InstagramConnection` (id, accessToken, igBusinessAccountId, pageId, expiresAt, updatedAt). Migration gegen die Neon-DB ausführen.
      _Definition of Done:_ `prisma migrate dev` läuft ohne Fehler gegen die Neon-DB, `pnpm build` bricht nicht.
      `git commit -m "feat: extend prisma schema for instagram cross-posting"`

- [x] **3. Env-Konfiguration dokumentieren**
      `.env.example` neu anlegen (existiert noch nicht) mit allen bestehenden Variablen (Platzhalterwerte, keine echten Secrets) plus neuen Instagram-Variablen: `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `META_GRAPH_API_VERSION` (z. B. `v21.0`), `CRON_SECRET`. Kurzer Kommentar je Variable, welche extern (Meta Developer Portal) beschafft werden muss.
      _Definition of Done:_ `.env.example` vorhanden und vollständig, keine echten Secrets enthalten.
      `git commit -m "docs: add env example with instagram configuration placeholders"`

- [x] **4. Meta-Graph-API-Client**
      `src/lib/instagram/graph-client.ts`: schmaler Wrapper um `fetch` mit den Funktionen `exchangeCodeForShortLivedToken(code)`, `getLongLivedToken(shortLivedToken)`, `refreshLongLivedToken(currentToken)`, `createMediaContainer({ igBusinessAccountId, imageUrl, caption, accessToken })`, `publishMedia({ igBusinessAccountId, creationId, accessToken })`. Jede Funktion wirft einen typisierten Fehler (`InstagramApiError`) bei nicht-2xx-Antworten inkl. Meta-Fehlercode/-message aus dem JSON-Body.
      _Definition of Done:_ Unit-Tests (`graph-client.test.ts`) für Erfolgs- und Fehlerfall jeder Funktion grün, unter Nutzung der Fixtures aus Schritt 1.
      `git commit -m "feat: add meta graph api client for instagram publishing"`

- [x] **5. Cover-Bild-Pipeline mit OG-Fallback**
      `@vercel/blob` und `@vercel/og` installieren. `src/lib/instagram/cover-image.ts`: Funktion `resolveCoverImageUrl(post)` — gibt `post.coverImageUrl` zurück falls vorhanden, sonst generiert sie via `@vercel/og` (`ImageResponse`) eine einfache 1080×1080-PNG-Textkarte aus `title`/`excerpt`, lädt sie über `@vercel/blob`'s `put()` hoch und gibt die öffentliche Blob-URL zurück.
      _Definition of Done:_ Unit-Test mockt `put()` aus `@vercel/blob` und prüft, dass bei vorhandenem `coverImageUrl` kein Upload erfolgt, bei fehlendem `coverImageUrl` ein Fallback-Bild generiert und hochgeladen wird.
      `git commit -m "feat: add cover image resolution with og-generated fallback"`

- [x] **6. Cover-Bild-Upload & Instagram-Checkbox im Editor**
      `src/components/feature/admin-news/post-form.tsx`: neues Bild-Upload-Feld (Client-Upload zu Vercel Blob, z. B. via `@vercel/blob/client` und einer schlanken Server-Action `getUploadToken`) für `coverImageUrl`, sowie Checkbox "Auch auf Instagram teilen" (bindet an `instagram`-Feld) mit Status-Badge (Warteschlange/Erfolgreich/Fehlgeschlagen, sichtbar wenn `instagramStatus` gesetzt ist) und Retry-Button bei `FAILED` (siehe Schritt 9). `src/components/feature/admin-news/actions.ts`: `PostInput` um `coverImageUrl?: string` erweitern; `createPost`/`updatePost` setzen bei `instagram: true` und noch keinem `instagramStatus` automatisch `instagramStatus: "PENDING"`.
      _Definition of Done:_ Unit-Tests in `actions.test.ts` prüfen, dass Aktivieren der Checkbox `instagramStatus` auf `PENDING` initialisiert und Deaktivieren keinen Status setzt/zurücksetzt; manueller Test: Checkbox + Bild-Upload im Editor sichtbar und speicherbar.
      `git commit -m "feat: add cover image upload and instagram checkbox to post editor"`

- [x] **7. Queue-Verarbeitungslogik**
      `src/lib/instagram/queue.ts`: `findDuePosts()` (Prisma-Query: `instagram = true AND instagramStatus IN (PENDING, QUEUED) AND instagramAttempts < 3`), `processPost(post)` (holt aktive `InstagramConnection`, ermittelt Bild-URL via Schritt 5, baut Caption aus Titel/Excerpt/Link, ruft `createMediaContainer` + `publishMedia` aus Schritt 4 auf; bei Erfolg `instagramStatus: POSTED`, `instagramPostUrl` gesetzt; bei Fehler `instagramAttempts + 1`, `instagramLastError` gesetzt, `instagramStatus: FAILED` falls Zähler ≥ 3, sonst weiterhin `PENDING`), `processQueue()` (iteriert `findDuePosts()` sequenziell und ruft `processPost` auf, gibt Zusammenfassung `{ processed, succeeded, failed }` zurück).
      _Definition of Done:_ Unit-Tests (`queue.test.ts`) mit gemocktem Prisma-Client und gemocktem `graph-client`/`cover-image` decken ab: Erfolg, Fehlschlag unter Zähler-Limit (Status bleibt `PENDING`), Fehlschlag am Zähler-Limit (Status wird `FAILED`).
      `git commit -m "feat: add instagram queue processing logic"`

- [x] **8. Cron-Endpoint & Vercel-Konfiguration**
      `src/app/api/cron/instagram-queue/route.ts` (GET-Handler): prüft `Authorization: Bearer <CRON_SECRET>`-Header (401 bei fehlendem/falschem Wert), ruft `processQueue()` aus Schritt 7 auf, gibt JSON-Zusammenfassung zurück. `vercel.json` neu anlegen mit `crons`-Eintrag (`path: /api/cron/instagram-queue`, `schedule: "0 5 * * *"` — 1×/Tag, Hobby-Plan-kompatibel).
      _Definition of Done:_ Unit-Test für die Route: fehlender/falscher Header → 401 ohne Aufruf von `processQueue`; korrekter Header → `processQueue` wird aufgerufen und Ergebnis als 200 zurückgegeben.
      `git commit -m "feat: add daily cron endpoint for instagram queue processing"`

- [x] **9. Manueller Retry**
      `retryInstagramPost(postId)` in `src/components/feature/admin-news/actions.ts`: prüft `posts:write`-Permission, setzt `instagramAttempts: 0`, `instagramStatus: "PENDING"`, `instagramLastError: null`, ruft anschließend synchron `processPost` aus Schritt 7 für genau diesen Post auf und gibt das Ergebnis zurück. Retry-Button aus Schritt 6 ruft diese Action auf.
      _Definition of Done:_ Unit-Tests: fehlende Permission → Fehler ohne DB-Änderung; erfolgreicher Aufruf setzt Zähler/Status zurück und verarbeitet sofort (gemockt).
      `git commit -m "feat: add manual retry action for failed instagram posts"`

- [x] **10a. Admin-„Einstellungen"-Bereich anlegen (erweiterbare Hülle)**
      Neue Route `src/app/admin/einstellungen/page.tsx`, geschützt via `requireAdmin()`: Karten-Layout (wiederverwendbare Komponente `src/components/feature/admin-settings/settings-card.tsx`), das pro Einstellungs-Modul eine Karte mit Titel, Kurzbeschreibung und Link auf die jeweilige Unterseite rendert. Für diesen Plan genau eine Karte "Instagram" → `/admin/einstellungen/instagram` (Inhalt/Status der Karte folgt in Schritt 10b). Neuer Eintrag `{ label: "Einstellungen", href: "/admin/einstellungen", icon: Settings, section: "Administration" }` in `src/lib/nav-config.ts` (Administration-Gruppe). Die Karten-Liste wird als einfaches, typisiertes Array in der Page selbst gepflegt (kein Overengineering für aktuell ein Modul), aber so geschnitten, dass ein weiteres Modul nur ein zusätzliches Array-Element + eine neue Unterseite erfordert.
      _Definition of Done:_ Manueller Test: `/admin/einstellungen` ist im Sidebar-Nav unter "Administration" sichtbar (nur für Tier `admin`), zeigt die Instagram-Karte, Zugriff ohne Admin-Session wird auf `/403` umgeleitet (analog bestehendem `requireAdmin()`-Verhalten). Kein dediziertes Unit-Test nötig (reines Layout/Routing ohne Logik) — Definition of Done stützt sich auf den manuellen Test.
      `git commit -m "feat: add extensible admin settings hub"`

- [x] **10b. Instagram-OAuth-Connect-Flow (Unterseite der Einstellungen)**
      Neue Permission `instagram:connect` in `prisma/seed.ts` ergänzen, ausschließlich der `admin`-Rolle zugewiesen. `src/app/admin/einstellungen/instagram/page.tsx` (geschützt via `requirePermission("instagram:connect")`, zusätzlich zur `requireAdmin()`-Gate der übergeordneten Hülle aus Schritt 10a): zeigt Verbindungsstatus (verbunden/getrennt, Token-Ablaufdatum aus `InstagramConnection`) und einen "Mit Instagram verbinden"-Button, der zum Meta-OAuth-Dialog redirected (URL aus `META_APP_ID`/`META_REDIRECT_URI` gebaut, inkl. CSRF-`state`-Parameter), sowie einen "Trennen"-Button (löscht den `InstagramConnection`-Datensatz). Die Karte auf der Index-Seite aus Schritt 10a zeigt zusätzlich den aktuellen Verbindungsstatus als Badge an. `src/app/api/auth/instagram/callback/route.ts`: validiert `state`, tauscht `code` über `exchangeCodeForShortLivedToken` + `getLongLivedToken` (Schritt 4) gegen einen Long-Lived-Token, ermittelt IG-Business-Account-ID/Page-ID über die Graph API und speichert alles upsert in `InstagramConnection`.
      _Definition of Done:_ Unit-Tests für die Callback-Route (ungültiger/fehlender `state` → Fehler; erfolgreicher Austausch mit gemocktem `graph-client` → `InstagramConnection` upserted) sowie für die "Trennen"-Server-Action (Permission-Check, Löschung); manueller Test lokal nur mit Platzhalter-Credentials bis echte Meta-App-Daten vorliegen (siehe externe Vorbedingung oben) — Definition of Done bezieht sich hier ausschließlich auf die gemockten Unit-Tests, nicht auf einen echten End-to-End-OAuth-Durchlauf.
      `git commit -m "feat: add instagram oauth connect flow to settings page"`

- [x] **11. Token-Refresh im Cron**
      `src/lib/instagram/queue.ts` (oder neue Funktion `refreshConnectionIfNeeded()` in `graph-client.ts`/`queue.ts`): vor `processQueue()` im Cron-Handler aus Schritt 8 aufgerufen. Prüft `InstagramConnection.expiresAt`; liegt der Zeitpunkt weniger als 10 Tage in der Zukunft, wird `refreshLongLivedToken` (Schritt 4) aufgerufen und `accessToken`/`expiresAt` aktualisiert.
      _Definition of Done:_ Unit-Test prüft: Refresh wird ausgelöst bei `expiresAt` < 10 Tage entfernt, nicht ausgelöst bei weiter entferntem `expiresAt`; Fehler beim Refresh bricht die anschließende Queue-Verarbeitung nicht ab (nur geloggt).
      `git commit -m "feat: add automatic instagram token refresh to daily cron"`

- [x] **12. Setup-Dokumentation für externe Vorbedingungen**
      Neuer Abschnitt in `README.md` (oder `docs/instagram-setup.md`, je nachdem was zur bestehenden Doku-Struktur passt): dokumentiert die in der Planeinleitung genannten externen Schritte (Meta-App anlegen, Instagram-Business-Account verknüpfen, App-Review beantragen, Env-Variablen eintragen, OAuth-Connect-Flow einmalig durchlaufen) als klare Checkliste für den Nutzer, bevor das Feature produktiv genutzt werden kann.
      _Definition of Done:_ Dokument vorhanden, verlinkt aus `README.md` falls als separate Datei angelegt. Kein Code, daher keine Tests nötig (mechanischer Doku-Schritt).
      `git commit -m "docs: add instagram setup checklist for external prerequisites"`

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Claude Sonnet 5) als Standard für alle Schritte.
- **Reasoning/Thinking:** an, hoher Effort speziell für Schritte 2, 7, 10b und 11 (Schema-/Status-Machine-Design der Queue, OAuth-Callback-Sicherheit inkl. CSRF-`state`, Token-Refresh-Timing); mittlerer Effort für Schritte 4, 5, 6, 8, 9, 10a (klar abgegrenzte Feature-Arbeit mit einigen Fehlerfall-Verzweigungen bzw. neue, aber einfache UI-Struktur); niedriger Effort ausreichend für Schritte 0, 1, 3, 12 (überwiegend mechanisch/Doku).
- **Begründung:** Der Plan enthält mehrere echte Architektur-Entscheidungen mit Seiteneffekten über mehrere Systeme hinweg (Retry-Zähler-Logik, Token-Ablauf-Handling, OAuth-State-Validierung), die von höherem Reasoning-Effort profitieren — ein Fehler hier führt zu schwer sichtbaren Bugs (z. B. Endlos-Retry, abgelaufene Tokens, CSRF-Lücke). Reine CRUD-/UI-Erweiterungen und Doku-Schritte sind dagegen Standard-Aufwand.
