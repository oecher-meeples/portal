# Ausführungsplan — Umsetzung Prozess-Audit 2026-08-03

- **Grundlage:** [`.claude/audits/2026-08-03_AUDIT_PROCESS.md`](../audits/2026-08-03_AUDIT_PROCESS.md)
- **Issues:** #35, #36, #37, #38, #39, #40 (alle `chore` + `ready`)
- **Git-Basis:** Branch `app-akademie`, HEAD `525f40f`, Working Tree dirty (11 M, 2 ??)
- **Ziel:** Die vorhandene Qualitätsmechanik wieder anschließen — CI läuft, Branch ist geschützt, Coverage ist messbar.

## Leitidee

Der Befund ist nicht „schlechte Qualität", sondern **nicht angeschlossene Instrumente**. Die Reihenfolge ist deshalb entscheidend: Erst muss der Arbeitsstand durch die bestehende Pipeline, dann wird die Pipeline erweitert, und **zuletzt** wird der Branch verriegelt. Umgekehrt blockiert das Ruleset den eigenen Aufräum-Push.

```
Phase 1 (#35)  →  Phase 2 (#37, #38)  →  Phase 3 (#39)  →  Phase 4 (#36)
                                                  Phase 5 (#40) — jederzeit parallel
```

---

## Phase 1 — Arbeitsstand veröffentlichen (#35) 🔴 zuerst

Ohne diesen Schritt sind alle folgenden Änderungen an der CI ungetestet, weil kein Lauf stattfindet.

- [ ] **1.1** Working Tree sichten: `git status`, `git diff`. Die 11 geänderten und 2 unversionierten Dateien (`crypto-randomuuid-polyfill.tsx`, `cover-media.tsx`) einzeln bewerten — gehören sie zu einer abgeschlossenen Änderung oder sind es Experimente?
- [ ] **1.2** Zusammengehörige Änderungen fachlich geschnitten committen (Conventional Commits, wie im Repo etabliert). Experimente verwerfen statt mitzuschleppen.
- [ ] **1.3** `pnpm run verify` lokal — muss grün sein. Zusätzlich einmalig `pnpm run format:check` (steckt noch nicht in `verify`, siehe Phase 3).
- [ ] **1.4** `git push -u origin app-akademie`
- [ ] **1.5** PR gegen `develop` öffnen, `pull_request_template.md` ausfüllen. **Erster PR im Repo überhaupt** — Template auf Brauchbarkeit prüfen und ggf. gleich anpassen.
- [ ] **1.6** CI-Lauf beobachten (`gh run watch`). Der letzte grüne Lauf ist zwei Monate alt — Toolchain-Drift (pnpm, Node 22, Prisma) ist realistisch. **Fehler hier sind erwartbar, nicht überraschend.**
- [ ] **1.7** PR mergen. `develop` ist danach aktuell.
- [ ] **Commit/Merge:** PR-Merge nach `develop`

> **Abbruchkriterium:** Schlägt die CI an etwas fachlich Substanziellem fehl (nicht nur Formatierung), wird das als eigenes Issue erfasst — nicht im PR mitgefixt.

---

## Phase 2 — Pipeline vervollständigen (#37, #38)

Beide Schritte erweitern `ci.yml`. Sie sind unabhängig voneinander, aber gemeinsam sinnvoll in einem PR, weil sie dieselbe Datei anfassen und beide die CI-Laufzeit verändern.

### 2a — `next build` in der CI (#37)

- [ ] **2.1** Build-Schritt nach `test` in [`ci.yml`](../../.github/workflows/ci.yml) ergänzen.
- [ ] **2.2** Env-Variablen für den Build klären: Welche Werte braucht `next build` zur Build-Zeit? Referenz ist `.env.example`. Dummy-Werte im Workflow setzen, echte Secrets nur wenn unvermeidbar.
- [ ] **2.3** `.next/cache` über `actions/cache` einbinden, sonst wächst die Laufzeit unnötig.
- [ ] **2.4** Laufzeit vor/nach dokumentieren (Referenz vorher: **1m37s**).

### 2b — Coverage (#38)

- [ ] **2.5** `@vitest/coverage-v8` als devDependency.
- [ ] **2.6** `coverage`-Block in [`vitest.config.ts`](../../vitest.config.ts) mit dem im Audit festgelegten Scope:
      **include** `src/lib/**`, `src/components/**/actions.ts` — **exclude** `src/lib/__mocks__/**`, `*.d.ts`, `nav-config.ts`, `cn.ts`, reine Re-Exports.
- [ ] **2.7** Script `test:coverage` in `package.json`, `coverage/` in `.gitignore`.
- [ ] **2.8** **Ist-Wert einmalig messen und in #38 kommentieren.** Erst dann Schwellenwert setzen — leicht unter dem Ist-Wert, damit er heute grün ist und morgen bremst. Nicht raten, keinen Wunschwert eintragen.
- [ ] **2.9** Coverage-Schritt blockierend in `ci.yml`.
- [ ] **2.10** Scope-Entscheidung in [`CLAUDE.md`](../../CLAUDE.md) und [`docs/project-structure.md`](../../docs/project-structure.md) dokumentieren — sonst wirkt der eingeschränkte Scope später wie eine Lücke statt wie eine Entscheidung.
- [ ] **Commit:** `ci: add next build and coverage gate to the pipeline`

---

## Phase 3 — `verify` und CI angleichen (#39)

Bewusst **nach** Phase 2, damit der Hook den finalen CI-Umfang widerspiegelt statt zweimal angefasst zu werden.

