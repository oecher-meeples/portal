# Ausführungsplan: Newsletter-Feature (Brevo)

Stand: 2026-08-03. Kein Code in diesem Schritt — reine Planung.

## Rahmenbedingungen

- **Versand:** Brevo (300 Mails/Tag frei, unbegrenzte Kontakte). `BREVO_API_KEY` ist beantragt, **liegt noch nicht vor**.
- **Tests:** Unit-Tests (gemockter Prisma-Client + gemockter Brevo-Client) müssen ohne Key grün sein. Ein `*.live.test.ts` gegen die echte Brevo-API wird angelegt, schlägt aber ohne echten Key erwartungsgemäß fehl — das ist unkritisch, da `pnpm run test` `*.live.test.ts` laut `CLAUDE.md` ausschließt und nur `pnpm run test:live` diese Tests ausführt.
- **Kategorien:** Termine, News, Turniere, Berichte zu vergangenen Events — eigenständiges Enum, entkoppelt von `PostType` (Inhalts-Klassifikation ≠ Abonnenten-Interesse), mit sinnvollem Default-Mapping bei Post-Erstellung.
- **Zwei Abonnenten-Quellen, eine Tabelle:** Anonyme Interessierte (Public-Formular, Double-Opt-In nötig) und Meeples (Profil-Toggle, kein Double-Opt-In nötig, da bereits authentifiziert). Eine gemeinsame `NewsletterSubscriber`-Tabelle mit optionalem `meepleId`-Link vermeidet Logik-Duplikation.
- **Versand-Trigger:** Vercel Hobby erlaubt nur **einen** Cron-Job, aktuell belegt von `/api/cron/instagram-queue`. Newsletter-Versand läuft deshalb über eine Queue-Tabelle, verarbeitet vom selben Cron-Endpoint (nicht synchron beim Publizieren) — analog zum bestehenden Instagram-Queue-Muster in `src/lib/instagram/queue.ts`.
- **Docs-Drift:** `docs/kostenanalyse.md:22-36` empfiehlt aktuell noch Resend statt Brevo — wird in Phase 8 korrigiert.
- **Post-Entwurfslogik (neu, hat Priorität):** Der Newsletter-Versand aus der Post-Erstellung heraus (Phase 6) darf erst bei „Veröffentlichen" auslösen, nicht schon beim Speichern eines Entwurfs. Die Entwurfslogik ist deshalb an erster Stelle umzusetzen, bevor die Newsletter-Integration in `PostForm`/`actions.ts` aufsetzt.

### Verifizierte Ausgangslage (Code gelesen, keine Annahme mehr)

- `Post`-Model (`prisma/schema.prisma:220-240`) hat aktuell **kein** Draft/Published-Feld — jeder Post ist sofort live.
- `PostForm` (`src/components/feature/admin-news/post-form.tsx`) hat einen einzigen Submit-Button („Beitrag erstellen" / „Änderungen speichern"), Checkboxen `internal`/`instagram` nach bekanntem Muster.
- `AdminNewsView` (`src/components/feature/admin-news/admin-news-view.tsx:33-41, 68-101`) rendert `internal`/`instagram` als Icon-Badges neben dem Titel — Entwurfs-Markierung folgt demselben Muster.
- `createPost`/`updatePost` (`src/components/feature/admin-news/actions.ts:65-124`) setzen `instagramStatus` nur, wenn `instagram && !internal` — dieselbe Stelle muss künftig zusätzlich auf `status === "PUBLISHED"` prüfen.

---

## Phase 1 — Post Entwurf/Veröffentlichen-Logik (zuerst umsetzen)

Dateien: `prisma/schema.prisma`, `src/components/feature/admin-news/actions.ts`, `post-form.tsx`, `admin-news-view.tsx`, zugehörige Tests

