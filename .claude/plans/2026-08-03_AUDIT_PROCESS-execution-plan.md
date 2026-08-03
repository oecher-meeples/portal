# Ausführungsplan: Prozess- & Qualitätsmechanik wieder anschließen

- **Erstellt/Aktualisiert:** 2026-08-03 13:55
- **Ziel:** Die vorhandene, aber nicht greifende Qualitätsmechanik scharf schalten — CI grün und vollständig, Coverage messbar, `develop` geschützt.
- **Quelle:** [`.claude/audits/2026-08-03_AUDIT_PROCESS.md`](../audits/2026-08-03_AUDIT_PROCESS.md)
- **Issues:** #35, #39, #37, #38, #40, #36
- **Git-Base-State:** Branch `develop`, HEAD `649681a`, Working Tree sauber, `origin/develop == HEAD`

> Anforderungen, Zahlen und Begründungen stehen im Audit-Bericht und in den Issues — hier nicht duplizieren.

## Persona

Du bist Build- und Release-Engineer für ein Next.js-16-/TypeScript-Projekt mit Prisma, Vitest und GitHub Actions, deployt auf Vercel. Deine Kernkompetenz ist es, Qualitäts-Gates so zu setzen, dass sie tatsächlich greifen statt nur zu existieren — und dabei die Reihenfolge zu beachten, in der ein Gate sich nicht selbst blockiert. Du arbeitest verifizierend: jede Behauptung über den CI-Zustand belegst du mit einem `gh`-Aufruf, nicht mit einer Annahme.

## Lage bei Planerstellung (hat sich seit dem Audit geändert)

Der Audit-Bericht beschreibt 42 unveröffentlichte Commits auf `app-akademie`. **Dieser Teil ist erledigt:** der Stand liegt auf `develop` und ist gepusht — allerdings **direkt, ohne PR**, was bei fehlendem Branch-Schutz möglich war.

Neu und wichtiger: **Die CI ist rot.** Run `30811205874` (2026-08-03T11:51, 43 s) bricht im ersten Schritt ab:

```
$ prettier --check .
Code style issues found in 22 files.
```

Damit sind `typecheck`, `lint` und `test` auf `develop` **nie gelaufen**. Ob sie grün wären, ist unbekannt — Schritt 2 klärt das als Erstes. Ursache ist exakt Finding P5 (#39): der `pre-push`-Hook prüft `format:check` nicht, die CI schon.

## Getroffene Annahmen

Aus der Klärungsrunde mit dem Nutzer:

- **Working Tree:** Der Ausführer darf offene Änderungen sichten und fachlich gruppiert committen. _(Beim Schreiben dieses Plans bereits erledigt — Tree ist sauber.)_
- **Push & Merge:** Vollständig autonom erlaubt — pushen, PRs öffnen, CI abwarten, mergen.
- **`release`-Branch:** Kein bewusster Prozess dahinter, schlicht liegen geblieben. Bleibt ungeschützt und unangetastet; **kein zusätzliches Issue**, Schritt 4.6 des Vorgängerplans entfällt.
- **Review-Pflicht:** `required_approving_review_count: 0` — PR-Pflicht und grüne CI ja, Selbst-Merge erlaubt (Ein-Personen-Projekt).

Vom Ausführer als Standard gesetzt, mangels Gegenargument:

- **`next build` kommt nicht in `verify`.** Zu teuer für jeden Push. Die Auslassung wird im Kommentar von `.husky/pre-push` begründet, statt sie stillschweigend zu lassen.
- **`test:coverage` kommt nicht in `verify`.** Der Hook behält `test`; Coverage ist ein reines CI-Gate. Begründung: der Hook soll schnell bleiben, damit er nicht per `--no-verify` umgangen wird.
- **Coverage-Scope** wie im Audit festgelegt: `src/lib/**` und `src/components/**/actions.ts`. Der Rest des Baums hat bewusst keine Coverage-Pflicht.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt).
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf die Quelldatei.
- Dateien über 400 Zeilen möglichst in kleinere Dateien aufteilen (ESLint `max-lines` erzwingt das ohnehin).
- **Unit-Tests:** Für neue Logik/Funktionen Unit-Tests schreiben. Die Definition of Done eines Schritts gilt erst als erfüllt, wenn die zugehörigen Tests grün sind. Ausgenommen sind rein mechanische/nicht-testbare Schritte (Config, Doku, Boilerplate).
- **Committe nur Dateien, die du selbst geschrieben hast** — kein `git add .`, sondern gezieltes `git add <datei>`. **Ausnahme Schritt 2:** dort ist ein flächiger Formatierungs-Commit genau der Zweck.
- **Blockierende Prozesse:** Du darfst Prozesse beenden, die für einen Schritt benötigte Ressourcen blockieren (Port, Datei, Lock). Identifiziere den blockierenden Prozess gezielt und beende nur diesen.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert: < 1 h Arbeit).
- **Bei Fehlschlag eines Schritts:** prüfen, ob die Definition of Done zumindest teilweise erfüllt ist. Falls ja, den Teilstand mit Präfix `wip:` committen; falls nein, nichts committen. In beiden Fällen den Schritt mit `[!]` markieren, den Fehler als Stichpunkt darunter notieren und **mit dem nächsten Schritt fortfahren — nicht abbrechen.** Erst nachdem alle Schritte durchlaufen sind, alle offenen Punkte gesammelt auf Deutsch mit dem Nutzer besprechen.
- Markiere jeden erledigten Schritt mit `[x]`, sobald er abgeschlossen und committet ist.
- **Issues in GitHub mitpflegen:** Nach jedem Schritt, der ein Issue abschließt, dieses per `gh issue close <nr> --comment "<was umgesetzt wurde>"` schließen. Bei Teilfortschritt stattdessen `gh issue comment`. Die Issues sind die Wahrheit für den Projektstatus, nicht dieser Plan.
- **Ab Schritt 8 gilt PR-Pflicht.** Sobald das Ruleset aktiv ist, sind direkte Pushes auf `develop` blockiert — dann Feature-Branch, PR, grüne CI abwarten, mergen.

