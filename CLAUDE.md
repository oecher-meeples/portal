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

| Baustein                                                                                  | Statt                                                           |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `useAction()` (`ui/use-action.ts`)                                                        | eigenem `isSubmitting`/`setError`/`router.refresh()`            |
| `<ActionButton action={fn.bind(null, id)}>`                                               | eigenem `Delete…Button`-Wrapper                                 |
| `<ActionDialog>`                                                                          | eigenem Dialog-Skelett mit open-State und Error-Slot            |
| `<TextField>` / `<TextAreaField>` / `<Field>`                                             | `<div className="flex flex-col gap-1.5"><Label/><Input/></div>` |
| `<CodeScanner onDetected={…}>`                                                            | eigener Kamera-/Scanner-Logik                                   |
| `formatDateTime/​Medium/​Plain/​TimeRange` (`lib/utils/format.ts`)                        | eigener `new Intl.DateTimeFormat(…)`                            |
| `findUpcomingEvents()` / `resolveSelectedEventId()` (`lib/events/upcoming.ts`)            | eigener „kommende Events"-Query                                 |
| `<GameZustandPill>`, `<LfgStatusPill>`, `<MembershipStatePill>`, `<FleaMarketStatusPill>` | eigener Label-/Tone-Map                                         |
| `useBlobUpload(pathPrefix, getToken)` (`lib/utils/use-blob-upload.ts`)                    | eigenem `@vercel/blob/client`-Upload-State pro Formular         |
| `getContactLinks(meeple)` (`lib/members/contact.ts`)                                      | eigenem Mail-/Telegram-Link-Aufbau                              |

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

**Coverage-Scope (`vitest.config.ts`):** nur `src/lib/**` und `src/components/**/actions.ts` — die Geschäftsregeln und Server Actions. UI-Komponenten und Routen sind bewusst ausgenommen, das ist eine Scope-Entscheidung, keine Lücke. Schwellenwert 80 % (Statements/Branches/Functions/Lines), abgeleitet aus der gemessenen Baseline (siehe Issue #38), nicht geraten.

Wenn du die Struktur änderst (Schicht, Ordner, geteilter Baustein), **docs/project-structure.md mit anpassen** — sonst driftet die Doku.

## Branch-Schutz

`develop` ist per Ruleset geschützt (`.github/ruleset-protect-develop.json`, aktiv seit #36). Direkte Pushes sind blockiert. Verbindlicher Workflow: **Feature-Branch → PR → grüne CI (`verify`-Check) → Merge.** Self-Merge ist erlaubt (`required_approving_review_count: 0`, Ein-Personen-Projekt-Entscheidung). Der `release`-Branch ist bewusst ungeschützt.

## Lizenz-Audit

`pnpm run licenses` (= `pnpm licenses list --prod`) für den Production-Dependency-Baum. **`license-checker` ist bei pnpm unbrauchbar** — es erfasst nur einen Bruchteil der tatsächlichen Pakete (im Audit vom 2026-08-03: 21 von 734) und übersieht dabei die kritischen Funde (AGPL-Pakete). Immer `pnpm licenses`, nie `license-checker`, in diesem Repo.