- [ ] Enum `PostStatus` { DRAFT, PUBLISHED } in `prisma/schema.prisma`, Feld `status PostStatus @default(PUBLISHED)` auf `Post` — Default `PUBLISHED` hält bestehende Posts beim Migrieren unverändert sichtbar.
- [ ] `PostInput` (`actions.ts:14-25`) um `status: "DRAFT" | "PUBLISHED"` erweitern.
- [ ] `createPost`/`updatePost`: `instagramStatus` (und später `newsletterStatus`, siehe Phase 6) nur setzen, wenn zusätzlich `input.status === "PUBLISHED"` — Entwürfe lösen kein Cross-Posting aus.
- [ ] `PostForm`:
  - Zwei Submit-Buttons statt einem: **„Als Entwurf speichern"** (`status: "DRAFT"`) und **„Absenden"** (`status: "PUBLISHED"`) — beide rufen `handleSubmit`, aber mit unterschiedlichem `status`-Wert im `PostInput`; kein zweites Formular nötig, nur zwei `type="submit"`-Buttons mit `formAction`-artiger Unterscheidung über einen `onClick`, der den zu sendenden Status vorher setzt (Details beim Implementieren, kein neues UI-Primitive nötig).
  - Zusätzliche Checkbox **„Entwurf kopieren?"** — erscheint nur, wenn `postId` gesetzt **und** `initialValues?.status === "DRAFT"` (d. h. beim Öffnen eines bestehenden Entwurfs). Ist sie aktiviert, wird beim Speichern **nicht** `updatePost(postId, …)`, sondern `createPost(…)` aufgerufen (der bestehende Entwurf bleibt unverändert erhalten, ein neuer Post/Entwurf entsteht als Kopie).
