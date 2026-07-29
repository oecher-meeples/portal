# Ausführungsplan: Component-Architektur-Refactor (ui / domain / feature / layout)

- **Erstellt:** 2026-07-28
- **Ziel:** `src/components/` in `ui/`, `domain/`, `feature/`, `layout/` gliedern. Seiten (`src/app/**/page.tsx`) werden auf schmale Wrapper reduziert (Route-Parsing, Auth-Guards, Datenfetching, Delegation), die eigentliche Darstellung wandert in `feature/`-Komponenten.
- **Kein Verhaltens-Refactor:** Es wird nur Code verschoben/umbenannt und Imports angepasst. Keine neue Logik, keine Design-Änderungen, keine neuen Features.

## Zielstruktur

```
src/components/
  ui/       – generische, domänenlose Design-System-Bausteine (Atome/Molekülen)
  domain/   – wiederverwendbare Darstellungskomponenten mit Domänenwissen (Post/Content, Game)
  feature/  – Composed, feature-/route-spezifische Komponenten (bisher lose in src/app/** verteilt oder inline in page.tsx)
  layout/   – App-Chrome (Header, Sidebar, AppShell, ThemeProvider, …)
```

**Abgrenzung ui vs. domain:** `ui/` kennt keine Fachbegriffe (Button, Input, PageHeading, PillToggle, StatusPill – nimmt nur `label`/`tone` generisch entgegen). `domain/` kennt Fachbegriffe (ContentCard weiß, was ein "Post" ist; GameCard weiß, was ein "Spiel" ist).

**Abgrenzung domain vs. feature:** `domain/`-Komponenten sind reine Darstellung, wiederverwendbar über mehrere Features hinweg (z. B. `ContentCard` erscheint auf der Startseite UND auf `/news`). `feature/`-Komponenten gehören zu genau einer Seite/einem Formular/einem Workflow (z. B. `NewsCalendar`, `PostForm`, `InviteForm`) und dürfen Server Actions, `useState`, Datenfetching-Aufrufe etc. enthalten.

## Vorbestehender Working-Tree-Zustand

Wie in den vorherigen Plänen dieser Session: `src/components/ui/button.tsx` ist fremd verändert (nicht von mir) und wird **nicht** angefasst oder committet. `.devcontainer/` ebenfalls ignorieren.

## Regeln für die Ausführung

- Reines Verschieben + Umbenennen + Import-Pfad-Anpassung. Keine Logikänderung an den verschobenen Komponenten (Ausnahme: Props-Schnitt bei der Extraktion aus `page.tsx`, siehe Phase 5 – dort wird zwangsläufig Code aus der Seite in eine neue Komponente verschoben, aber 1:1, ohne Verhaltensänderung).
- Dateibenennung bleibt kebab-case (bestehende Konvention), Exporte bleiben PascalCase.
- Jede Phase = ein Commit, erst committen wenn `pnpm test` und `pnpm build` grün sind.
- Nach jeder Phase: `grep` auf alte Importpfade, um sicherzustellen, dass keine toten Imports übrig bleiben.
- Server-Component-Seiten bleiben Server Components; Client-Component-Feature-Teile bleiben `"use client"`. Bei Extraktion aus `page.tsx` (Phase 5) entscheidet der Inhalt: enthält der bisherige Inline-JSX-Block Interaktivität (`useState`, `onClick` mit Client-Logik) → neue Komponente wird `"use client"`; ansonsten bleibt sie Server Component (kann dann sogar direkt `async` sein und selbst fetchen – siehe Einzelfall je Seite unten).

## Phase 1 — `ui/`: generische Bausteine zusammenführen

Verschieben (kein Verhaltensunterschied, nur Pfad):

| Von | Nach |
|---|---|
| `src/components/shared/page-heading.tsx` | `src/components/ui/page-heading.tsx` |
| `src/components/shared/pill-toggle.tsx` | `src/components/ui/pill-toggle.tsx` |
| `src/components/shared/placeholder-media.tsx` | `src/components/ui/placeholder-media.tsx` |
| `src/components/shared/stat-tile.tsx` | `src/components/ui/stat-tile.tsx` |
| `src/components/shared/status-pill.tsx` | `src/components/ui/status-pill.tsx` |

`src/components/shared/` danach löschen (leer). Alle Importe `@/components/shared/*` → `@/components/ui/*` repo-weit anpassen (u. a. betroffen: praktisch jede Seite, da `PageHeading` überall verwendet wird).

