# Coding-Richtlinien

Was hier steht, beschreibt die **im Code tatsächlich gelebte** Praxis — nicht Wunschdenken. Abweichungen sind erlaubt, wenn sie begründet sind; unbegründete Abweichungen werden im Review angesprochen.

Angrenzende Dokumente, die hier nicht wiederholt werden:

| Thema | Dokument |
| --- | --- |
| Schichten, Ordner, Import-Richtung | [project-structure.md](project-structure.md) |
| Farben, Tokens, Light/Dark | [design.md](design.md) |
| Fachliche Entscheidungen mit Begründung | [adr/](adr/) |
| Kurzfassung für KI-Agenten | [../CLAUDE.md](../CLAUDE.md) |

---

## 1. Sprache: Deutsch nach außen, Englisch nach innen

Eine Regel, die konsequent gilt und leicht falsch gemacht wird:

| Was | Sprache | Beispiel |
| --- | --- | --- |
| UI-Texte, Labels, Fehlermeldungen an Nutzer | **Deutsch** | `return { error: "Keine Berechtigung." }` |
| Domänenbegriffe (auch im Code!) | **Deutsch** | `GameZustand`, `deinventarisieren`, `Meeple`, `Einheit` |
| Bezeichner, Funktionsnamen, Typen | **Englisch** | `findUpcomingEvents`, `resolveSelectedEventId` |
| Code-Kommentare, JSDoc | **Englisch** | `/** Whoever records the transition … */` |
| Commit-Messages | **Englisch** (Conventional Commits) | `feat(admin-news): …` |

Deutsche Domänenbegriffe werden **nicht eingedeutscht-englisch gemischt**: es heißt `GameZustand`, nicht `GameState`, weil „Zustand" im Verein ein feststehender Begriff ist. Umgekehrt heißt eine generische Hilfsfunktion `formatDateTime`, nicht `formatiereDatum`.

Typografie in deutschen Texten: echte Anführungszeichen `„…“`, Gedankenstrich `—`, Auslassung `…`. Gerade `"` in JSX brechen den Lint (`react/no-unescaped-entities`).

## 2. TypeScript

- **Kein `any`.** Auch nicht via `as any`. Wenn ein Typ nicht greifbar ist: `unknown` plus Narrowing.
- **Props inline typisieren.** Die etablierte Form ist das Type-Literal direkt in der Signatur:

  ```tsx
  export function GameZustandPill({
    zustand,
    className,
  }: {
    zustand: GameZustand;
    className?: string;
  }) {
  ```

  Ein benannter Typ (`type XProps = …`) nur, wenn er **exportiert** wird, weil der Aufrufer ihn braucht — typisch für Tabellenzeilen-Typen: `export type MeepleRow = { … }`.
- **Props von Primitives durchreichen** statt neu erfinden: `React.ComponentProps<typeof Input> & { … }`, `Omit<ButtonProps, "onClick">`.
- **`as const`** bei Rückgabe-Diskriminatoren (`{ success: true as const }`) und Lookup-Objekten (`TONES = { … } as const`).
- Typen, die aus dem Schema kommen, **aus Prisma importieren** (`import type { ShiftType } from "@prisma/client"`) statt parallel zu deklarieren.

## 3. Server Actions

Jede Server Action folgt demselben Aufbau:

```ts
"use server";

export async function createShift(eventId: string, input: ShiftInput) {
  await requirePermission("events:manage");        // 1. Guard zuerst

  const validationError = validateShift(input);     // 2. Validierung
  if (validationError) return { error: validationError };

  await prisma.shift.create({ … });                 // 3. Mutation
  revalidatePath(`/admin/events/${eventId}`);       // 4. Cache invalidieren
  return { success: true as const };                // 5. Einheitliches Ergebnis
}
```

Verbindlich daran:

1. **Guard ist die erste Zeile.** `requireMeeple()` / `requirePermission(...)` / `requireGamesManage()` — nie erst nach dem Lesen von Daten. Berechtigungen werden **serverseitig** geprüft, nie nur durch Ausblenden im UI.
2. **Rückgabeformat** ist `{ error: string }` oder `{ success: true as const }` (optional mit Zusatzfeldern wie `{ success: true as const, id }`). Kein Werfen für erwartbare Fehler — das UI braucht die Nachricht. Der Typ dazu ist `ActionResult` in [`src/components/ui/use-action.ts`](../src/components/ui/use-action.ts).
3. **Fehlermeldungen sind deutsch und nutzerlesbar** („Keine Berechtigung.", nicht „FORBIDDEN").
4. **`revalidatePath`** nach Mutationen, die Server-Komponenten betreffen.
5. Actions liegen bei ihrem Anwendungsfall (`feature/<domäne>/actions.ts`) oder — wenn mehrere Features sie brauchen — im Domain-Layer (`lib/<domäne>/*-actions.ts`).

**Unerwartete** Zustandsverletzungen sind Ausnahmen, keine Rückgabewerte: dafür gibt es benannte Fehlerklassen in [`src/lib/ludothek/errors.ts`](../src/lib/ludothek/errors.ts) (`HoldingConflictError`, `GameNotFoundError`, …), jeweils mit gesetztem `this.name` und deutscher Message.

Es gibt **kein Schema-Validierungs-Framework** (kein zod). Validiert wird von Hand in kleinen, testbaren Funktionen im Domain-Layer.

## 4. React & Next.js

