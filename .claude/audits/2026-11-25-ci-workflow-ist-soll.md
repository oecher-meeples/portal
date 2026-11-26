# CI/CD-Workflow: Ist-Analyse & Soll-Empfehlung

Stand: 2026-11-25 · Datenbasis: `.github/workflows/*`, `.github/ruleset-*.json`, `.husky/pre-push`, 40 letzte Actions-Läufe, 15 letzte gemergte PRs.

## 1. Ist-Zustand

### Branches & Schutz

| Branch    | Schutz                                                     | Zweck                          |
| --------- | ---------------------------------------------------------- | ------------------------------ |
| `develop` | PR Pflicht (0 Reviews), Check `verify`, **strict = true**  | Integration                    |
| `release` | wie develop, nur Merge-Commit/Rebase erlaubt, **strict**   | Produktion (Auto-Deploy)       |
| `preview` | ungeschützt, Docker-Build + Auto-Deploy nach Preview       | Preview-Umgebung               |

### Workflows

| Workflow          | Trigger                                              | Dauer (gemessen) |
| ----------------- | ---------------------------------------------------- | ---------------- |
| CI (`verify`)     | `pull_request` (alle) **und** `push` auf develop/main | 5–6 min          |
| Docker build      | push `preview`/`release`, Tags                       | 15–19 min (amd64+arm64 via QEMU) |
| Deploy            | `workflow_call` aus Docker build (release → prod)    | < 1 min          |
| Sync release→dev  | push `release` → öffnet PR `sync/release-into-develop` | 15 s + **eigener CI-Lauf** |
| Release-PR öffnen | manuell                                              | 25 s + **eigener CI-Lauf** |

### Wo die Zeit im CI steckt (Lauf 15:27)

| Schritt                  | Dauer  |
| ------------------------ | ------ |
| Setup + Install + Prisma | ~25 s  |
| Format / Typecheck / Lint | 14 / 26 / 31 s |
| **Tests + Coverage**     | **213 s (62 %)** |
| Audit / Build (gecached) | 1 / 13 s |

Tests: 437 Testdateien. Lokal 61 s; Vitest meldet selbst: **„jsdom was created 443 times · 969 s total, 99 % der Zeit"**. Jede Datei – auch reine `lib/`-Logik – bekommt ein eigenes jsdom. Das ist die Hauptursache, nicht die Testanzahl an sich.

### Wie oft läuft dieselbe Prüfung für denselben Code?

Ein typischer Feature-Change:

1. `pre-push`-Hook: volles `verify` lokal (~1,5–2 min, blockiert dich)
2. CI auf dem PR: volles `verify` + Coverage + Build (~6 min)
3. Nach Merge: CI auf `push develop` – **identischer Inhalt wie Merge-Ergebnis, nochmal ~6 min**
4. Release: PR develop→release: CI nochmal (~6 min), dann nach Merge: Sync-PR release→develop: CI nochmal (~6 min) + Docker-Build 15 min

Beobachtet: PR #649 (Sync) lief 10 min von Erstellung bis Merge, #648 6,5 min, #644 19 min; ein Release-Zyklus (#647→#648→#649) bindet ~25 min reine Wartezeit, in denen nur Merge-Commits geprüft werden, die keine neue Logik enthalten.

### Probleme

1. **Tests dominieren** (62 % der CI-Zeit) wegen 443× jsdom-Setup.
2. **strict_required_status_checks** (branch muss up-to-date sein): Jeder Merge macht alle anderen offenen PRs „out-of-date" → Merge develop in Branch → neuer Push → neuer CI-Lauf (sichtbar: 4 abgebrochene Läufe auf `feature/637`, Memory-Regel „merge develop vor PR"). Bei 1 Entwickler und sequenzieller Arbeit kostet das nur Zeit, fängt aber kaum Fehler.
3. **CI auf `push develop` ist redundant**, solange strict aktiv ist (der PR-Check lief schon auf exakt diesem Stand). `main` existiert im Repo nicht – toter Trigger.
4. **Release-Ring** erzeugt 2 zusätzliche PRs + 2 volle CI-Läufe für Merge-Commits ohne neuen Code (release-PR, sync-PR). Das Sync-Problem existiert nur, weil `release` Merge-Commits bekommt, die `develop` nicht kennt.
5. **Pre-push = volles verify** inkl. aller Tests; dasselbe läuft direkt danach in der CI. Doppelarbeit, plus Windows/Git-Bash-Eigenheiten (Memory: Push nur via PowerShell).
6. **Docker-Build 15–19 min** durch arm64-Emulation (QEMU), startet erst *nach* dem Release-Merge → Prod-Deploy dauert ≈ 20 min ab Merge. Läuft ohne Pfadfilter und ohne Vorab-Check, ob sich App-Code geändert hat.
7. **Kein Pfadfilter**: Docs-/Plan-/`.claude/`-Änderungen lösen volle CI aus.
8. `pnpm audit` blockiert jeden PR – ein neues Advisory (nicht durch den PR verursacht) kann unbeteiligte PRs rot machen.

