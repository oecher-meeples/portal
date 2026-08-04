# Prozess- & Qualitätsmanagement-Audit

- **Datum:** 2026-08-03
- **Repo:** `oecher-meeples/portal`
- **Default-Branch:** `develop` · **Arbeits-Branch beim Audit:** `app-akademie` (HEAD `525f40f`)
- **Vorheriger Bericht:** keiner — dies ist der Erstlauf.

Bewertet wird der **Weg zum Produkt** (Git-Workflow, CI/CD, Test-Disziplin), nicht der Code selbst.

---

## Kurzfassung

Das Projekt hat eine **gute Qualitätssubstanz** (527 grüne Tests, verhaltensbasiert geschrieben, 99 % Conventional Commits, Architekturregeln per ESLint erzwungen) — aber die **Absicherungsmechanik greift derzeit ins Leere**: Die CI ist seit 42 Commits nicht gelaufen, es existiert keinerlei aktiver Branch-Schutz, und es gibt keine Coverage-Messung. Die Qualität hängt damit vollständig an lokaler Disziplin (`pre-push`-Hook), die per `--no-verify` umgehbar und in diesem Fall schlicht nicht angekommen ist.

Kurz: **Die Instrumente sind gebaut, aber nicht angeschlossen.**

---

## Stand der Umsetzung (2026-08-04)

Alle sechs Issues sind umgesetzt und geschlossen — die Instrumente sind jetzt angeschlossen.

