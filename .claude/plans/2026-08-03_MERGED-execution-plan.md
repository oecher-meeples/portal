# Zusammengeführter Ausführungsplan — Audits 2026-08-03

- **Erstellt:** 2026-08-03
- **Ziel:** Alle vier Audit-Ausführungspläne vom 2026-08-03 (Compliance, Prozess, Security, Code) in einer widerspruchsfreien Reihenfolge abarbeiten, ohne dass sich Schritte gegenseitig blockieren oder denselben Code widersprüchlich ändern.
- **Quellen (Einzelschritte, Findings, Begründungen — hier nicht dupliziert):**
  - [`2026-08-03_AUDIT_COMPLIANCE-execution-plan.md`](2026-08-03_AUDIT_COMPLIANCE-execution-plan.md) — 23 Schritte, Issues #48, #50, #41, #49
  - [`2026-08-03_AUDIT_PROCESS-execution-plan.md`](2026-08-03_AUDIT_PROCESS-execution-plan.md) — 11 Schritte, Issues #35, #39, #37, #38, #40, #36
  - [`2026-08-03_security-audit-execution-plan.md`](2026-08-03_security-audit-execution-plan.md) — 12 Schritte, Issues 1–10 + Epic (F1–F15)
  - [`2026-08-03_PLAN_AUDIT_CODE.md`](2026-08-03_PLAN_AUDIT_CODE.md) — 6 Schritte + Vorbedingung, Issues #42–#47 + Kommentar #28
- **Git-Base-State:** Branch `develop` @ `649681a`, Working Tree clean (bis auf die vier Plan-Dateien selbst).

> Dieser Plan dupliziert keine Finding-Details. Jeder Merge-Schritt verweist per Klammer auf `[Quelle:Schrittnummer]`. Bei Ausführung dort nachschlagen, was genau zu tun ist.

## Warum diese Reihenfolge

