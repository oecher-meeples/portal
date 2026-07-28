# Ausführungsplan: Phase 2 — Funktionale Webseite (Public Area & Admin-Einstieg)

- **Erstellt/Aktualisiert:** 2026-07-28 13:00
- **Ziel:** Anbindung einer echten Datenbank, Einladungsbasierter Login via Neon Auth, permission-basiertes Rollenmodell, Live-Markdown-Blog-Editor und öffentlicher Kalender-Sync (Meilensteine 2.1–2.3 aus `docs/roadmap.md`).
- **Quelle:** `docs/roadmap.md` (Abschnitt "Phase 2: Funktionale Webseite")
- **Git-Base-State:** Branch `develop`, HEAD `ceea58a48eb70cee2058970f0979dada4dc55b26`

> Details, Anforderungen und Kontext stehen in `docs/roadmap.md` — hier nicht duplizieren.

> ⚠️ **Vorbestehender Working-Tree-Zustand:** Zum Zeitpunkt der Planerstellung gibt es unabhängig von diesem Plan bereits lokale Änderungen (`src/components/ui/button.tsx` modifiziert, `package-lock.json` untracked). Diese gehören nicht zu diesem Plan — nicht anfassen, nicht committen, nicht überschreiben.

## Persona

Du bist ein erfahrener Fullstack-TypeScript-Entwickler mit Schwerpunkt Next.js 15 (App Router), Prisma/PostgreSQL und Auth-Integrationen. Du arbeitest inkrementell, testgetrieben und hältst dich strikt an bestehende Code-Konventionen dieses Repos (flache `src/lib/`-Module mit co-lokalisierten `.test.ts`-Dateien, Server Components als primärer Datenzugriffspunkt).

## Getroffene Annahmen

- **Auth-Architektur:** Neon Auth (Stack Auth, im Neon-Projekt bereits aktiviert) übernimmt Passwort-Hashing, Session-Handling und Nutzerverwaltung. Kein selbstgebauter Auth.js-`CredentialsProvider`. Neon Auth synct Nutzer automatisch in eine von Neon verwaltete Tabelle (`neon_auth.users_sync` o. ä.); unser eigenes Schema hängt Rollen/Permissions per Foreign Key an diese Tabelle an, statt eine eigene `User`-Tabelle mit Passwort-Feld zu führen.
- **Registrierung:** ausschließlich einladungsbasiert. Admin erzeugt im Admin-Bereich einen zeitlich begrenzten Invite-Token. Versand über einen `mailto:`-Link (öffnet lokalen E-Mail-Client des Admins mit vorausgefülltem Text/Link) — kein E-Mail-Versand-Dienst nötig. Keine separate E-Mail-Verifizierung, da der Invite-Token bereits die Berechtigung zur Registrierung nachweist.
- **Google SSO:** vorerst zurückgestellt (dem Nutzer aktuell zu aufwendig einzurichten). Neon Auth unterstützt OAuth-Provider nativ — spätere Aktivierung voraussichtlich ohne Schema-Änderung möglich, daher keine Vorarbeit dafür in diesem Plan.
- **Rollenmodell:** permission-basiertes RBAC, kein Rollen-Enum. `Permission` = atomare Berechtigung pro Feature, `Role` = benannte Menge von `Permission`s, `AppUser` kann mehrere `Role`s haben (many-to-many auf beiden Ebenen).
- **Kalender-Sync:** ausschließlich über den öffentlichen ICS-Feed (`PUBLIC_CALENDAR_ICS_URL` in `.env.local`) per Server-Fetch + Parser (`node-ical`). Kein Google Calendar API OAuth/Service Account.
- **Spenden-Integration:** nicht Teil dieses Plans (vom Nutzer explizit aus Phase 2 herausgenommen).
- **Erst-Admin & Demo-Daten:** über ein Seed-Skript (`prisma/seed.ts`), das einen Admin-User (via Neon Auth Server-API) sowie ein zusätzliches Demo-Seed mit Beispiel-Rollen/-Mitgliedern/-Beiträgen anlegt.
- **Markdown-Editor:** einfaches Textarea + Live-Preview über das bereits installierte `react-markdown`, keine zusätzliche WYSIWYG-Library.
- **Bestandsdaten-Migration:** die 7 vorhandenen Markdown-Mock-Beiträge unter `content/posts/*.md` (Frontmatter: `type`, `title`, `excerpt`, `date`, `author?`, `location?`, `internal?`, `instagram?`; geparst in `src/lib/content.ts`) werden per Einmal-Skript in die neue `Post`-Tabelle importiert. Die Funktionssignaturen `getAllContent`, `getContentBySlug`, `getUpcomingEvents`, `getLatestPosts` in `src/lib/content.ts` bleiben erhalten, intern aber auf Prisma-Queries umgestellt, damit die 9 bestehenden Aufrufer (`src/app/news/*`, `src/app/page.tsx`, `src/app/dashboard/page.tsx`, Content-Komponenten) unverändert bleiben.
- **Demo-Rollen-Mock:** `src/lib/role-context.tsx` (Client-seitiger Rollen-Switcher `"gast" | "mitglied" | "admin"` aus Phase 1) wird durch echte Session-/Permission-Prüfung ersetzt.
- **Datenbank:** Neon-Projekt bereits erstellt, `DATABASE_URL` liegt in `.env.local` (git-ignored). Lokale Entwicklung und "Produktion" nutzen vorerst dieselbe Neon-DB (kein separates Preview-Branching in diesem Plan).

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt).
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf die Quelldatei.
- Dateien über 400 Zeilen möglichst in kleinere Dateien aufteilen.
- Erstelle eine passende Ordnerstruktur (Prisma-Konventionen: `prisma/schema.prisma`, `prisma/seed.ts`; Datenzugriff weiterhin flach unter `src/lib/`).
- **Unit-Tests:** Für neue Logik/Funktionen Unit-Tests schreiben. Die Definition of Done eines Schritts gilt erst als erfüllt, wenn die zugehörigen Tests grün sind. Ausgenommen sind rein mechanische/nicht-testbare Schritte (Config, Doku, Boilerplate).
- **Committe nur Dateien, die du selbst geschrieben hast** — andere Dateien im Working Directory ignorieren (kein `git add .`, sondern gezieltes `git add <datei>`). Insbesondere `src/components/ui/button.tsx` und `package-lock.json` (siehe Hinweis oben) nicht anfassen.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert: < 1 h Arbeit).
- **Bei Fehlschlag eines Schritts:** nicht mit dem nächsten Schritt fortfahren, nichts committen, Fehler auf Deutsch melden.
- Markiere jeden erledigten Schritt mit `[x]`, sobald er abgeschlossen und committet ist.

