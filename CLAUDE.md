# Arbeitsregeln für dieses Repo

Vollständige Begründung und Ordnerübersicht: [docs/project-structure.md](docs/project-structure.md).
Fachlicher Kontext: [CONTEXT.md](CONTEXT.md).

## Schichten & Import-Richtung (hart erzwungen)

```
src/lib/<domäne>/     ← DDD-Domain-Layer: Geschäftsregeln, Prisma, Server Actions
src/components/
  ui/ → entities/ → widgets/ → feature/ → layout/
```

Eine Schicht importiert **nur aus Schichten links von sich**. Zusätzlich:

- `src/lib/**` importiert **nie** aus `src/components/**`.
- `src/components/ui/**` ist fachlich blind — nur `src/lib/utils/`, nie `src/lib/<domäne>/`.
- Kein `feature/<a>/` importiert aus `feature/<b>/`.

`import/no-restricted-paths` in [eslint.config.mjs](eslint.config.mjs) bricht sonst den Build. **Die Regel nicht aufweichen, um einen Import durchzubekommen** — stattdessen den geteilten Code in die richtige Schicht verschieben:

| Was ist es?                                      | Wohin                  |
| ------------------------------------------------ | ---------------------- |
| Fachfrei, kein Datenmodell                       | `components/ui/`       |
| Zeigt ein Fachobjekt an, keine Mutation          | `components/entities/` |
| Ganzer Use Case, von mehreren Features gebraucht | `components/widgets/`  |
| Geschäftsregel, Query, Format, Label eines Enums | `src/lib/<domäne>/`    |

## Wo Vokabular leicht verwechselt wird

- **„Domain"** heißt hier DDD-Domain-Layer = `src/lib/<domäne>/`. **Nicht** `components/`.
- `components/entities/` ist die _Anzeige_-Schicht für Fachobjekte (Begriff aus Feature-Sliced Design). Früher hieß der Ordner `components/domain/` — das war irreführend und ist bewusst umbenannt.
- Deutsche **Labels** für Enums (`SHIFT_TYPE_LABELS`, …) gehören nach `src/lib/` (Fachvokabular). Wie ein Zustand **aussieht** (Farbe/Tone) gehört nach `components/entities/`.

## Vor dem Wiedererfinden: diese Bausteine existieren

Bevor du pending/error-State, einen Dialog oder eine Label-Zeile neu schreibst — das gibt es schon:

