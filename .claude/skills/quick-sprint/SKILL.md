---
name: quick-sprint
description: Arbeitet einen Batch offener GitHub-Issues (ready) im aktuellen Repo direkt ab — ein Feature-Branch, pro Issue In progress → Umsetzung → In review, dann Stop für Nutzer-Review vor jedem Commit. Nach Go: Commit + Done + nächstes Issue. Nach dem letzten Issue: Stop für Push/PR/Merge-Go, danach zurück auf den Default-Branch inkl. Pull. Persistiert Fortschritt in einer Plandatei unter `.claude/plans/`, damit der Kontext zwischen den Stop-Punkten geleert werden kann — jeder Stop gibt einen Copy-Paste-Fortsetzungsbefehl aus. Dynamisch — holt Issues/Spalten live per `gh`, hardcodiert nichts.
command: /quick-sprint
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent, Skill, TodoWrite, AskUserQuestion
---

# Quick Sprint

Direkter Umsetzungs-Loop über einen Batch von Issues — im Unterschied zu `implementation-sprint` (das nur plant und vor der Umsetzung stoppt) implementiert `quick-sprint` jedes Issue sofort und commitet erst nach explizitem Nutzer-Go.

Der Ablauf ist bewusst für geleerten Kontext zwischen den Stop-Punkten ausgelegt: der komplette Fortschritt (Branch, Issues, Status je Issue) lebt in einer Plandatei unter `.claude/plans/`, nicht im Gesprächsverlauf. Jeder Stop-Punkt gibt einen fertigen Fortsetzungsbefehl zum Kopieren aus.

## Aufruf-Modi

- **Start**: `/quick-sprint <issue-nummern...>` — legt Branch + Plandatei neu an.
- **Fortsetzen**: `/quick-sprint --continue <pfad-zur-plandatei>` — liest die Plandatei, checkt den dort vermerkten Branch aus, ermittelt aus dem Status je Issue, wo weitergemacht wird. Keine Rückfrage nach Scope/Branch nötig, steht in der Datei.

## Parameter (bei Start entgegennehmen, fehlende nachfragen statt raten)

- **Scope** (Pflicht): Liste konkreter Issue-Nummern. Kein Auto-Fetch von "ready"-Issues ohne Nachfrage — wenn der Nutzer keine Nummern nennt, `gh issue list --state open --label ready` vorschlagen und die Auswahl bestätigen lassen, nicht selbst entscheiden.
- **Branch**: Default `neu` — neuer Branch vom Default-Branch des Repos (`gh repo view --json defaultBranchRef` bzw. `git symbolic-ref refs/remotes/origin/HEAD`). Branchname: `feature/<kurz-domain>-<issue-nummern durch "-">`, z. B. `feature/lfg-markt-admin-145-108-110`. Falls der Nutzer explizit "im aktuellen Branch weiter" sagt, diesen Schritt überspringen.
- **TODO.md**: falls `.claude/TODO.md` existiert und dem in `CLAUDE.md` beschriebenen Format folgt, den Batch dort als Checkliste unter der passenden Domain-Überschrift führen/aktualisieren (Metadatenblock: Created/Updated, Context/Goal, Git Base State). Existiert keine, keine anlegen, außer der Nutzer bittet explizit darum.

## Plandatei

Pfad: `.claude/plans/<branch-name>.md` (Slashes im Branchnamen durch `-` ersetzen). Dient zwei Zwecken: Ausführungsplan **und** persistenter Fortschritts-Status je Issue, damit eine fortgesetzte Session ohne Gesprächsverlauf weiß, wo sie steht.

```markdown
---
branch: feature/lfg-markt-admin-145-108-110
created: 2026-08-19
issues:
  145: { status: pending }
  108: { status: pending }
  110: { status: pending }
---

# Plan: <kurzbeschreibung>

## Issue #145 — <titel>
<geplante Umsetzung, betroffene Dateien/Schichten>

## Issue #108 — <titel>
...
```