## Schritte

- [x] **0. Repository-Zustand prüfen**
      `git status` ausführen und bestätigen, dass Git funktioniert. Die vorbestehenden unstaged/untracked Dateien (`src/components/ui/button.tsx`, `package-lock.json`) zur Kenntnis nehmen und **nicht** in diesem Plan committen.
      _Definition of Done:_ `git status` läuft fehlerfrei, vorbestehende fremde Änderungen bleiben unangetastet.
      Kein Commit in diesem Schritt (rein informativ).

- [x] **1. Testumgebung für DB-/Auth-gestützte Logik vorbereiten**
      Vitest ist bereits vorhanden. Ergänze eine Strategie zum Testen von Prisma-abhängigem Code ohne echte Netzwerkverbindung zur Neon-DB (z. B. `vitest-mock-extended` oder ein manuelles Prisma-Client-Mock unter `src/lib/__mocks__/prisma.ts`). Lege einen minimalen Beispieltest an, der das Mock nutzt.
      _Definition of Done:_ `pnpm test` läuft grün, Beispieltest mit gemocktem Prisma-Client vorhanden.
      `git commit -m "test: add prisma client mocking strategy"`

- [x] **2. Prisma installieren & Basis-Schema anlegen**
      `prisma` + `@prisma/client` installieren. `prisma/schema.prisma` mit PostgreSQL-Datasource (`DATABASE_URL` aus `.env.local`) anlegen. Modelle: `Permission` (key, description), `Role` (name, description), `RolePermission` (Join), `UserRole` (Join, referenziert externe Neon-Auth-User-ID als `String`/`neonAuthUserId`), `Post` (id, slug, type-Enum `BLOG | TERMIN | TURNIER`, title, excerpt, body, date, author, location?, internal?, instagram?), `Invite` (token, createdByUserId, expiresAt, redeemedAt?). Prisma-Client-Singleton unter `src/lib/prisma.ts` (Next.js-üblicher Hot-Reload-Schutz via globalThis). Erste Migration gegen die Neon-DB ausführen (`prisma migrate dev`).
      _Definition of Done:_ `prisma migrate dev` läuft ohne Fehler gegen die Neon-DB, `src/lib/prisma.ts` exportiert einen funktionierenden Client, Build (`pnpm build`) bricht nicht.
      `git commit -m "feat: add prisma schema and client for roles, permissions, posts, invites"`