1. **CI muss zuerst grün werden** (Prozess #35) — jeder danach folgende Commit verlässt sich auf eine funktionierende Pipeline zur Verifikation.
2. **`verify`-Scope-Angleichung** (Prozess #39) direkt danach, weil sie das Loch schließt, durch das CI überhaupt rot wurde.
3. **Alle direkten `develop`-Pushes der drei anderen Pläne laufen VOR dem Branch-Schutz.** Der Branch-Schutz (Prozess #36) ist bewusst der **letzte Schritt des gesamten Merge-Plans**, nicht nur des Prozess-Teilplans — sonst blockiert er ~70 nachfolgende Commits aus Compliance/Security/Code.
4. **Gemeinsam genutzte Dateien werden je einmal in einem konsolidierten Schritt angefasst**, nicht zweimal getrennt:
   - `package.json`-Dependency-Umbau (Compliance #50 Teil 1 + Security F11/F3/F15) → **Merge-Schritt 8**
   - `fetchIcsFeed` in `calendar.ts` (Code-Audit #46 Teil A + Security F13) → **Merge-Schritt 12**
   - `.github/workflows/ci.yml` wird nacheinander von Prozess (#35,#39,#37,#38) und Security (F14) beschrieben, in dieser Reihenfolge, damit kein Schritt eine Datei überschreibt, die ein späterer Schritt noch braucht.
5. **Riskanteste/urteilsintensive Arbeit** (Auth/Krypto-Pfade, CSP mit Nonce, GDPR-Export-Vollständigkeit) bleibt wie in den Einzelplänen mit Opus-5-Empfehlung markiert.
6. Compliance-Finding L-2 (Instagram-Access-Token Klartext) wird **nicht** im Compliance-Teil behoben, sondern in Merge-Schritt 6 (Security F2) — beide Pläne markieren das bereits so.

## Regeln für die Ausführung (aus allen vier Plänen übernommen, keine Widersprüche)

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- Schichtenregeln aus [`CLAUDE.md`](../../CLAUDE.md) hart erzwungen — `import/no-restricted-paths` nie aufweichen.
- DRY ab der zweiten Kopie; Bausteintabelle in `CLAUDE.md` vor jeder neuen Hilfsfunktion prüfen.
- Max. 400 Zeilen/Datei.
- Unit-Tests für neue Logik, Definition of Done erst mit grünen Tests erfüllt. Ausnahme: rein mechanische Schritte.
- `pnpm run verify` muss vor jedem Commit grün sein.
- **Committe nur selbst geschriebene Dateien** — gezieltes `git add <datei>`, nie `git add .`. Ausnahme: der Formatierungs-Commit in Merge-Schritt 1.
- Blockierende Prozesse (Port 3002, Datei-Locks) dürfen gezielt beendet werden.
- Ein Schritt = ein Commit (Richtwert < 1 h).
- **Kein Secret in einem Commit.** Diff vor jedem Commit an Krypto-/Token-Pfaden gegenlesen.
- Bei Fehlschlag: Teilstand ggf. mit `wip:`-Präfix committen, Schritt mit `[!]` markieren, Fehler notieren, **weitermachen, nicht abbrechen**. Am Ende alle `[!]`-Punkte gesammelt auf Deutsch besprechen.
- Nach jedem Schritt, der ein Issue abschließt: `gh issue close <nr> --comment "…"`. Bei Teilfortschritt `gh issue comment`.
- **Bis Merge-Schritt 27 (Branch-Schutz):** Push direkt auf `develop` erlaubt. **Danach:** Feature-Branch → PR → grüne CI → Merge, für den Rest des Plans (Merge-Schritt 28+).
- Bei jedem Schritt, der laut Quellplan eine Überschneidung mit einem *externen* Issue hat (`#46` Fetch-Timeout, `#47` Env-Validierung — beide nicht Teil dieser vier Pläne), den aktuellen Stand des externen Issues vorher prüfen.

## Schritte

### Phase 0 — Vorbedingungen

- [ ] **1. Repository-Ausgangslage verifizieren** [Prozess:0, Security:0 (Teil), Compliance:0, Code-Audit: Vorbedingung]
      `git status` clean (bis auf die vier unversionierten Plan-Dateien und ggf. den Working-Tree-Stand aus Code-Audit-Vorbedingung — Cover-Media-Extraktion + Polyfill committen oder bewusst verwerfen). Branch `develop`, `git rev-list --count origin/develop..HEAD` == 0. `security`-Label existiert oder wird angelegt.
      _Kein Commit — reiner Prüfschritt._

### Phase 1 — CI-Fundament (Prozess zuerst, alles andere baut darauf auf)

- [ ] **2. CI wieder grün** [Prozess:2] (#35)
- [ ] **3. `verify`/CI-Scope angleichen** [Prozess:3] (#39)

### Phase 2 — Unabhängige Sicherheits-Fixes (kleine, isolierte Dateien)

- [ ] **4. Cron-Endpoint fail-closed** [Security:2] (Issue 1 · F6) — vorher externes Issue #47 prüfen
- [ ] **5. Instagram-OAuth-State + Callback-Berechtigung** [Security:3] (Issue 2 · F7+F9)
- [ ] **6. Instagram-Access-Token verschlüsseln** [Security:4] (Issue 3 · F2) — deckt zugleich Compliance-Finding L-2 ab, dort bewusst ausgeklammert
- [ ] **7. Blob-Upload-Pfad normalisieren + Größenlimit** [Security:5] (Issue 7 · F8)

### Phase 3 — Konsolidierte Shared-File-Schritte

- [ ] **8. `package.json`-Dependency-Baum in einem Rutsch bereinigen** [Compliance:6 + Security:8] (#50 Teil 1 + Issue 5 · F3/F11/F15)
      Reihenfolge innerhalb des Schritts: zuerst `@prisma/client`/`better-auth` → `dependencies` (Compliance:6), danach `shadcn` → `devDependencies` und `sharp`/`postcss`-Bump (Security:8) — beide Teilergebnisse in **einem** Commit, damit `pnpm licenses list --prod` und `pnpm audit` nicht zweimal auf einem Zwischenstand laufen.
      _Definition of Done:_ Beide Quell-DoDs erfüllt; `pnpm run verify` grün; `pnpm audit --audit-level high` nennt `sharp`/`postcss`/`@hono/node-server` nicht mehr.
      `git commit -m "chore(deps): reorganise the production dependency tree"`
- [ ] **9. Lizenz-Prüfung wiederholbar machen** [Compliance:7] (Finding L-1, Methodik)
- [ ] **10. Gast-Action gegen fremde Event-IDs absichern** [Security:6] (Issue 8 · F10)
- [ ] **11. ADR 0005 um Namensumfang ergänzen** — Teil von Merge-Schritt 10, kein eigener Commit falls im selben Schritt erledigt.
- [ ] **12. `fetchIcsFeed` konsolidiert härten: Timeout + Größenlimit + Cookie-Fix** [Code-Audit:4 Teil A + Security:7]
      Ein Commit statt zwei getrennter: `AbortSignal.timeout(8000)` **und** 5-MB-Größenlimit in derselben Funktion, plus `secure: true` auf dem Preview-Tier-Cookie (Security F12, unabhängiges Detail im selben Schritt).
      _Definition of Done:_ Beide Quell-DoDs erfüllt in einem Test-File; `pnpm run verify` grün.
      `git commit -m "fix(content): cap ICS feed size and add fetch timeout"`
- [ ] **13. Übrige Fetch-Timeouts + DB-Indizes** [Code-Audit:4 Teil A (Rest) + Teil B]
      BGG-Client und Instagram-Graph-Client-Timeouts, plus die drei `@@index`-Ergänzungen in einer Migration.

### Phase 4 — Code-Audit, unabhängige Schritte

- [ ] **14. `GameZustandPill` statt Label-/Tone-Map** [Code-Audit:1] (#42)
- [ ] **15. Content-Queries in die DB verlagern** [Code-Audit:2] (#44)
- [ ] **16. `revalidatePath` in Ludothek-Actions** [Code-Audit:3] (#43) — Voraussetzung für Merge-Schritt 17
- [ ] **17. Views auf `useAction()` umstellen** [Code-Audit:5] (#45)
- [ ] **18. Code-Hygiene** [Code-Audit:6] (#47) — `requireEnv`-Helper hier eingeführt, relevant für spätere Env-Guards

### Phase 5 — Compliance: Rechtstexte

- [ ] **19. Rechtstexte** [Compliance:2,3,4,5] (#48) — Export-Zusage entfernen, Datenarten/Rechtsgrundlagen/Speicherdauern, Betroffenenrechte/AV/Cookies, Impressum mit TODO-Markern (`[!]`)
- [ ] **20. AGPL-Kette klären** [Compliance:10,11,12] (#41) — Build, Bundle-Check, ADR + Kommentar an #41. Baut auf dem in Merge-Schritt 8 bereinigten Dependency-Baum auf.
- [ ] **21. THIRD-PARTY-LICENSES.md + Attribution im Portal** [Compliance:8,9] (#50 Teil 2)

### Phase 6 — Compliance: Betroffenenrechte (Opus-5-Kandidat)

- [ ] **22. Datenexport-Query + Vollständigkeitstest + Export-UI** [Compliance:13,14,15,16] (#49)
- [ ] **23. Anonymisierung erweitern (Namensfeld + Blob-Bilder)** [Compliance:17] (#49, M-4 eindeutiger Teil)
- [ ] **24. Freitextfelder als offene Entscheidung an #49 melden** [Compliance:18] (`[!]`, kein Code)
- [ ] **25. Löschantrag im Profilbereich** [Compliance:19] (#49, M-5 Teil 1)
- [ ] **26. Automatische Anonymisierung (deaktiviert) + Bank-CSV-Warnung** [Compliance:20,21] (#49, M-5 Teil 2 + M-6, `[!]` für die Frist)

### Phase 7 — Security: Header/CSP + Vuln-Scan

- [ ] **27. Security-Header + CSP Report-Only** [Security:9] (Issue 4 · F5)

### Phase 8 — Prozess: Build, Coverage, Tests (nutzt `requireEnv` aus Schritt 18 wo passend)

- [ ] **28. `next build` als CI-Schritt** [Prozess:4] (#37)
- [ ] **29. Coverage messen + dokumentieren** [Prozess:5] (#38 Teil 1)
- [ ] **30. Coverage-Schwelle setzen + erzwingen** [Prozess:6] (#38 Teil 2)
- [ ] **31. Tests `lib/events/upcoming.ts`** [Prozess:7] (#40 Teil 1)
- [ ] **32. Tests Utils-Parser** [Prozess:8] (#40 Teil 2)
- [ ] **33. Tests Query-Module** [Prozess:9] (#40 Teil 3)

### Phase 9 — Security: CI-Vuln-Scan (nach dem Dependency-Umbau aus Schritt 8, im selben `ci.yml`-Zustand wie Schritt 28/30)

- [ ] **34. `pnpm audit` + Dependabot in CI** [Security:10] (Issue 6 · F14) — prüft vorher Stand von Prozess-Schritten 28/30, fügt sich in dieselbe `ci.yml` ein

### Phase 10 — Branch-Schutz (LETZTER inhaltlicher Schritt vor dem Abschluss — sperrt danach alle Direkt-Pushes)

- [ ] **35. Branch-Schutz für `develop` aktivieren** [Prozess:10] (#36)
      Ab hier: Feature-Branch → PR → grüne CI → Merge für alles Folgende.

### Phase 11 — Verbleibende Recherche/Doku (läuft bewusst nach dem Branch-Schutz, da reine Recherche/Kommentare ohne Code)

- [ ] **36. Neon-Auth-Klärung recherchieren, kein Code** [Security:11] (Issue 10 · F1+F4, `[!]`, blockiert)

### Abschluss

- [ ] **37. Gesamtprüfung** [Compliance:22]
      `pnpm run verify`, `pnpm run dup`, `pnpm build`. Betroffene Seiten manuell sichten: `/rechtliches/*`, Attributionsseite, Profilbereich, `/admin/bestand`, `/dashboard`, `/dashboard/news`, `/ludothek`, Kalenderansichten, Kamera-Scanner, Markt-Bilder, Admin-Dashboard.
- [ ] **38. Alle Issues schließen, Audit-Berichte mit Umsetzungsstand ergänzen** [Compliance:23, Prozess:11, Security:12, Code-Audit: Abschluss]
      Je Audit-Bericht (`.claude/audits/2026-08-03_AUDIT_*.md`) einen Abschnitt „Stand der Umsetzung" ergänzen. `docs/project-structure.md` aktualisieren, falls neue geteilte Bausteine entstanden sind (`requireEnv`, Export-Query, ICS-Härtung). Alle `[!]`-Punkte aus allen Phasen gesammelt auf Deutsch mit dem Nutzer besprechen — erwartbar offen: Impressum-Daten (19), Freitextfelder-Entscheidung (24), Aufbewahrungsfrist (26), Neon-Auth-Klärung (36).
      _Kein Commit für die Diskussion selbst._

## Empfohlenes Claude-Modell

- **Sonnet 5** für den Großteil (Phasen 1–5, 7–10) — strukturierte, gut umrissene Arbeit an bekannten Werkzeugen und benannten Fundstellen.
- **Opus 5, hoher Effort** für: Merge-Schritt 5 (OAuth-State an Session binden), 6 (Token-Verschlüsselung über alle Pfade), 12 (konsolidierte Fetch-Härtung mit zwei Quell-Anforderungen gleichzeitig), 22 (GDPR-Export-Vollständigkeit über ~15 Modelle), 27 (CSP mit Nonce im App Router).
- Reasoning durchgehend an; Effort gekoppelt an den schwierigsten Schritt der jeweiligen Phase, nicht an den Durchschnitt.

## Risikohinweis vor Ausführung

Dieser Merge-Plan umfasst **~38 Schritte / vermutlich 35–45 Commits**, legt **~30 neue GitHub-Issues** an (11 Security + 6 Prozess + 4 Compliance + 6 Code-Audit + Epics), **verschlüsselt ein produktives Datenfeld** (Instagram-Access-Token, macht bestehende Verbindungen ungültig bis Re-Connect), **aktiviert Branch-Schutz** (blockiert danach jeden direkten Push), und ändert **Rechtstexte einer echten Vereins-Website**. Empfehlung: nach Phase 1–3 (Schritte 1–13) einmal innehalten und Zwischenstand zeigen, bevor die GDPR-/Rechtstext-Phasen (5–6) und der Branch-Schutz (Phase 10) folgen.