## Schritte

- [ ] **0. Repository und Ausgangslage verifizieren**
      Prüfen, dass ein Git-Repo vorliegt und der Ausgangszustand dem Plan entspricht: `git status` sauber, Branch `develop`, `git rev-list --count origin/develop..HEAD` == 0. `.gitignore` ist vorhanden. Weicht der Zustand ab (fremde Commits, dirty Tree), **erst hier stoppen und den Nutzer fragen** — nicht raten.
      _Definition of Done:_ Working Tree sauber, auf `develop`, keine unveröffentlichten Commits.
      _Kein Commit — reiner Prüfschritt._

- [ ] **1. Testframework verifizieren**
      Vitest 4 ist bereits eingerichtet ([`vitest.config.ts`](../../vitest.config.ts), jsdom, `@`-Alias, `*.live.test.ts` per `exclude` ausgeschlossen). Einmalig `pnpm run test` laufen lassen und bestätigen, dass die Suite grün ist. Referenz aus dem Audit: **69 Dateien, 527 Tests, ~11 s**. Kein Setup nötig.
      _Definition of Done:_ `pnpm run test` grün, Testanzahl ≥ 527.
      _Kein Commit — reiner Prüfschritt._

- [ ] **2. CI wieder grün bekommen (#35)**
      `pnpm run format` ausführen — das korrigiert die 22 von Prettier bemängelten Dateien. Danach `pnpm run format:check` **und** `pnpm run verify` lokal laufen lassen.
      **Achtung:** `typecheck`, `lint` und `test` sind auf `develop` noch nie durchgelaufen, weil die CI vorher abbricht. Schlägt hier etwas Fachliches fehl (Typfehler, Lint-Verstoß, roter Test), **nicht im selben Commit mitfixen** — per `gh issue create` als eigenes Issue erfassen, im Plan als `[!]` markieren und weitermachen.
      Anschließend committen, pushen und `gh run watch` bis der Lauf durch ist.
      _Definition of Done:_ `gh run list --limit 1` zeigt `success` für `develop`; alle vier Schritte (`format:check`, `typecheck`, `lint`, `test`) sind tatsächlich gelaufen. Issue #35 geschlossen.
      `git commit -m "style: apply prettier formatting across the codebase"`

- [ ] **3. `verify` und CI auf denselben Prüfumfang bringen (#39)**
      `format:check` als **ersten** Schritt in das `verify`-Script in [`package.json`](../../package.json) aufnehmen — billigster Check zuerst, dieselbe Reihenfolge wie in [`ci.yml`](../../.github/workflows/ci.yml). Den Kommentar in [`.husky/pre-push`](../../.husky/pre-push) ergänzen: `next build` und Coverage laufen bewusst **nicht** lokal, damit der Hook schnell bleibt. Abschnitt „Vor dem Push" in [`CLAUDE.md`](../../CLAUDE.md) auf den neuen Umfang aktualisieren.
      Bewusst direkt nach Schritt 2: dieser Schritt schließt genau das Loch, durch das die rote CI entstanden ist.
      _Definition of Done:_ `pnpm run verify` prüft Formatierung mit; eine testweise unformatierte Datei lässt den Hook fehlschlagen. Issue #39 geschlossen.
      `git commit -m "chore: align verify script with the CI check scope"`

- [ ] **4. `next build` als CI-Schritt ergänzen (#37)**
      Build-Schritt nach `test` in `ci.yml`. Benötigte Build-Zeit-Env-Variablen aus [`.env.example`](../../.env.example) ableiten und als Dummy-Werte im Workflow setzen — der Build darf nicht an einer fehlenden `DATABASE_URL` scheitern. `.next/cache` über `actions/cache` einbinden (Key aus Lockfile-Hash + Source-Hash), sonst wächst die Laufzeit unnötig.
      Vorher lokal `pnpm run build` ausführen: bei vier neuen Prisma-Modellen aus nie gebauten Commits sind Prerender- oder Server/Client-Boundary-Fehler realistisch. Treten welche auf, gehören sie in ein eigenes Issue, nicht in diesen Commit.
      _Definition of Done:_ CI-Lauf auf `develop` grün inklusive Build-Schritt; Laufzeit vorher/nachher im Issue kommentiert (Referenz vorher: 1m37s). Issue #37 geschlossen.
      `git commit -m "ci: add a next build step to the pipeline"`

- [ ] **5. Coverage messen und Ist-Wert dokumentieren (#38, Teil 1)**
      `@vitest/coverage-v8` als devDependency. `coverage`-Block in `vitest.config.ts` mit dem festgelegten Scope: **include** `src/lib/**` und `src/components/**/actions.ts`, **exclude** `src/lib/__mocks__/**`, `**/*.d.ts`, `src/lib/utils/nav-config.ts`, `src/lib/utils/cn.ts`. Script `test:coverage` in `package.json`, `coverage/` in `.gitignore`.
      **Noch keinen Schwellenwert setzen.** Erst messen, dann den Ist-Wert (Statements/Branches/Functions/Lines) per `gh issue comment 38` dokumentieren. Ein geratener Wert ist wertlos.
      _Definition of Done:_ `pnpm run test:coverage` läuft durch und gibt einen Report aus; Ist-Wert steht als Kommentar an #38.
      `git commit -m "chore: add coverage reporting scoped to the domain layer"`

- [ ] **6. Coverage-Schwelle setzen und in der CI erzwingen (#38, Teil 2)**
      `thresholds` in `vitest.config.ts` aus dem in Schritt 5 gemessenen Ist-Wert ableiten — **leicht darunter** ansetzen (Richtwert: auf die nächste volle Zehnerstelle abrunden), damit die Schwelle heute grün ist und morgen bremst. Coverage-Schritt blockierend in `ci.yml` (ersetzt den bestehenden `test`-Schritt, statt zusätzlich zu laufen — die Suite zweimal auszuführen wäre Verschwendung). Scope-Entscheidung in `CLAUDE.md` und [`docs/project-structure.md`](../../docs/project-structure.md) dokumentieren, damit der eingeschränkte Scope später als Entscheidung erkennbar ist und nicht als Lücke.
      _Definition of Done:_ CI grün; ein testweises Absenken der Schwelle unter den Ist-Wert lässt die Pipeline fehlschlagen. Issue #38 geschlossen.
      `git commit -m "ci: enforce a coverage threshold derived from the current baseline"`

- [ ] **7. Tests für `lib/events/upcoming.ts` (#40, Teil 1)**
      Höchste Priorität der Test-Lücken: das Modul ist in `CLAUDE.md` ausdrücklich als wiederverwendbarer Baustein gelistet (`findUpcomingEvents`, `resolveSelectedEventId`) und wird mehrfach importiert.
      Grenzfälle: kein kommendes Event, exakt jetzt startendes Event, laufendes Event, Sortierreihenfolge, ungültige und fehlende `selectedEventId`. Zeitabhängige Logik über einen injizierten/gemockten Zeitpunkt testen, nicht über `Date.now()` zur Laufzeit.
      Stil dem etablierten Muster folgen — verhaltensbasierte Testnamen, benannte Konstanten, Fixture-Factories. Vorbild: [`src/components/feature/markt/actions.test.ts`](../../src/components/feature/markt/actions.test.ts). **Keine** `toHaveBeenCalledWith`-Assertions auf exakte Prisma-Query-Strukturen.
      _Definition of Done:_ `upcoming.test.ts` grün; ein Refactoring, das die Auswahl kommender Events verändert, lässt mindestens einen Test fehlschlagen.
      `git commit -m "test(events): cover upcoming event selection edge cases"`

- [ ] **8. Tests für die Utils-Parser (#40, Teil 2)**
      Drei Module, die fremde Eingaben parsen — klassische Edge-Case-Quellen:
      • `src/lib/utils/slug.ts` — Umlaute, Sonderzeichen, Leerstring, Kollisionsverhalten
      • `src/lib/utils/search-params.ts` — fehlender Parameter, Mehrfachwerte, ungültiger Wert
      • `src/lib/utils/youtube.ts` — `watch?v=`, `youtu.be/`, `/embed/`, Nicht-YouTube-URL
      Reine Funktionen, kein Mocking nötig.
      _Definition of Done:_ Drei Testdateien grün; jede deckt mindestens die genannten Fälle ab.
      `git commit -m "test(utils): cover slug, search param and youtube parsing"`

- [ ] **9. Tests für die Query-Module (#40, Teil 3)**
      `src/lib/explainer/queries.ts` und `src/lib/inventory/spare-part-listings.ts` — jeweils Happy Path und leeres Ergebnis über den zentralen `prismaMock` aus [`src/lib/__mocks__/prisma.ts`](../../src/lib/__mocks__/prisma.ts). Auf das Rückgabe-**Verhalten** assertieren (Form, Sortierung, Leerfall), nicht auf die Query-Struktur.
      _Definition of Done:_ Beide Testdateien grün; Coverage aus Schritt 6 ist gegenüber dem Baseline-Wert gestiegen. Issue #40 geschlossen.
      `git commit -m "test(lib): cover explainer and spare part listing queries"`

- [ ] **10. Branch-Schutz aktivieren (#36) — zuletzt**
      Bewusst der letzte Schritt: ein aktives Ruleset blockiert die direkten Pushes der Schritte 2–9.
      [`.github/ruleset-protect-main.json`](../../.github/ruleset-protect-main.json) korrigieren — `refs/heads/main` existiert nicht, Ziel ist `refs/heads/develop`. Datei nach `ruleset-protect-develop.json` umbenennen, Feld `name` mitziehen. `required_approving_review_count` bleibt bei `0` (Nutzerentscheidung). `release` bleibt ungeschützt (Nutzerentscheidung).
      **Kritisch:** Den Kontextnamen unter `required_status_checks` gegen den **tatsächlichen Job-Namen** in `ci.yml` prüfen. Der Job heißt aktuell `verify` — stimmt der String nicht, greift der Check stumm nicht und das Ruleset erzeugt falsche Sicherheit.
      Anwenden mit `gh api repos/oecher-meeples/portal/rulesets --method POST --input .github/ruleset-protect-develop.json`.
      Den nun verbindlichen Workflow (Feature-Branch → PR → grüne CI → Merge) in `CLAUDE.md` festhalten.
      _Definition of Done:_ `gh api repos/oecher-meeples/portal/rulesets` liefert einen aktiven Eintrag; ein direkter Push auf `develop` wird nachweislich abgelehnt; ein Test-PR zeigt `verify` als Required Check. Issue #36 geschlossen.
      `git commit -m "chore(ci): protect develop with an active ruleset"`

- [ ] **11. Abschlussbericht**
      Alle mit `[!]` markierten Schritte und alle in Schritt 2/4 neu erstellten Issues sammeln. Endzustand verifizieren: CI grün, Ruleset aktiv, Coverage-Schwelle gesetzt, Issues #35–#40 geschlossen. Dem Nutzer auf Deutsch berichten — was umgesetzt wurde, was fehlgeschlagen ist, welche neuen Issues entstanden sind.
      _Definition of Done:_ Bericht ausgegeben; `gh issue list --label chore` zeigt keine offenen Audit-Issues außer neu entstandenen.
      _Kein Commit._

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Sonnet 5)
- **Reasoning/Thinking:** **an, mittlerer Effort**
- **Begründung:** Der Großteil des Plans ist Konfigurationsarbeit an bekannten Werkzeugen (Prettier, Vitest-Coverage, GitHub Actions, Rulesets) — dafür ist Opus überdimensioniert. Zwei Stellen brauchen aber echtes Urteilsvermögen und rechtfertigen aktives Thinking: Schritt 2 muss zwischen „Formatierung" und „fachlicher Fehler, der in ein eigenes Issue gehört" unterscheiden, und Schritt 6 muss eine Schwelle aus einer Messung ableiten statt zu raten. Schritte 7–9 sind Testentwurf mit Grenzfallanalyse — ebenfalls nicht mechanisch. Haiku wäre hier zu knapp, weil er zu Konfigurationsübernahme ohne Verifikation neigt.