_DoD:_ `grep -r "components/shared" src` liefert keine Treffer. `pnpm test && pnpm build` grün.
`git commit -m "refactor: consolidate generic shared components into components/ui"`

## Phase 2 — `domain/`: Fachwissen-Komponenten

Verschieben:

| Von | Nach |
|---|---|
| `src/components/content/content-card.tsx` | `src/components/domain/content-card.tsx` |
| `src/components/content/content-list-row.tsx` | `src/components/domain/content-list-row.tsx` |
| `src/components/content/content-type-badge.tsx` | `src/components/domain/content-type-badge.tsx` |
| `src/components/content/game-card.tsx` | `src/components/domain/game-card.tsx` |

`src/components/content/` danach löschen. Importe `@/components/content/*` → `@/components/domain/*` anpassen (Aufrufer: `src/app/page.tsx`, `src/app/news/*`, `src/app/ludothek/*`).

_DoD:_ `grep -r "components/content" src` leer. Tests/Build grün.
`git commit -m "refactor: move content/game display components into components/domain"`

## Phase 3 — `layout/`: ThemeProvider einsortieren

`src/components/theme-provider.tsx` → `src/components/layout/theme-provider.tsx` (einziger Ausreißer, der noch direkt unter `components/` liegt). Import in `src/app/layout.tsx` anpassen. Rest von `layout/` (app-shell, header, sidebar, user-menu, theme-toggle, logo, brand-watermark) bleibt unverändert am Platz.

_DoD:_ Tests/Build grün.
`git commit -m "refactor: move theme-provider into components/layout"`

## Phase 4 — `feature/`: bereits extrahierte Feature-Komponenten umziehen

Diese Komponenten sind schon von ihrer Seite getrennt (eigene Datei), liegen aber noch neben der `page.tsx` in `src/app/**`. Reines Verschieben nach `src/components/feature/<feature>/`, Importe in der jeweiligen `page.tsx` anpassen:

| Feature | Von | Nach |
|---|---|---|
| news | `src/app/news/news-browser.tsx` | `src/components/feature/news/news-browser.tsx` |
| news | `src/app/news/news-filter.tsx` | `src/components/feature/news/news-filter.tsx` |
| news | `src/app/news/news-calendar.tsx` | `src/components/feature/news/news-calendar.tsx` |
| markt | `src/app/markt/markt-browser.tsx` | `src/components/feature/markt/markt-browser.tsx` |
| ludothek | `src/app/ludothek/ludothek-browser.tsx` | `src/components/feature/ludothek/ludothek-browser.tsx` |
| lfg | `src/app/lfg/lfg-list.tsx` | `src/components/feature/lfg/lfg-list.tsx` |
| lfg | `src/app/lfg/create-lfg-dialog.tsx` | `src/components/feature/lfg/create-lfg-dialog.tsx` |
| scan | `src/app/scan/scan-mode-switcher.tsx` | `src/components/feature/scan/scan-mode-switcher.tsx` |
| spenden | `src/app/spenden/donation-amount-picker.tsx` | `src/components/feature/spenden/donation-amount-picker.tsx` |
| admin-invites | `src/app/admin/invites/invite-form.tsx` | `src/components/feature/admin-invites/invite-form.tsx` |
| admin-invites | `src/app/admin/invites/actions.ts` | `src/components/feature/admin-invites/actions.ts` |
| admin-news | `src/app/admin/news/post-form.tsx` | `src/components/feature/admin-news/post-form.tsx` |
| admin-news | `src/app/admin/news/delete-post-button.tsx` | `src/components/feature/admin-news/delete-post-button.tsx` |
| admin-news | `src/app/admin/news/actions.ts` (+ `actions.test.ts`) | `src/components/feature/admin-news/actions.ts` (+ Test) |
| registrieren | `src/app/registrieren/register-form.tsx` | `src/components/feature/registrieren/register-form.tsx` |
| registrieren | `src/app/registrieren/actions.ts` | `src/components/feature/registrieren/actions.ts` |

Hinweis: `actions.ts`-Dateien mit `"use server"` funktionieren unabhängig vom Speicherort – Import in `page.tsx`/den Feature-Komponenten anpassen, `actions.test.ts` bleibt mit seiner Quelle im selben Ordner.

_DoD:_ `grep -rE "@/app/(news|markt|ludothek|lfg|scan|spenden|admin/invites|admin/news|registrieren)/(news-|markt-|ludothek-|lfg-|create-lfg|scan-mode|donation-|invite-form|post-form|delete-post-button|register-form|actions)" src` leer (alle Konsumenten zeigen jetzt auf `@/components/feature/...`). Tests/Build grün.
`git commit -m "refactor: move already-extracted feature components into components/feature"`