- [x] **3. Neon Auth SDK integrieren**
      Neon-Auth-/Stack-Auth-SDK-Paket installieren, gemäß Neon-Auth-Doku für Next.js App Router konfigurieren (Provider im Root-Layout, Middleware für geschützte Routen, Server-seitige Session-Helper `getCurrentUser()`). Login-Seite unter `src/app/login/page.tsx`, die Neon-Auth-Login-UI/Flow einbindet. Kein eigenes Passwort-Handling.
      _Definition of Done:_ Login mit einem manuell in Neon Auth angelegten Test-User funktioniert lokal (`pnpm dev`), `getCurrentUser()` liefert die eingeloggte Session server-seitig.
      `git commit -m "feat: integrate neon auth for session-based login"`

- [x] **4. Permission-Helper & Route-Guards**
      `src/lib/permissions.ts`: Funktion `hasPermission(neonAuthUserId, permissionKey)`, die über `UserRole` → `RolePermission` → `Permission` prüft. Helper `requirePermission()` für Server Components/Route Handler, der bei fehlender Berechtigung auf eine 403-Seite umleitet bzw. `null`/Redirect zurückgibt. Unit-Tests mit gemocktem Prisma-Client aus Schritt 1.
      _Definition of Done:_ Tests für `hasPermission` (Positiv-/Negativfall, mehrere Rollen) grün.
      `git commit -m "feat: add permission checking helpers"`

- [x] **5. Seed-Skript (Admin + Demo-Daten)**
      `prisma/seed.ts`: legt Basis-Permissions (z. B. `posts:write`, `posts:delete`, `invites:create`, `members:manage`) und eine `admin`-Rolle mit allen Permissions an. Legt über die Neon-Auth-Server-API einen ersten Admin-User an (Zugangsdaten aus ENV-Variablen `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`, Platzhalter in `.env.local` ergänzen) und verknüpft ihn mit der `admin`-Rolle. Zusätzliches Demo-Seed: 2–3 Beispiel-Mitglieder-Rollen und ein paar Beispiel-Datensätze (nur Rollen/Nutzer, Posts folgen in Schritt 8 aus der echten Migration). `package.json`-Skript `db:seed` ergänzen.
      _Definition of Done:_ `pnpm db:seed` läuft fehlerfrei durch, Admin-User kann sich danach über die Login-Seite aus Schritt 3 einloggen und hat alle Permissions.
      `git commit -m "feat: add prisma seed script for admin and demo data"`

- [x] **6. Invite-Flow**
      Admin-UI unter `src/app/admin/invites/page.tsx`: Formular zum Erzeugen eines Invite-Tokens (Server Action, prüft `invites:create`-Permission), Token wird mit Ablaufdatum (z. B. 7 Tage) in `Invite`-Tabelle gespeichert. Nach Erzeugung wird ein `mailto:`-Link mit vorausgefülltem Betreff/Text inkl. Registrierungslink (`/register?token=...`) angezeigt. Registrierungsseite `src/app/register/page.tsx`: validiert Token (nicht abgelaufen, nicht eingelöst), bindet Neon-Auth-Signup-Flow ein, markiert Token nach erfolgreicher Registrierung als eingelöst und weist eine Standard-Rolle (z. B. "mitglied") zu.
      _Definition of Done:_ Unit-Tests für Token-Validierung (gültig/abgelaufen/bereits eingelöst) grün; manueller Durchlauf lokal: Invite erzeugen → Registrierungslink öffnen → Account erstellen → Standard-Rolle zugewiesen.
      `git commit -m "feat: add invitation-based registration flow"`