## 2. Soll-Empfehlung

Leitidee: **Jede Prüfung läuft einmal, dort wo sie am billigsten Fehler fängt; jeder Merge-Commit wird nicht erneut vollgeprüft; Deploy ist an *bewusste* Freigabe gekoppelt.**

### 2.1 Test-Geschwindigkeit (größter Hebel, kein Prozess-Risiko)

- `environment: "node"` als Default, jsdom nur für `*.test.tsx` (Vitest `projects` bzw. `// @vitest-environment jsdom`-Docblock oder Glob-Zuordnung). Reine `lib/`-Tests brauchen kein DOM.
- Für UI-Tests `pool: "vmThreads"` oder `isolate: false` prüfen (Hinweis von Vitest selbst).
- Erwartung: CI-Tests von ~210 s auf grob 60–90 s; lokal auf ~20–30 s. Vorher/nachher mit `vitest run` messen und Coverage-Schwelle verifizieren.
- Optional später: Tests auf 2 Shards (`--shard 1/2`) parallel, falls es wieder wächst.

### 2.2 Welche Prüfung wann

| Stufe            | Wann                            | Was                                                                 | Ziel   |
| ---------------- | ------------------------------- | ------------------------------------------------------------------- | ------ |
| `pre-commit`     | jeder Commit                    | `lint-staged`: prettier + eslint nur auf geänderte Dateien          | < 5 s  |
| `pre-push`       | Push                            | `typecheck` + **nur betroffene Tests** (`vitest related --run` / `--changed origin/develop`) | < 30 s |
| CI `verify` (PR) | PR/Push auf PR-Branch           | Format, Typecheck, Lint, **alle Tests mit Coverage**, Build         | ~3 min |
| CI Merge-Commit  | Merge in `develop`              | **nichts** (siehe 2.3)                                              | –      |
| Nightly/Cron     | täglich auf `develop`           | `pnpm audit`, `dup`, `test:live`, Lizenz-Check                      | –      |
| Release          | PR → `release`                  | Prüfung nur, wenn Inhalt ≠ bereits geprüftes develop (siehe 2.4)    | –      |