| Issue | Finding | Umsetzung |
| --- | --- | --- |
| [#35](https://github.com/oecher-meeples/portal/issues/35) (P1) | CI seit 42 Commits nicht gelaufen | Formatierung korrigiert, CI läuft wieder grün auf `develop` |
| [#39](https://github.com/oecher-meeples/portal/issues/39) (P5) | `pre-push`-Hook und CI prüfen nicht denselben Umfang | `format:check` als erster Schritt in `verify` aufgenommen |
| [#37](https://github.com/oecher-meeples/portal/issues/37) (P4) | `next build` läuft nicht in der CI | Build-Schritt mit Dummy-Env-Variablen und `.next/cache`-Caching ergänzt |
| [#38](https://github.com/oecher-meeples/portal/issues/38) (P3) | Keine Coverage-Messung | `@vitest/coverage-v8`, Scope `lib/**` + `actions.ts`, Schwelle 80 % aus gemessener Baseline (86.71/83.39/88.33/87.02), blockierend in der CI |
| [#40](https://github.com/oecher-meeples/portal/issues/40) (P6) | Geteilte Bausteine ohne Tests | `upcoming.ts`, `slug.ts`, `search-params.ts`, `youtube.ts`, `explainer/queries.ts`, `spare-part-listings.ts` — sechs neue Testdateien |
| [#36](https://github.com/oecher-meeples/portal/issues/36) (P2) | Kein aktiver Branch-Schutz | Ruleset auf `develop` aktiv; direkter Push nachweislich abgelehnt (`GH013`); Test-PR zeigte `verify` als Required Check |

**P7** (`release`-Branch hinter `develop`) war laut Nutzerentscheidung bewusst kein eigenes Issue — bleibt unverändert liegen.

---

## Prioritized Findings

| #      | Schwere      | Finding                                                        | Dimension |
| ------ | ------------ | -------------------------------------------------------------- | --------- |
| **P1** | **Kritisch** | CI seit 42 Commits nicht gelaufen — Branch nie gepusht          | CI/CD     |
| **P2** | **Kritisch** | Kein aktiver Branch-Schutz; Ruleset-Datei nie angewendet und auf nicht existierenden Branch `main` gemünzt | Git       |
| **P3** | Hoch         | Keine Coverage-Messung, kein Schwellenwert                      | Test      |
| **P4** | Hoch         | `next build` läuft nicht in der CI — Build-Fehler fallen erst im Deploy auf | CI/CD     |
| **P5** | Mittel       | `pre-push`-Hook und CI prüfen nicht denselben Umfang            | CI/CD     |
| **P6** | Mittel       | Geteilte Bausteine ohne Tests (u. a. `lib/events/upcoming.ts`)  | Test      |
| **P7** | Niedrig      | `release`-Branch 8 Commits hinter `develop`, kein dokumentierter Prozess | Git |

---

## 1. Prozess-Audit (Git-Workflow, CI/CD)

### P1 — CI seit 42 Commits nicht gelaufen (kritisch)

```
gh run list  →  letzter Lauf: 2026-07-30, commit b19bdf0, develop, success (1m37s)
git rev-list --count b19bdf0..HEAD  →  42
```

Der gesamte aktuelle Arbeitsstand liegt auf dem lokalen Branch `app-akademie`, der **nie gepusht wurde**. Der Workflow triggert auf `push: [develop, main]` und `pull_request` — beides ist für diesen Branch nie eingetreten.

In diesen 42 Commits stecken u. a. vier neue Prisma-Modelle (`spare part`, `market listing`, `private collection entry`, Loan-Statistik-Aggregation) und ein Refactoring des Blob-Upload-Hooks. Nichts davon wurde je auf fremder Hardware gebaut oder getestet.

Zusätzlich: der Working Tree ist dirty (11 geänderte, 2 unversionierte Dateien), d. h. selbst der lokale Stand ist nicht vollständig committet.

> **Bewertung:** Eine Pipeline, die existiert und grün ist, aber die aktuelle Arbeit nicht sieht, ist gefährlicher als keine — sie erzeugt ein grünes Badge für einen zwei Monate alten Stand.

### P2 — Kein aktiver Branch-Schutz (kritisch)

```
gh api repos/oecher-meeples/portal/rulesets                    →  []
gh api .../branches/develop/protection                          →  404 Branch not protected
gh api .../branches/main/protection                             →  404 Branch not found
gh pr list --state all --limit 10                               →  (leer)
```

Drei Befunde in einem:

1. **Keine Regel ist serverseitig aktiv.** `develop` (Default-Branch) ist ungeschützt — Force-Push und Löschen sind möglich, `verify` ist kein Required Status Check.
2. **`.github/ruleset-protect-main.json` existiert als Datei, wurde aber nie angewendet.** Die Datei allein bewirkt nichts; GitHub liest sie nicht.
3. **Selbst angewendet wäre sie wirkungslos:** sie zielt auf `refs/heads/main` — diesen Branch gibt es im Repo nicht. Vorhanden sind `develop` (default) und `release`.

Ein `pull_request_template.md` liegt vor, aber es wurde **noch nie ein PR erstellt**. Der faktische Workflow ist 100 % Direct-Push.

### P3 — CI-Pipeline: Inhalt

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) ist sauber aufgebaut: `concurrency`-Gruppe mit `cancel-in-progress`, pnpm-Cache, Node 22, `--frozen-lockfile`, Schritte nach Kosten sortiert (format → typecheck → lint → test), `jscpd` als nicht-blockierender Hinweis. Laufzeit zuletzt **1m37s**.

**Lücke (P4):** Es fehlt `pnpm run build`. `tsc --noEmit` prüft Typen, aber nicht, ob Next.js das Projekt bauen kann — Prerender-Fehler, Server/Client-Boundary-Verstöße, fehlende Build-Zeit-Env-Variablen und Route-Konfigurationsfehler tauchen erst im Vercel-Deploy auf. Bei 42 ungebauten Commits mit vier neuen Datenmodellen ist das ein realistisches Risiko.

**Lücke (P5):** `pnpm run verify` = `typecheck && lint && test`. Die CI führt zusätzlich `format:check` als ersten Schritt aus. Ein Push, dessen `pre-push`-Hook grün war, kann in der CI an Prettier scheitern — der Hook erfüllt seinen erklärten Zweck („damit die CI nicht die erste Instanz ist, die es merkt") also nicht vollständig.

### P6 — Commit-Hygiene: sehr gut

```
git log --oneline -100  →  99 / 100 im Conventional-Commits-Format
```

Einzige Abweichung: ein Merge-Commit (`669d878`), also systembedingt. Keine „wip"/„fix"/„asdf"-Junk-Messages. Scopes werden konsistent verwendet (`feat(ludothek):`, `fix(auth):`, `chore(seed):`). Commits sind fachlich geschnitten — Modell, Server-Action und View jeweils getrennt (`903ac7c` → `5b25d82` → `edcb162`). Das ist überdurchschnittlich.

### P7 — Branch-Zustand

```
origin/develop..origin/release  →  0 Commits
origin/release..origin/develop  →  8 Commits
```

`release` ist 8 Commits hinter `develop` und 0 voraus — also ein sauberer, aber veralteter Snapshot. **Keine Wertung ohne Rückfrage:** ein bewusst eingefrorener Release-Stand ist eine legitime Entscheidung. Ungeklärt ist nur, ob es einen dokumentierten Promotion-Prozess develop → release gibt; im Repo findet sich keiner.

### Versionierung

`package.json` ist die einzige Versionsquelle (`0.1.0`, seit Projektbeginn unverändert). `vercel.json` enthält nur die Cron-Definition, keine Version. Keine Drift möglich — **kein Finding**.

---

## 2. Test-Audit

### Zahlen

| Metrik                       | Wert                             |
| ---------------------------- | -------------------------------- |
| Testdateien                  | **69** (grün)                    |
| Tests                        | **527** (grün, 0 skipped)        |
| Laufzeit                     | **10,8 s**                       |
| Quelldateien (ohne Tests)    | 248                              |
| Coverage                     | **nicht gemessen**               |
| Vergessene `.skip` / `.only` | **0**                            |
| Snapshot-Tests               | **0**                            |

### P3 — Keine Coverage-Messung (hoch)

Weder `@vitest/coverage-v8` noch `@vitest/coverage-istanbul` sind installiert, `vitest.config.ts` enthält keinen `coverage`-Block, `package.json` kein `test:coverage`-Script, die CI keinen Coverage-Schritt.

Konsequenz: Es gibt **keine Zahl** und damit keine Regressionsbremse. 527 Tests klingen viel, aber ob sie den kritischen Pfad treffen oder um dieselben fünf Utils kreisen, ist unbelegt. Ein neues Feature ohne einen einzigen Test bemerkt niemand automatisch.

Empfehlung: Coverage einführen, **Scope bewusst auf `src/lib/**` und `src/components/**/actions.ts` beschränken** (Geschäftsregeln + Server Actions) statt pauschal auf `src/**` — das passt zur Layer-Architektur des Projekts und vermeidet ein Ziel, das nur über sinnlose View-Tests erreichbar wäre. Startschwelle aus dem Ist-Wert ableiten, nicht raten.

### Test-Qualität: überdurchschnittlich

Stichprobe: [`shift-capacity.test.ts`](src/lib/events/shift-capacity.test.ts), [`permissions.test.ts`](src/lib/auth/permissions.test.ts), [`markt/actions.test.ts`](src/components/feature/markt/actions.test.ts), [`browser.test.ts`](src/lib/ludothek/browser.test.ts).

Positiv:

- **Verhaltensbasiert.** Testnamen beschreiben Fachverhalten („counts uncertain bookings the same as certain ones", „writes nothing" ohne Session), nicht Implementierung.
- **Benannte Konstanten statt Magic Values.** `OWNER`, `OTHER`, `VALID_INPUT` in `markt/actions.test.ts` — Absicht ist aus dem Namen lesbar.
- **Fixture-Factories statt Duplikation.** `marketListing(overrides)` erzeugt Varianten aus einem Basisobjekt; kein copy-paste über Testfälle.
- **Zentraler Prisma-Mock.** `src/lib/__mocks__/prisma.ts` wird von allen Action-Tests wiederverwendet.
- **Autorisierung wird explizit getestet.** Für Server Actions gibt es „ohne Session schreibt nichts"- und „fremdes Objekt darf nicht geändert werden"-Fälle — genau die Klasse Fehler, die in einem Vereinsportal teuer wird.
- **Arrange-Act-Assert** durchgehend, mit Leerzeilen visuell getrennt.

Einschränkung: `permissions.test.ts` assertet mit `toHaveBeenCalledWith` auf die exakte Prisma-Query-Struktur — das ist Implementierungsdetail und bricht bei jedem Query-Refactoring. Vertretbar bei einer Sicherheitsfunktion, aber kein Muster zum Ausrollen.

### Anti-Patterns: keine

- Kein vergessenes `.only` oder `.skip`. Der einzige Treffer ist `describe.skipIf(!!process.env.CI)` in [`bgg/client.live.test.ts`](src/lib/bgg/client.live.test.ts) — beabsichtigt und korrekt.
- Keine Snapshot-Tests, also keine inhaltsleeren Assertions.
- `*.live.test.ts` sauber über `exclude` in `vitest.config.ts` von der deterministischen Suite getrennt, mit erklärendem Kommentar; `test:live` matcht tatsächlich existierende Dateien.

### P6 — Kritische Pfade ohne Tests

Priorisiert nach Blast-Radius (Anzahl Importe von anderswo), nicht nach Dateigröße:

| Modul                                    | Warum relevant                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/events/upcoming.ts`             | In `CLAUDE.md` ausdrücklich als wiederverwendbarer Baustein gelistet (`findUpcomingEvents`, `resolveSelectedEventId`) — mehrfach importiert, Datums-/Auswahllogik, **kein Test** |
| `src/lib/inventory/spare-part-listings.ts` | Neues Datenmodell aus diesem Branch, Leseseite ohne Test                        |
| `src/lib/explainer/queries.ts`           | Query-Layer eines Features mit Selbsteinstufungslogik                             |
| `src/lib/utils/search-params.ts`         | Parsing von Nutzereingaben aus der URL — klassische Edge-Case-Quelle              |
| `src/lib/utils/slug.ts`                  | Erzeugt URL-Identitäten; Kollisionen/Umlaute sind ein realer Fehlerfall           |
| `src/lib/utils/youtube.ts`               | Parst fremde URL-Formate                                                          |

Nicht als Lücke gewertet: `cn.ts`, `nav-config.ts`, `errors.ts`, `auth/client.ts`, `__mocks__/prisma.ts` — Konfiguration bzw. triviale Re-Exports.

---

## Was gut funktioniert

- **Commit-Disziplin.** 99 % Conventional Commits, fachlich geschnittene Commits, konsistente Scopes. Braucht keine Verbesserung.
- **Testqualität.** Verhaltensbasiert, benannte Fixtures, wiederverwendeter Prisma-Mock, Autorisierungspfade explizit abgedeckt, keine Snapshot-Attrappen, 0 vergessene `.skip`/`.only`. 527 Tests in 10,8 s — schnell genug, um sie wirklich zu laufen.
- **Architekturregeln maschinell erzwungen.** `import/no-restricted-paths` und `max-lines` laufen im Lint-Schritt mit — die Layer-Regeln aus `CLAUDE.md` sind nicht nur Prosa.
- **CI-Aufbau.** Concurrency-Cancel, Lockfile-Pinning, Cache, Schritte nach Kosten sortiert, jscpd bewusst als nicht-blockierender Hinweis. Der Workflow ist gut entworfen — er läuft nur nicht.
- **Saubere Trennung deterministischer und Live-Tests**, inklusive Begründung im Code.
- **`pre-push`-Hook existiert und dokumentiert seinen eigenen Umgehungsweg** (`--no-verify`) ehrlich im Kommentar.

---

## Nicht Teil dieses Audits

Code-Qualität, Architektur und Performance → `/code-architecture-audit`. Sicherheit, Lizenzen, Datenschutz → `/security-audit`, `/compliance-audit`.