`status` je Issue: `pending` → `in-progress` → `in-review` → `feedback` (nach erster Rückmeldung, vor Abschluss-Commit) → `done`. Wird bei **jedem** Statuswechsel (Board **und** Plandatei) synchron aktualisiert — die Plandatei ist die Quelle der Wahrheit beim Fortsetzen, nicht die Erinnerung an das letzte Gespräch.

## Voraussetzungen und Projekt-Discovery

Wie in `implementation-sprint` beschrieben — nichts hardcodieren, pro Repo zur Laufzeit ermitteln, `.claude/project-board.json` als Cache nutzen/anlegen:

1. `gh auth status` prüfen (Scope `project` nötig, sonst `gh auth refresh -h github.com -s project`).
2. Repo: `gh repo view --json nameWithOwner`.
3. Board: `.claude/project-board.json` lesen falls vorhanden, sonst `gh project list --owner <owner>` — bei Mehrfachtreffern nachfragen.
4. Status-Feld + Options-IDs **immer per direkter GraphQL-Query verifizieren** (`gh project field-list` unterschlägt manchmal Optionen):

```bash
gh api graphql -f query='
query($owner:String!, $number:Int!) {
  organization(login:$owner) { projectV2(number:$number) {
    id
    fields(first:20) { nodes { ... on ProjectV2SingleSelectField { id name options { id name } } } }
  } }
}' -f owner=<owner> -F number=<projekt-nummer>
```

(Bei User- statt Org-Projekt `organization(login:...)` → `user(login:...)`.)

5. Für jedes Issue im Scope die Projekt-Item-ID ermitteln:

```bash
gh api graphql -f query='
query($owner:String!, $name:String!, $n:Int!) {
  repository(owner:$owner, name:$name) {
    issue(number:$n) { projectItems(first:5) { nodes { id project { number } } } }
  }
}' -f owner=<owner> -f name=<repo> -F n=<issue-nummer>
```

6. Cache in `.claude/project-board.json` aktualisieren/anlegen, wenn er fehlt oder abweicht.

## Ablauf

1. **Scope + Branch klären** (siehe Parameter oben). Bei Mehrdeutigkeit zwischen genannten Issues und ihrer erwarteten Kategorie (z. B. Nutzer nennt eine Domain-Überschrift, die Issues gehören aber zu anderen Domains) — kurz per `AskUserQuestion` bestätigen lassen statt stillschweigend zu übernehmen.
2. Branch anlegen (falls `neu`), Plandatei nach obigem Schema anlegen und committen (`chore(plan): Ausführungsplan für #<issues>`).
3. **Pro Issue, in der angegebenen Reihenfolge:**
   a. Issue-Details lesen (`gh issue view <n> --json title,body,labels`).
   b. Board-Status → **In progress**, Plandatei-Status → `in-progress`.
   c. Umsetzen — Architektur-/Style-Vorgaben aus `CLAUDE.md` beachten (Schichten, DRY, Dateigrößen, existierende Bausteine wiederverwenden). **Bei größeren Issues sind zwischendurch mehrere Commits erlaubt**, um einzelne fertige Teilelemente getrennt zu sichern (normale Conventional-Commit-Messages, kein "Fix:"-Präfix — das ist der Feedback-Runde vorbehalten, siehe unten).
   d. Vor dem letzten Umsetzungs-Commit: Board-Status → **In review**, Plandatei-Status → `in-review`. `.claude/TODO.md`-Checkbox NICHT abhaken (erst nach Abschluss-Commit in Schritt f).
   e. **Stop.** Ausgabe: Zusammenfassung der Änderungen + der Fortsetzungsbefehl zum Kopieren:
      ```
      /quick-sprint --continue .claude/plans/<branch-name>.md
      ```
      Auf explizites Feedback oder "Finish" des Nutzers warten. Kein automatischer Commit über den letzten Umsetzungs-Commit hinaus, keine automatische Weiterarbeit am nächsten Issue.
   f. **Bei Feedback statt Finish:** Plandatei-Status → `feedback`. Änderungen umsetzen, aber **nicht committen** — Korrekturen bleiben ungecommittet, egal wie viele Feedback-Runden es braucht. Nach jeder Runde wieder **Stop** mit demselben Fortsetzungsbefehl, bis der Nutzer "Finish" für dieses Issue sagt. Damit entsteht maximal ein zusätzlicher Commit pro Issue für die gesamte Feedback-Runde, nicht einer pro Fix.
   g. **Bei Finish:** `pnpm run verify`, dann committen — bei reiner Erstumsetzung ohne Feedback wie gehabt, bei vorheriger Feedback-Runde ein einzelner zusätzlicher Commit (z. B. `fix(<scope>): Review-Feedback zu #<issue>`, `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`). Board-Status → **Done**, Plandatei-Status → `done`. `.claude/TODO.md`-Checkbox abhaken. Mit dem nächsten Issue im Scope fortsetzen (zurück zu 3a). Falls das nicht das letzte Issue ist, ebenfalls den Fortsetzungsbefehl ausgeben, sodass der Nutzer bei Bedarf hier schon den Kontext leeren kann.