Weitere Punkte:
- `pnpm audit` aus dem PR-Pfad nehmen (blockierend nur im Nightly + Release-PR), damit fremde Advisories keine Feature-PRs stoppen.
- `paths-ignore` für `**.md`, `.claude/**`, `docs/**`: Docs-PRs brauchen nur Prettier. (Achtung: required check `verify` muss trotzdem „grün" melden → entweder Job bleibt, überspringt teure Schritte per `dorny/paths-filter`, oder kein `paths-ignore` auf Workflow-Ebene.)
- Build im PR beibehalten (13 s gecached – billig, fängt Next-Fehler).
- `concurrency cancel-in-progress` ist bereits gut.

### 2.3 PRs & Up-to-date

**PR bleibt Pflicht für `develop`** – er ist der einzige Ort, an dem CI läuft, und `verify` ist ohnehin das Gate. Er ist hinderlich bei: Docs-/Plan-Änderungen, Dependabot-Minor/Patch, Sync-PRs.

Empfehlung:
- **`strict_required_status_checks_policy` für `develop` auf `false`.** Begründung: Ein-Personen-Projekt, kurzlebige Branches, Tests laufen auf dem PR-Stand. Das Restrisiko (semantischer Konflikt zweier einzeln grüner PRs) wird durch den Nightly/den Release-Check auf `develop` aufgefangen. Spart den „Merge develop → neuer CI-Lauf"-Zyklus komplett. Falls du das Risiko nicht tragen willst: **GitHub Merge Queue** statt strict – CI läuft dort einmal auf dem Merge-Ergebnis, kein manuelles Nachziehen; kostet aber ebenfalls einen Lauf pro PR.
- Memory-Regel „develop in Branch mergen vor `gh pr create`" entfällt dann, außer bei echten Konflikten.
- CI-Trigger `push: [develop, main]` **entfernen** (redundant; `main` existiert nicht). Stattdessen ein *schlanker* Post-Merge-Smoke (Typecheck + Build, ~1 min) oder gar nichts, da Nightly existiert.
- `gh pr merge --auto` nutzen: Auto-merge aktivieren statt auf CI zu warten (passt zu „Don't block on CI watch"). Merge-Methode für develop: regulärer Merge-Commit (Projektregel, kein Squash).

### 2.4 Release-Ring vereinfachen

Das Sync-Problem (release hat Merge-Commits, develop nicht) entsteht, weil `release` per Merge-Commit befüllt wird. Optionen, absteigend empfohlen:

1. **`release` fast-forward-only aus `develop`** (Ruleset: `release` erlaubt Push nur per FF; Release-Workflow `git push origin develop:release` nach manueller Freigabe, ohne PR). `release` ist dann immer ein Vorfahre von `develop` → **kein Sync-PR, kein Release-PR, 2 CI-Läufe weniger**. Der geprüfte develop-Commit *ist* der Release-Commit. Gate: `workflow_dispatch` mit Environment-Approval („production") statt PR.
2. Beibehalten wie heute, aber Sync-PR mit Auto-Merge und CI überspringen, wenn der PR nur Merge-Commits enthält (Diff zu `develop` leer).

Entsprechend Memory „kein Squash": FF erhält die Commits, passt zur Regel.

### 2.5 Deploy

| Umgebung   | Auslöser (Soll)                                                              | Gate |
| ---------- | ---------------------------------------------------------------------------- | ---- |
| Preview    | automatisch bei Push auf `preview` (wie heute) – optional: auto aus `develop` nach grüner CI | keins |
| Production | `workflow_dispatch`/Push auf `release` → **nur Deploy des bereits gebauten Images** | GitHub Environment `production` mit Required reviewer (= du, per Klick) |

Docker-Build beschleunigen:
- Image **einmal pro develop-Commit** nach grüner CI bauen und mit SHA taggen (`ghcr.io/…:sha-<commit>`), Release/Deploy re-tagged nur (`docker buildx imagetools create`) → Prod-Deploy nach Freigabe in < 1 min statt 20 min.
- arm64 nur bauen, wenn der Zielserver arm64 ist (QEMU-Emulation ist der Hauptkostentreiber); sonst nur `linux/amd64`, oder arm64 auf nativem Runner (`ubuntu-24.04-arm`).
- Build-Cache (`cache-from/to: type=gha`) prüfen.

### 2.6 Zielbild (Ablauf)

```
Feature-Branch ── commit: lint-staged ── push: typecheck + related tests (<30 s)
      │
      └─ PR → develop:  verify (~3 min, schnelle Tests)  ── auto-merge, kein „up-to-date"-Zwang
                           │
              develop ─────┤ nightly: audit, dup, live-tests
                           │
                           ├─ (optional) Image build :sha + Preview-Deploy
                           │
        Release-Freigabe (dispatch + Environment-Approval)
                           └─ release = FF von develop → Image re-tag → Prod-Deploy (<2 min)
```

Geschätzte Wartezeit pro Feature-Zyklus: heute ~6 min PR + ~6 min Post-Merge + ggf. Rebase-Läufe → Soll ~3 min. Release heute ~25 min + ~20 min Build → Soll ~3 min bis Deploy.

## 3. Umsetzungsreihenfolge (Aufwand → Nutzen)

1. **Vitest: node-Default, jsdom nur für TSX** (klein, größter Effekt, risikolos wenn Coverage gleich bleibt).
2. `push`-Trigger der CI entfernen; `pnpm audit` in Nightly verlagern.
3. `pre-push` auf typecheck + `vitest related`; `lint-staged` als pre-commit.
4. `strict_required_status_checks_policy: false` für `develop` (Ruleset-JSON + GitHub-Setting) + Auto-Merge.
5. Docker: arm64 prüfen/entfernen, Build pro develop-SHA, Release = Re-Tag.
6. Release: FF-Modell, Release-PR- und Sync-Workflow entfernen, Environment-Approval für Production.

## 4. Offene Entscheidungen für dich

- Strict-Check abschaffen (empfohlen) oder Merge Queue?
- Läuft der Zielserver auf amd64 oder arm64?
- Soll `develop` automatisch auf Preview deployen, oder bleibt Preview ein manueller Push auf `preview`?
- Release per FF + Approval-Gate (empfohlen) oder bei PR-basiertem Release bleiben?