- **`"use client"` nur, wenn nötig** — also bei Hooks, Event-Handlern oder Browser-APIs. Server-Komponente ist der Default.
- **Server Actions aus Server-Komponenten** an Client-Komponenten immer gebunden übergeben: `action={deletePost.bind(null, id)}`. Eine gewöhnliche Closure (`() => deletePost(id)`) ist nicht serialisierbar und bricht zur Laufzeit.
- **Kein `setState` synchron im Effekt.** Stattdessen ableiten. Muster aus [`game-holding-panel.tsx`](../src/components/widgets/game-holding/game-holding-panel.tsx):

  ```tsx
  const [loaded, setLoaded] = useState<{ id: string; context: T | null } | null>(null);
  const isCurrent = loaded?.id === boardGameId;   // "loading" ist abgeleitet, nicht gesetzt
  ```

- **Formulare** nutzen kontrollierte Inputs plus `<TextField>`; ein `EMPTY_FORM`-Objekt und eine `patch(key, value)`-Hilfsfunktion halten Mehrfeld-Formulare kurz.
- **Route-Segmente** laden Daten und geben sie an genau eine View weiter (`app/**/page.tsx` → `feature/<domäne>/<domäne>-view.tsx`). Keine Prisma-Queries in Client-Komponenten.

## 5. Tailwind CSS v4

- **Nur Utility-Klassen und Design-Tokens.** Farben immer über semantische Tokens (`bg-card`, `text-muted-foreground`, `border-destructive/40`), nie Hex-Werte — siehe [design.md](design.md). Einzige Ausnahme sind die Tone-Paletten in `components/entities/*-pill.tsx`.
- **Klassen zusammenführen mit `cn()`** (`lib/utils/cn.ts`), nie per String-Konkatenation, damit Konflikte korrekt gewinnen.
- **Varianten mit `cva`**, wenn eine Komponente mehr als zwei Erscheinungsformen hat (siehe `ui/button.tsx`, `ui/badge.tsx`) — nicht per Ternär-Kette im JSX.
- **Klassenreihenfolge macht Prettier** (`prettier-plugin-tailwindcss`). Nicht von Hand sortieren.
- Dark Mode über `dark:`-Varianten, nicht über JS-Abfragen des Themes.

## 6. Tests

- **Vitest**, Testdateien **neben** ihrem Subjekt: `holdings.ts` → `holdings.test.ts`.
- Getestet wird primär der **Domain-Layer** (`src/lib/**`) und die **Server Actions** — dort sitzen die Regeln, die weh tun, wenn sie brechen.
- **Tests beschreiben Verhalten, nicht Implementierung.** Testnamen sind ganze Sätze: `it("blocks a resigned meeple from accepting a handover")`.
- Prisma und Auth werden per `vi.mock` ersetzt; keine echte Datenbank im Standardlauf.
- **Tests, die echte Fremd-APIs brauchen, heißen `*.live.test.ts`** und sind aus `npm run test` ausgeschlossen (`npm run test:live` führt sie aus). So bleibt der Standardlauf deterministisch und offline-fähig.

## 7. Kommentare

Kommentiert wird das **Warum**, nicht das Was. Gute Beispiele aus dem Bestand:

```ts
/** Ausgetretene Meeples dürfen abgeben, aber nichts mehr annehmen (siehe CONTEXT.md). */
// Chosen over the native BarcodeDetector API because it also works on iOS Safari.
// Keyed by boardGameId so "still loading" is derived, never set in an effect.
```

Also: nicht-offensichtliche Entscheidungen, Verweise auf ADRs/CONTEXT.md, und Fallstricke. Kein Kommentar, der die Signatur nachplappert. Öffentliche Bausteine in `ui/`, `entities/` und `widgets/` bekommen einen JSDoc-Einzeiler, der sagt, wofür sie da sind und wofür nicht.

## 8. DRY

Extrahiert wird **ab der zweiten Kopie** — nicht auf Vorrat für eine vermutete dritte. Wohin, entscheidet die Schicht (siehe [project-structure.md](project-structure.md)).

Bevor etwas Neues entsteht, prüfen, ob es das schon gibt: die Tabelle „Vor dem Wiedererfinden" in [../CLAUDE.md](../CLAUDE.md) listet die geteilten Bausteine (`useAction`, `ActionButton`, `ActionDialog`, `TextField`, `CodeScanner`, Datums-Formatter, Entity-Pills, `findUpcomingEvents`).

`npm run dup` (jscpd) macht Duplikate sichtbar; Zielzustand ist **0 Klone**.

## 9. Dateien

- **Dateinamen kebab-case**, auch für Komponenten: `game-holding-panel.tsx` exportiert `GameHoldingPanel`.
- **Max. 400 Zeilen** pro Datei — per ESLint (`max-lines`) erzwungen. Wird es mehr: entlang der Fachlichkeit teilen (Vorbild: `holdings.ts` Schreibseite + `holdings-lookup.ts` Leseseite), nicht mechanisch abschneiden.
- **Unter 100 Zeilen nur bei Mehrfachnutzung.** Einmalig genutzte Kleinkomponenten gehören in ihren Aufrufer. Legitime Ausnahmen: Route-Einstiege (`*-view.tsx`), technisch nötige `"use client"`-Grenzen, `layout/`-Bausteine, `ui/`-Primitives.
- **Keine Barrel-Dateien** (`index.ts`) pro Feature — importiert wird direkt aus der Datei. Einzige Ausnahme ist die Re-Export-Brücke in `holdings.ts`.

## 10. Vor dem Push

```bash
npm run verify     # typecheck + lint (inkl. Architekturregeln & 400-Zeilen-Limit) + tests
npm run format     # Prettier, inkl. Tailwind-Klassenreihenfolge
npm run dup        # DRY-Kontrolle (optional, nicht blockierend)
```

`verify` läuft automatisch als `pre-push`-Hook und in der [CI](../.github/workflows/ci.yml). Mit `--no-verify` lässt sich der Hook überspringen — dann ist die CI die letzte Instanz.