- [x] **7. Blog-Datenmigration auf Prisma umstellen**
      Einmal-Migrationsskript `scripts/migrate-mock-posts.ts`: liest alle Dateien aus `content/posts/*.md` (bestehende Logik aus `src/lib/content.ts` wiederverwenden), erzeugt daraus `Post`-Datensätze in der DB. `src/lib/content.ts` intern von Dateisystem-Zugriff auf Prisma-Queries umstellen, **Funktionssignaturen unverändert** (`getAllContent`, `getContentBySlug`, `getUpcomingEvents`, `getLatestPosts`), damit die 9 bestehenden Aufrufer unverändert bleiben. Bestehende Tests in `src/lib/content.test.ts` auf das Prisma-Mock aus Schritt 1 umstellen.
      _Definition of Done:_ Migrationsskript einmalig erfolgreich gegen die Neon-DB gelaufen (7 Posts in DB verifiziert), `src/lib/content.test.ts` grün, `/news`-Seite zeigt lokal dieselben 7 Beiträge wie vorher aus den Mock-Dateien.
      `git commit -m "refactor: migrate blog content from markdown files to database"`

- [x] **8. Live-Markdown-Editor für Moderatoren**
      Admin-Bereich `src/app/admin/news/page.tsx` (Liste bestehender Posts, geschützt durch `posts:write`) und `src/app/admin/news/[id]/edit/page.tsx` bzw. `new/page.tsx`: Formular mit Feldern Titel, Typ, Datum, Excerpt, Autor sowie Markdown-Textarea mit Live-Preview via `react-markdown` (Split-View oder Tab-Umschalter). Server Actions für Create/Update/Delete, jeweils mit Permission-Check (`posts:write` / `posts:delete`).
      _Definition of Done:_ Unit-Tests für die Server Actions (Berechtigungsprüfung, Validierung Pflichtfelder) grün; manueller Test: neuer Beitrag im Editor erstellt erscheint auf `/news`.
      `git commit -m "feat: add markdown editor for blog post management"`

- [x] **9. Google-Kalender-ICS-Sync**
      `src/lib/calendar.ts`: Funktion `getUpcomingCalendarEvents()`, die `PUBLIC_CALENDAR_ICS_URL` fetcht, mit `node-ical` parst und in ein einheitliches, zu `ContentItem`-ähnliches Format konvertiert. Next.js `fetch`-Caching mit sinnvollem `revalidate`-Intervall (z. B. 15 Minuten) nutzen. Einbindung in die bestehenden Termin-Ansichten (`/news`-Filter "termin", Homepage-Vorschau), zusammengeführt mit den DB-Terminen aus Schritt 7.
      _Definition of Done:_ Unit-Test mit gemocktem ICS-Response (Fixture-Datei) prüft korrektes Parsing; manueller Test zeigt echte Termine aus dem öffentlichen Kalender auf der Seite.
      `git commit -m "feat: sync public google calendar events via ics feed"`

- [ ] **10. Demo-Rollen-Mock durch echte Sessions ersetzen**
      `src/lib/role-context.tsx` (Client-seitiger `"gast"|"mitglied"|"admin"`-Switcher aus Phase 1) durch echte serverseitige Session-/Permission-Prüfung ersetzen. Alle Konsumenten (u. a. `admin/page.tsx`, `dashboard/page.tsx`) auf `getCurrentUser()`/`hasPermission()` aus Schritt 3/4 umstellen. Den alten Rollen-Switcher entfernen, sofern nicht anderweitig für Demo-Zwecke benötigt (mit Nutzer klären, falls unklar bei Umsetzung).
      _Definition of Done:_ Keine Referenz auf `useRole`/`RoleProvider` mehr im Code (`grep` liefert keine Treffer außer ggf. Tests, die dann ebenfalls entfernt/angepasst wurden); Zugriff auf `/admin` ohne Admin-Session wird geblockt (manueller Test).
      `git commit -m "refactor: replace mock role switcher with real session-based permissions"`

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-3-7` (Claude Sonnet 3.7) als Standard für alle Schritte.
- **Reasoning/Thinking:** an, mittlerer bis hoher Effort speziell für Schritte 2, 3, 4 und 10 (Schema-/Architekturentscheidungen, Auth-Integration, Ablösung des bestehenden Rollen-Mocks); niedriger Effort ausreichend für Schritte 0, 1, 5, 7, 9 (überwiegend mechanisch/Boilerplate).
- **Begründung:** Die Aufgaben sind reguläre, gut abgegrenzte Feature-Arbeit (CRUD, Auth-Integration, Datenmigration) ohne hochgradig verschachtelte Architekturunsicherheit — Opus wäre hier Overkill. Schritte mit echten Trade-off-Entscheidungen (z. B. wie die Neon-Auth-Usertabelle korrekt referenziert wird, wie der Permission-Guard mit Server Components zusammenspielt) profitieren von höherem Thinking-Effort, rein mechanische Schritte nicht.