- [ ] `AdminNewsView`: `AdminNewsPostRow`-Typ (`admin-news-view.tsx:33-41`) um `status: string` erweitern, Entwurfs-Markierung als zusätzliches Badge/Icon neben Titel (gleiches Muster wie `internal`/`instagram`-Tooltip-Icons, z. B. `Badge variant="secondary"` mit Text „Entwurf").
- [ ] Post-Listen-Query (dort, wo `AdminNewsView` mit Daten befüllt wird — Server Component/Page, nicht Teil der bisherigen Exploration, vor Umsetzung lokalisieren) um `status`-Feld erweitern.
- [ ] Tests (`post-form.test.tsx`, `actions.test.ts`) um Fälle ergänzen: Entwurf speichern setzt `status: DRAFT` und **keinen** `instagramStatus`; „Entwurf kopieren" ruft `createPost` statt `updatePost`; Veröffentlichen eines vormaligen Entwurfs setzt `instagramStatus` korrekt.

## Phase 2 — Prisma-Schema Newsletter

Datei: `prisma/schema.prisma`

- [ ] Enum `NewsletterCategory` { TERMINE, NEWS, TURNIERE, BERICHTE } (Konvention wie `PostType`, `FleaMarketItemStatus`)
- [ ] Enum `NewsletterSubscriberStatus` { PENDING, CONFIRMED } (Konvention wie `InstagramStatus`)
- [ ] Model `NewsletterSubscriber`:
  - `id`, `email` (unique), `meepleId` (nullable, unique FK → `Meeple`, `onDelete: SetNull` — Austritt darf Subscriber-Historie nicht hart löschen)
  - `categories NewsletterCategory[]` (Postgres-natives Array, kein separates Join-Model nötig — eine Zeile pro Abonnent reicht)
  - `status NewsletterSubscriberStatus @default(PENDING)`
  - `manageToken String @unique` (ein Token für Bestätigungs- **und** Verwaltungs-/Abmelde-Link — kein zweites Token-Feld)
  - `confirmationSentAt DateTime?` (Basis für Cooldown gegen Mail-Bombing)
  - `confirmedAt DateTime?`
  - `createdAt`, `updatedAt` (Standard-Konvention)
  - `@@map("newsletter_subscribers")`
- [ ] `Post` erweitern (mirror des bestehenden `instagram*`-Feldpaars, `actions.ts:100-113`):
  - `sendAsNewsletter Boolean @default(false)`
  - `newsletterCategory NewsletterCategory?`
  - Eigenes Enum `NewsletterDispatchStatus` { PENDING, QUEUED, SENT, FAILED }, Feld `newsletterStatus NewsletterDispatchStatus?`
  - `newsletterAttempts Int @default(0)`, `newsletterLastError String?`, `newsletterSentAt DateTime?`
- [ ] Model `NewsletterDispatchJob` (Queue-Tabelle, ein Eintrag pro Post×Subscriber, Schema vor Migration mit `src/lib/instagram/queue.ts` abgleichen):
  - `id`, `postId` (FK → `Post`), `subscriberId` (FK → `NewsletterSubscriber`), `status`, `attempts`, `lastError?`, `sentAt?`, `createdAt`
  - `@@unique([postId, subscriberId])`
- [ ] Migration erzeugen (`pnpm prisma migrate dev`), Seed-Script **nicht** automatisch Subscriber anlegen — Newsletter ist Opt-in, kein Demo-Datenbedarf.

## Phase 3 — Domain-Layer `src/lib/newsletter/`

- [ ] `mailer.ts` — dünner Brevo-Client-Wrapper: `sendTransactionalEmail({ to, subject, html })`, liest `BREVO_API_KEY` aus `process.env`, klarer Fehler bei fehlendem Key statt stillem Fail.
- [ ] `subscribers.ts` — Domain-Logik:
  - `createPublicSubscription({ email, categories, honeypot })` — verwirft still bei gefülltem Honeypot (kein Fehler an Bot ausgeben), prüft Cooldown (`confirmationSentAt` jünger als z. B. 15 Min → kein erneuter Versand), legt/aktualisiert `PENDING`-Subscriber an, versendet Bestätigungs-Mail mit `manageToken`-Link.
  - `confirmSubscription(token)` — `PENDING` → `CONFIRMED`, setzt `confirmedAt`.
  - `updateSubscriptionCategories(token, categories)` — für die Verwaltungsseite.
  - `unsubscribeAll(token)` — hartes Löschen der Subscriber-Zeile (DSGVO: keine Rechtsgrundlage zur Aufbewahrung nach Widerruf).
  - `setMeepleNewsletterPreference(meepleId, { enabled, categories })` — für Profil-Toggle, kein Double-Opt-In, Status direkt `CONFIRMED`.
- [ ] `dispatch.ts`:
  - `queueNewsletterForPost(postId)` — erzeugt `NewsletterDispatchJob`-Zeilen für alle `CONFIRMED`-Subscriber der passenden Kategorie, setzt `Post.newsletterStatus = QUEUED`. Wird **nur** bei `status === "PUBLISHED"` aufgerufen (siehe Phase 1/6).
  - `processNewsletterQueue(limit)` — vom Cron gerufen, sendet bis `limit` offene Jobs (Brevo-Tageslimit respektieren), pro Job individueller Versand (kein BCC/Massen-Merge, da jeder Link den `manageToken` des jeweiligen Empfängers enthalten muss), aktualisiert Job- und aggregierten Post-Status.
- [ ] Kein separates Rate-Limit-Utility in `lib/utils/` — Cooldown-Logik bleibt in `subscribers.ts`, da einziger Anwendungsfall (DRY: erst ab zweiter Kopie extrahieren).

## Phase 4 — Public-UI (`src/components/feature/newsletter/`, Routen unter `src/app/newsletter/`)

- [ ] Anmeldeformular (z. B. Footer-Widget + eigene Seite `/newsletter`): Kategorie-Checkboxen, verstecktes Honeypot-Feld (off-screen positioniert statt `display:none`, damit simple Bot-Heuristiken es nicht überspringen), Submit über `useAction`.
- [ ] `/newsletter/confirm` — Bestätigungsseite, ruft `confirmSubscription(token)` beim Laden.
- [ ] `/newsletter/manage` — Kategorien anpassen + „Newsletter komplett abbestellen"-Button (`ActionButton` mit `confirm`), Token per Query-Param.
- [ ] Jede versendete Mail (`dispatch.ts` / Mail-Templates) enthält den Link zu `/newsletter/manage?token=...` — deckt „Abo anpassen" und „komplett entfernen" in einem Link ab.

## Phase 5 — Meeple-Profil-Integration

Dateien: `src/app/profil/page.tsx`, `src/components/feature/profil/actions.ts`

- [ ] Neue Server Action `updateNewsletterPreference` (oder Erweiterung von `updateOwnProfile`) → ruft `setMeepleNewsletterPreference`.
- [ ] UI-Toggle „Newsletter aktivieren" **default aus** + Kategorie-Checkboxen (nur sichtbar/aktiv, wenn Toggle an), `requireMeeple()`-Guard wie bei bestehenden Profil-Actions.

## Phase 6 — Post-Erstellung-Integration (Newsletter-Checkbox)

Dateien: `post-form.tsx`, `actions.ts`, `PostInput`-Typ

- [ ] `PostInput` um `sendAsNewsletter: boolean` + `newsletterCategory: NewsletterCategory | null` erweitern.
- [ ] `PostForm`: Checkbox „Als Newsletter versenden in [Kategorie]" — Kategorie-Select vorbelegt mit Default-Mapping aus `PostType` (z. B. TERMIN→TERMINE, TURNIER→TURNIERE, BLOG→NEWS, Mapping-Tabelle im Code dokumentieren), Select bleibt überschreibbar. Checkbox bleibt bedienbar unabhängig vom Entwurf/Veröffentlichen-Status — die **Auslösung** des Versands hängt an `status === "PUBLISHED"`, nicht an der Checkbox allein.
- [ ] `createPost`/`updatePost`: wenn `sendAsNewsletter && status === "PUBLISHED"` → nach erfolgreichem Speichern `queueNewsletterForPost(post.id)` aufrufen. Wird ein Entwurf mit gesetzter Checkbox später veröffentlicht (Status-Wechsel DRAFT→PUBLISHED bei `updatePost`), löst das denselben Aufruf aus.

## Phase 7 — Versand-Trigger (Cron)

Datei: `src/app/api/cron/instagram-queue/route.ts`

- [ ] Route um `processNewsletterQueue()`-Aufruf erweitern (gleicher `GET`-Handler, gleiche `CRON_SECRET`-Prüfung per `timingSafeEqual`) — **keine** zweite Cron-Route, da Vercel Hobby nur einen Slot erlaubt.
- [ ] Erwägen, die Route dabei sprechender umzubenennen (z. B. `daily-tasks`) — falls das andere Dokus/Tests referenziert, Umbenennung separat abstimmen statt stillschweigend mitzuziehen.

## Phase 8 — Tests

- [ ] `src/lib/newsletter/subscribers.test.ts` — gemockter `prisma`, deckt Honeypot-Verwerfung, Cooldown-Verweigerung, Confirm-Flow, Meeple-Preference-Flow ab. Muss ohne `BREVO_API_KEY` grün sein (Mailer wird gemockt).
- [ ] `src/lib/newsletter/dispatch.test.ts` — Queue-Erzeugung (nur bei `PUBLISHED`), Tageslimit-Respektierung, Status-Übergänge, gemockter Mailer.
- [ ] `src/lib/newsletter/mailer.live.test.ts` — echter Aufruf gegen Brevo mit `process.env.BREVO_API_KEY`. Schlägt ohne echten Key erwartungsgemäß fehl; läuft nicht in `pnpm run test`/CI, nur via `pnpm run test:live`.
- [ ] `.env.local` (nur lokal, nicht committen) und ggf. `.env.example`/Doku um `BREVO_API_KEY=` ergänzen.

## Phase 9 — Doku-Nachzug

- [ ] `docs/kostenanalyse.md:22-36` — „Resend" durch „Brevo" ersetzen, Zahlen anpassen (300/Tag statt 3.000/Monat), Absatz zur `NewsletterSubscriber`-Tabelle bleibt gültig.
- [ ] `docs/project-structure.md` — neue Domain `lib/newsletter/` sowie das neue `PostStatus`-Feld eintragen (Pflicht laut `CLAUDE.md`, sonst driftet die Doku).
- [ ] `CONTEXT.md` — falls dort fachliche Features aufgelistet werden, Newsletter + Entwurfslogik ergänzen.

---

## Reihenfolge / Abhängigkeiten

**Phase 1 (Post-Entwurfslogik) läuft komplett vor der Newsletter-Arbeit**, da Phase 6 und Phase 3 (`queueNewsletterForPost`-Gate) auf `Post.status` aufbauen. Danach: Phase 2 → 3 sind harte Voraussetzung für Phase 4–7. Phase 4, 5, 6 können parallel/in beliebiger Reihenfolge nach Phase 3 umgesetzt werden. Phase 7 setzt Phase 3 (`dispatch.ts`) voraus. Phase 8 begleitet jede Phase (nicht erst am Ende). Phase 9 am Schluss.