4. **Nach dem letzten Issue:** Plandatei löschen und committen (`chore(plan): Ausführungsplan für #<issues> entfernt`) — der Plan ist mit "Done" für alle Issues erledigt, keine Notwendigkeit ihn im Repo zu behalten. Dann **Stop.** Ausgabe: Zusammenfassung + Fortsetzungsbefehl für den Merge-Schritt:
   ```
   /quick-sprint --continue .claude/plans/<branch-name>.md --merge
   ```
   (Plandatei existiert zu diesem Zeitpunkt nicht mehr — Merge-Schritt anhand des Branchnamens im Befehl selbst erkennen, nicht anhand der Datei.) Auf explizites Go für Push + PR + Merge warten.
5. Nach Go: `git push -u origin <branch>`, `gh pr create` (Base = Default-Branch), PR mergen mit `gh pr merge --merge` — **niemals `--squash`** (verbindlich für dieses Repo, siehe Nutzer-Feedback vom 2026-08-14: Squash zerstört die pro-Issue-Commit-Historie eines Batches). Self-Merge ist laut `CLAUDE.md` erlaubt. Danach `git checkout <default-branch>` und `git pull`.

## Wichtig

- Niemals mehrere Issues in einem Rutsch committen — ein Commit-Review-Zyklus pro Issue, auch wenn der Nutzer "mach einfach alle" sagt; dann kurz nachfragen, ob die Stop-Punkte trotzdem gewünscht sind.
- Der Board-Status **In review** wird immer gesetzt, bevor der Stop-Punkt erreicht wird — nicht erst nach dem Go.
- **Feedback-Runden nie einzeln committen.** Nur der Übergang in "Finish" darf einen (einzigen) zusätzlichen Commit für alle gesammelten Feedback-Fixes eines Issues erzeugen — sonst entstehen mehrere "Fix:"-Commits pro Issue, die die Historie unnötig aufblähen.
- Zwischen-Commits während der Erstumsetzung sind nur für die Umsetzungsphase gedacht (Schritt 3c), nicht für die Feedback-Runde (Schritt 3f).
- Jeder Stop-Punkt gibt den Fortsetzungsbefehl aus, auch wenn der Nutzer wahrscheinlich sofort mit "Go"/"Finish" antwortet — der Nutzer entscheidet, ob er den Kontext dafür leert.
- Die Plandatei ist die Quelle der Wahrheit für den Fortsetzungs-Status, nicht der Gesprächsverlauf. Bei `--continue` immer zuerst die Plandatei lesen und den Branch entsprechend auschecken, bevor irgendetwas anderes passiert.
- Ein Feld/eine Option speziell für Epics (z. B. `Epics`-Option) nie automatisiert überschreiben.
- Branch-Schutzregeln des Repos beachten (z. B. `develop` per Ruleset geschützt) — nie direkt auf den geschützten Default-Branch pushen.