- [ ] **3.1** `format:check` als ersten Schritt in `verify` aufnehmen (billigster Check zuerst — dieselbe Logik wie in der CI).
- [ ] **3.2** Entscheiden, ob `test:coverage` statt `test` in `verify` läuft. Laufzeit gegen Nutzen abwägen.
- [ ] **3.3** `next build` bewusst **nicht** in `verify` — zu teuer für jeden Push. Diese Auslassung im Kommentar von [`.husky/pre-push`](../../.husky/pre-push) begründen.
- [ ] **3.4** Abschnitt „Vor dem Push" in `CLAUDE.md` auf den neuen Umfang aktualisieren.
- [ ] **Commit:** `chore: align verify script with the CI check scope`

---

## Phase 4 — Branch-Schutz aktivieren (#36) 🔒 zuletzt

Erst wenn `develop` aktuell und die Pipeline final ist, wird verriegelt.

- [ ] **4.1** [`ruleset-protect-main.json`](../../.github/ruleset-protect-main.json) korrigieren: `refs/heads/main` → `refs/heads/develop`. Datei in `ruleset-protect-develop.json` umbenennen, `name` mitziehen.
- [ ] **4.2** Kontextnamen des Required Status Check gegen den **tatsächlichen Job-Namen** im Workflow prüfen. Aktuell heißt der Job `verify` — bei Umbenennung greift der Check stumm nicht mehr.
- [ ] **4.3** **Entscheidung einholen:** `required_approving_review_count` steht auf `0`. Bei Ein-Personen-Projekt sinnvoll, aber bewusst bestätigen.
- [ ] **4.4** Ruleset anwenden: `gh api repos/oecher-meeples/portal/rulesets --input .github/ruleset-protect-develop.json --method POST`
- [ ] **4.5** Verifizieren: `gh api repos/oecher-meeples/portal/rulesets` liefert einen aktiven Eintrag; ein direkter Push auf `develop` wird abgelehnt.
- [ ] **4.6** Klären, ob `release` ebenfalls geschützt werden soll (siehe offene Frage unten).
- [ ] **4.7** Den nun verbindlichen Workflow (Feature-Branch → PR → grüne CI → Merge) in `CLAUDE.md` festhalten.
- [ ] **Commit:** `chore(ci): protect develop with an active ruleset`

---

## Phase 5 — Tests für geteilte Bausteine (#40) — parallel möglich

Unabhängig von Phase 1–4, kann jederzeit eingeschoben werden. Sinnvoll **nach** Phase 2b, weil die Coverage dann die Verbesserung sichtbar macht.

Reihenfolge nach Blast-Radius:

- [ ] **5.1** `src/lib/events/upcoming.ts` — höchste Priorität, in `CLAUDE.md` als wiederverwendbarer Baustein gelistet. Grenzfälle: kein kommendes Event, exakt jetzt startend, laufend, Sortierung, ungültige `selectedEventId`.
- [ ] **5.2** `src/lib/utils/slug.ts` — Umlaute, Sonderzeichen, Leerstring, Kollisionen.
- [ ] **5.3** `src/lib/utils/search-params.ts` — fehlender Parameter, Mehrfachwerte, ungültiger Wert.
- [ ] **5.4** `src/lib/utils/youtube.ts` — `watch?v=`, `youtu.be/`, `/embed/`, Nicht-YouTube-URL.
- [ ] **5.5** `src/lib/explainer/queries.ts` und `src/lib/inventory/spare-part-listings.ts` — Happy Path + leeres Ergebnis über `prismaMock`.
- [ ] **Commit:** je Modul ein Commit, `test(<domäne>): …`

**Stilvorgabe:** Dem etablierten Muster folgen — verhaltensbasierte Testnamen, benannte Konstanten, Fixture-Factories. Vorbild: [`src/components/feature/markt/actions.test.ts`](../../src/components/feature/markt/actions.test.ts). **Keine** `toHaveBeenCalledWith`-Assertions auf exakte Prisma-Query-Strukturen — die brechen bei jedem Refactoring (siehe die Einschränkung zu `permissions.test.ts` im Bericht).

---

## Offene Frage an den Nutzer (vor Phase 4 zu klären)

**Der `release`-Branch ist 0 Commits voraus und 8 hinter `develop`.** Der Bericht wertet das bewusst nicht als Fehler — ein eingefrorener Snapshot kann eine legitime Entscheidung sein. Zu klären:

1. Ist `release` ein bewusst gehaltener Stand oder schlicht liegen geblieben?
2. Gibt es einen Promotion-Prozess `develop → release`? Im Repo ist keiner dokumentiert.
3. Soll `release` ebenfalls per Ruleset geschützt werden?

Je nach Antwort entsteht daraus ein siebtes Issue (Release-Prozess dokumentieren) oder gar keins.

---

## Was dieser Plan bewusst nicht anfasst

- **Commit-Hygiene** — 99 % Conventional Commits, kein Handlungsbedarf.
- **Testqualität** — überdurchschnittlich (Fixture-Factories, Autorisierungspfade abgedeckt, 0 Snapshot-Attrappen). Es fehlt Messbarkeit, nicht Qualität.
- **CI-Aufbau** — gut entworfen (Concurrency-Cancel, Lockfile-Pinning, Cache, Schritte nach Kosten sortiert). Er wird ergänzt, nicht umgebaut.
- **Code, Architektur, Sicherheit, Lizenzen** — anderer Audit-Typ.