## Phase 5 — `feature/`: Inline-Seiteninhalt extrahieren

Das ist der eigentliche Kern der Aufgabe: Seiten, die ihr Markup noch direkt in `page.tsx` haben, werden aufgeteilt in (a) die Seite (Params/SearchParams, `requireMember()`/`requireAdmin()`/`requirePermission()`, Datenfetching, `notFound()`) und (b) eine neue Feature-Komponente in `src/components/feature/<feature>/`, die die bisherige JSX 1:1 übernimmt und die gefetchten Daten als Props bekommt.

| Seite | Neue Komponente | Typ | Anmerkung |
|---|---|---|---|
| `src/app/page.tsx` | `feature/home/home-view.tsx` (`HomeView`) | Server | Echte Daten. Props: `events`, `posts` |
| `src/app/login/page.tsx` | `feature/login/login-form.tsx` (`LoginForm`) | Client | Formular + State bereits isoliert genug, nur verschieben in eigene Datei statt inline in `page.tsx` |
| `src/app/403/page.tsx` | `feature/403/forbidden-view.tsx` | Server | Trivial, keine Props |
| `src/app/dashboard/page.tsx` | `feature/dashboard/dashboard-view.tsx` | Server | Gemischt: `internalNews` ist echte DB-Daten, die vier `StatTile`-Zahlen sind Platzhalter. Bekommt **keinen** `-mock-`-Suffix, da der Großteil (Newsroom) real ist – Zahlen bleiben vorerst hartkodiert in der Komponente. |
| `src/app/admin/page.tsx` | `feature/admin-dashboard/admin-dashboard-mock-view.tsx` | Server | Mock (`OVERDUE_LOANS` inline + statische `StatTile`-Zahlen) |
| `src/app/admin/bestand/page.tsx` | `feature/admin-bestand/admin-bestand-mock-view.tsx` | Server | Mock (`GAMES` aus `src/data/games`) |
| `src/app/admin/bringbuy/page.tsx` | `feature/admin-bringbuy/admin-bringbuy-mock-view.tsx` | Server | Mock (`FLEA_MARKET_ITEMS` aus `src/data/bringbuy`) |
| `src/app/admin/mitglieder/page.tsx` | `feature/admin-mitglieder/admin-mitglieder-mock-view.tsx` | Server | Mock (`MEMBERS` aus `src/data/members`) |
| `src/app/helfer/page.tsx` | `feature/helfer/helfer-mock-view.tsx` | Server | Mock (`HELFER_SHIFTS` aus `src/data/helferplan`) |
| `src/app/profil/page.tsx` | `feature/profil/profil-mock-view.tsx` | Server | Mock (komplett hartkodierter Inhalt, kein Datenmodell) |
| `src/app/scan/page.tsx` | `feature/scan/scan-mock-view.tsx` | Server | Mock (hartkodierter Scan-Zustand „OM-2026-0421"). Bindet weiterhin `ScanModeSwitcher` (Phase 4) ein |
| `src/app/spenden/page.tsx` | `feature/spenden/spenden-mock-view.tsx` | Server | Mock/Platzhalter – Spenden-Integration ist laut Phase-2-Plan explizit nicht umgesetzt (PayPal-Button ohne echte Anbindung). Bindet `DonationAmountPicker` (Phase 4) ein |
| `src/app/downloads/page.tsx` | `feature/downloads/downloads-view.tsx` | Server | Echter, dauerhafter Inhalt (Datei-/Rechtsdokument-Referenzen), kein Feature-Mockup → kein `-mock-`-Suffix |
| `src/app/rechtliches/[slug]/page.tsx` | `feature/rechtliches/legal-doc-view.tsx` | Server | Echter, dauerhafter Inhalt. Props: `doc`, `sections` |
| `src/app/markt/[id]/page.tsx` | `feature/markt/market-listing-mock-view.tsx` | Server | Mock (`MARKET_LISTINGS` aus `src/data/market`). Props: `listing` |
| `src/app/ludothek/[slug]/page.tsx` | `feature/ludothek/game-detail-mock-view.tsx` | Server | Mock (`GAMES` aus `src/data/games`). Props: `game` |
| `src/app/lfg/[id]/page.tsx` | `feature/lfg/lfg-detail-mock-view.tsx` | Server | Mock (`LFG_REQUESTS` aus `src/data/lfg`). Props: `request` |
| `src/app/news/[slug]/page.tsx` | `feature/news/post-detail-view.tsx` | Server | Echte Daten (DB via `getContentBySlug`). Props: `item` |

**Entscheidung getroffen: Variante B.** Die Seite (`page.tsx`) bleibt in jedem Fall für den Datenimport zuständig – ob aus `src/data/*` (Mock) oder aus der DB (`src/lib/content.ts`, `src/lib/calendar.ts`, Prisma) – und reicht das Ergebnis als Prop an die View-Komponente durch. Die View-Komponente selbst importiert nie `src/data/*` direkt. Damit folgen alle Seiten demselben Muster (Seite = Auth-Guard + Datenquelle + Delegation), und ein späterer Umstieg einer Mock-Seite auf echte DB-Queries ändert nur die Seite, nicht die View-Komponente.

**Namenskonvention `*-mock-view.tsx`:** Jede View-Komponente, deren Daten aktuell aus `src/data/*` oder hartkodierten Konstanten stammen (also ein noch nicht gebautes Feature simulieren), bekommt den Suffix `-mock-view.tsx` statt `-view.tsx`. Das macht auf einen Blick sichtbar, welche Seiten noch auf eine echte Backend-Anbindung warten (Bestand/Inventar, Bring & Buy, Mitgliederverwaltung, Helferplan, Profil-Self-Service, Marktplatz, LFG, Scan, Spenden, Admin-Dashboard-Kennzahlen) – analog zu den Blog-Posts, die in Phase 2 denselben Weg von Mock zu echter DB-Anbindung gegangen sind. Seiten mit echten oder dauerhaft-statischen Daten (Home, News, Dashboard-Newsroom-Teil, Downloads, Rechtliches, Login, 403) behalten den einfachen `-view.tsx`-Suffix.

Jede Zeile der Tabelle ist ihr eigener Teil-Schritt, aber aus Aufwandsgründen werden alle Extraktionen dieser Phase in **einem** Commit zusammengefasst (reines Verschieben, kein Risiko-Schnitt zwischen den Seiten).

_DoD:_ Jede der 17 Seiten in der Tabelle ist danach ≤ ~25 Zeilen (Guard + Fetch + `<XView .../>`). `pnpm test && pnpm build` grün. Stichprobe mit Playwright (wie in dieser Session etabliert): `/`, `/dashboard` (mit Admin-Session), `/admin/bestand`, `/ludothek/arche-nova`, `/news/sommerfest-der-meeples` laden fehlerfrei und sehen unverändert aus (Screenshot-Vergleich).
`git commit -m "refactor: extract inline page markup into feature view components"`

## Phase 6 — Aufräumen & Verifikation

- `src/app/**` darf danach nur noch enthalten: `page.tsx`, `layout.tsx`, `route.ts`, `actions.ts` (wo noch nicht nach Phase 4/5 verschoben – z. B. falls eine Seite Server Actions braucht, die nicht an eine Feature-Komponente gebunden sind), sowie `generateStaticParams`. Keine `.tsx`-Komponentendateien mehr direkt unter `src/app/**` außer `page.tsx`/`layout.tsx`.
- Volltext-Grep auf `@/components/shared`, `@/components/content` → muss leer sein (Ordner sind gelöscht).
- `pnpm lint` zusätzlich zu Test/Build laufen lassen (ungenutzte Importe nach den Verschiebungen).
- Kurzer manueller/Playwright-Rundgang über die App (Startseite, Login, Dashboard, ein Admin-Screen, News-Liste + Detail) zur Sicherheit.

_DoD:_ Alles grün, keine toten Importpfade, App verhält sich visuell identisch zu vorher.
`git commit -m "chore: final cleanup after component architecture refactor"` (nur falls noch Änderungen anfallen, z. B. Lint-Fixes)

## Umfang / Nicht-Ziele

- Keine Änderung an `src/lib/**`, `src/data/**`, `prisma/**`, Tests-Logik oder Styling.
- Keine Umbenennung von Props oder Verhaltensänderung an einer Komponente.
- `src/app/api/**` (Route Handler) bleibt unverändert – das ist kein „Component", sondern Next.js-Infrastruktur.

## Empfohlenes Vorgehen bei der Umsetzung

Reasoning/Thinking: niedrig bis mittel ausreichend – der Plan ist mechanisch (verschieben + Pfade anpassen), Phase 5 braucht etwas mehr Sorgfalt beim 1:1-Ausschneiden der JSX-Blöcke, aber keine architektonische Neuentscheidung mehr, da diese hier bereits getroffen wurde.