| Baustein                                                                                                                                                                                                                             | Statt                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `useAction()` (`ui/use-action.ts`)                                                                                                                                                                                                   | eigenem `isSubmitting`/`setError`/`router.refresh()`                                                                                  |
| `<ActionButton action={fn.bind(null, id)}>`                                                                                                                                                                                          | eigenem `Delete…Button`-Wrapper                                                                                                       |
| `<ActionDialog>` (+ `<ActionDialogOpenOverride>`, um einen als Slot übergebenen Dialog aus einem Menü zu öffnen)                                                                                                                     | eigenem Dialog-Skelett mit open-State und Error-Slot                                                                                  |
| `<TextField>` / `<TextAreaField>` / `<Field>`                                                                                                                                                                                        | `<div className="flex flex-col gap-1.5"><Label/><Input/></div>`                                                                       |
| `useIsMobile()` / `useMediaQuery(query)` (`ui/use-media-query.ts`)                                                                                                                                                                   | eigenem `window.matchMedia`-Listener oder doppelt gerenderter Mobile-/Desktop-Variante                                                |
| `useFocusMode()` (`ui/use-focus-mode.ts`) + Tailwind-Variante `focus-mode:`                                                                                                                                                          | Import aus `layout/` in `feature/`, um Header/Bottom-Nav für eine Seite auszublenden (#587)                                           |
| `<CodeScanner onDetected={…}>`                                                                                                                                                                                                       | eigener Kamera-/Scanner-Logik                                                                                                         |
| `<CopyButton value label icon>` (`ui/copy-button.tsx`)                                                                                                                                                                               | eigenem `navigator.clipboard.writeText`-Aufruf pro Feature                                                                            |
| `<Card>` + `CardHeader`/`CardTitle`/`CardAction` (`ui/card.tsx`), `cardVariants()` für Nicht-`div`-Hüllen                                                                                                                            | `bg-card rounded-lg border p-5` + `<h2 className="font-serif text-lg …">` von Hand                                                    |
| `<PageTitle size>` (`ui/page-title.tsx`), `<StatValue>` (`ui/stat-tile.tsx`)                                                                                                                                                         | `<h1 className="font-serif text-3xl …">` bzw. `text-3xl`-Kennzahl ohne Mobile-Grenze (#581)                                           |
| `<NativeSelect>` (`ui/native-select.tsx`)                                                                                                                                                                                            | `<select className="border-input bg-background h-8 …">` pro Feature                                                                   |
| `<PasswordField id label>` / `<PasswordInput>` (`ui/password-input.tsx`, #633)                                                                                                                                                       | `<Input type="password">` ohne Augen-Button (Tap = dauerhaft, Longpress = solange gedrückt)                                           |
| `<IdCombobox options={[{ id, label }]}>` (`ui/id-combobox.tsx`)                                                                                                                                                                      | eigener Combobox-Verdrahtung oder `<select>` mit allen Einträgen                                                                      |
| `<HoldingTargetPicker targets onPick>` (`widgets/game-holding/holding-target-picker.tsx`)                                                                                                                                            | eigener „Ziel wählen oder scannen"-Kombination für Person/Einheit                                                                     |
| `<HistoryList items renderItem hint>` (`ui/history-list.tsx`), `<ColumnChart items caption>` (`ui/column-chart.tsx`), `<BarRow>` (`ui/bar-row.tsx`)                                                                                  | eigenem „5 zeigen + Alle anzeigen"-State bzw. einer Chart-Library für einfache Diagramme                                              |
| `formatDateTime/​Medium/​Plain/​TimeRange` (`lib/utils/format.ts`)                                                                                                                                                                   | eigener `new Intl.DateTimeFormat(…)`                                                                                                  |
| `findUpcomingEvents()` / `resolveSelectedEventId()` (`lib/events/upcoming.ts`)                                                                                                                                                       | eigener „kommende Events"-Query                                                                                                       |
| `<GameZustandPill>`, `<LfgStatusPill>`, `<MembershipStatePill>`, `<FleaMarketStatusPill>`                                                                                                                                            | eigener Label-/Tone-Map                                                                                                               |
| `useBlobUpload(pathPrefix, getToken)` (`lib/utils/use-blob-upload.ts`)                                                                                                                                                               | eigenem S3-Presigned-POST-Upload-State pro Formular                                                                                   |
| `getContactLinks(meeple)` (`lib/members/contact.ts`)                                                                                                                                                                                 | eigenem Mail-/Telegram-Link-Aufbau                                                                                                    |
| `requireEnv(name)` (`lib/utils/require-env.ts`)                                                                                                                                                                                      | `process.env.X!` mit unklarer Fehlermeldung bei fehlendem Wert                                                                        |
| `deleteBlobs(urls)` (`lib/utils/blob-delete.ts`)                                                                                                                                                                                     | eigenem S3-`DeleteObjects`-Aufruf pro Feature                                                                                         |
| `createBlobUploadToken({ pathname, contentType, … })` (`lib/utils/blob-upload-token.ts`)                                                                                                                                             | eigenem `createPresignedPost` im `get…UploadToken`-Server-Action                                                                      |
| `putBlob(pathname, body, contentType)` (`lib/utils/s3.ts`, liefert den Key)                                                                                                                                                          | eigenem `PutObjectCommand` für serverseitige Uploads                                                                                  |
| `toStoredBlobRef(url, prefix)` / `signedBlobUrl(key)` (`lib/utils/blob-access.ts`, #112)                                                                                                                                             | Upload-URL ungeprüft speichern bzw. private Dateien per dauerhafter URL ausliefern                                                    |
| `toResult(run)` / `actionErrorMessage(error)` (`lib/utils/action-result.ts`)                                                                                                                                                         | eigenem `catch (e) { return { error: (e as Error).message } }`                                                                        |
| `requireActionPermission(key)` u. a. (`lib/auth/action-guards.ts`, prüft Mitgliedsstatus)                                                                                                                                            | `requirePermission`/`hasPermission` als Action-Guard                                                                                  |
| `revalidateMemberProfile({ memberId } \| { meepleId })` (`lib/members/revalidate-profile.ts`)                                                                                                                                        | Slug laden + `revalidatePath('/profil/…')` pro Action                                                                                 |
| `walkUnitChain` / `unitChainLabel` / `findUnitAncestor` (`lib/ludothek/unit-chain.ts`)                                                                                                                                               | eigener `parentUnitId`-Aufstieg mit Tiefenlimit                                                                                       |
| `CONTENT_TYPE_LABELS` (`lib/content/content-types.ts`), `BOARD_GAME_KIND_LABELS` (`lib/ludothek/board-game-kind.ts`), `TAG_TYPE_PLURAL_LABELS` (`taxonomy/tags-read.ts`)                                                             | lokale Label-Maps in Komponenten                                                                                                      |
| `escapeHtml` (`lib/utils/escape-html.ts`), `siteUrl()` (`lib/utils/site-url.ts`), `requireCronAuth(request)` (`lib/utils/cron-auth.ts`)                                                                                              | eigenem Escape, `process.env.PUBLIC_SITE_URL ?? ""`, `CRON_SECRET`-Prüfung                                                            |
| `buildShortIdUrl` / `parseShortId` / `resolveShortId` (`lib/short-id/`)                                                                                                                                                              | eigenem QR-URL-Aufbau oder Code-/Slug-Parsing                                                                                         |
| `parseEuroToCents` / `formatValueCents` / `parseAcquiredOn` (`lib/ludothek/game-copy-acquisition.ts`)                                                                                                                                | eigenem Euro-/Datums-Parsing für Exemplar-Wert und „Erhalten am“ (#615)                                                               |
| `eanWhere(ean)` / `assertEansAvailable` / `replaceBoardGameEans` (`lib/ludothek/board-game-eans.ts`, #668); EAN-Quellen nur über `searchEanForBoardGame()` (Spielemeta → UPCitemdb); `findFreeEans()` für unbeaufsichtigte Übernahme | `BoardGame.ean`-Zugriff (existiert nicht mehr), eigenem EAN-Duplikat-Check, direktem Aufruf von `searchEanByName`/`searchGamesByName` |
| `memberFullName(member)` (`lib/members/member-display-name.ts`)                                                                                                                                                                      | `[firstName, lastName].filter(Boolean).join(" ")`                                                                                     |
| `revealMemberIban` / `revealPendingMemberIban` (`lib/members/iban-reveal-actions.ts`)                                                                                                                                                | eigener IBAN-Reveal-Wrapper pro Feature                                                                                               |

Server Actions an Client-Komponenten aus einer Server-Komponente heraus: `action={deletePost.bind(null, id)}` — eine normale Closure ist nicht serialisierbar.

## Dateigrößen

- **Max. 400 Zeilen** pro Datei (ESLint `max-lines`, Blank Lines und Kommentare zählen nicht). Wird es mehr: entlang der Fachlichkeit teilen, nicht mechanisch abschneiden. Vorbild: `lib/ludothek/holdings.ts` (Schreibseite) + `holdings-lookup.ts` (Leseseite).
- **Unter 100 Zeilen nur, wenn die Datei mehrfach importiert wird.** Einmalig genutzte Kleinkomponenten gehören in ihren Aufrufer. Nicht automatisiert geprüft — im Review mitdenken.
  Legitime Ausnahmen: Route-Einstiege (`feature/*/*-view.tsx`, je einmal von `app/*/page.tsx`), technisch nötige `"use client"`-Grenzen (z. B. `theme-provider.tsx`), `layout/*`-Rahmenbausteine, `ui/`-Primitives.

## DRY

Ab der **zweiten** Kopie extrahieren, nicht auf Vorrat abstrahieren. `pnpm run dup` (jscpd) zeigt Duplikate; Zielzustand ist 0 Klone.

## Vor dem Push

`pnpm run verify` (= format:check + typecheck + lint + test) — läuft auch als `pre-push`-Hook und in der CI. `next build` und Test-Coverage laufen bewusst nur in der CI, nicht im Hook.
`pnpm run test` schließt `*.live.test.ts` aus (echte Fremd-APIs); die laufen nur via `pnpm run test:live`.

**Coverage-Scope (`vitest.config.ts`):** nur `src/lib/**` und `src/components/**/*actions.ts` — die Geschäftsregeln und Server Actions. UI-Komponenten und Routen sind bewusst ausgenommen, das ist eine Scope-Entscheidung, keine Lücke. Schwellenwert 80 % (Statements/Branches/Functions/Lines), abgeleitet aus der gemessenen Baseline (siehe Issue #38; mit dem erweiterten Glob aus #523: 90,0 / 86,6 / 91,3 / 91,0 %), nicht geraten.

Wenn du die Struktur änderst (Schicht, Ordner, geteilter Baustein), **docs/project-structure.md mit anpassen** — sonst driftet die Doku.

## Branch-Schutz

`develop` ist per Ruleset geschützt (`.github/ruleset-protect-develop.json`, aktiv seit #36). Direkte Pushes sind blockiert. Verbindlicher Workflow: **Feature-Branch → PR → grüne CI (`verify`-Check) → Merge.** Self-Merge ist erlaubt (`required_approving_review_count: 0`, Ein-Personen-Projekt-Entscheidung). Der `release`-Branch ist bewusst ungeschützt.

## Lizenz-Audit

`pnpm run licenses` (= `pnpm licenses list --prod`) für den Production-Dependency-Baum. **`license-checker` ist bei pnpm unbrauchbar** — es erfasst nur einen Bruchteil der tatsächlichen Pakete (im Audit vom 2026-08-03: 21 von 734) und übersieht dabei die kritischen Funde (AGPL-Pakete). Immer `pnpm licenses`, nie `license-checker`, in diesem Repo.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
