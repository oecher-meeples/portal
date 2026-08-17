---
name: quick-sprint
description: Arbeitet einen Batch offener GitHub-Issues (ready) im aktuellen Repo direkt ab — ein Feature-Branch, pro Issue In progress → Umsetzung → In review, dann Stop für Nutzer-Review vor jedem Commit. Nach Go: Commit + Done + nächstes Issue. Nach dem letzten Issue: Stop für Push/PR/Merge-Go, danach zurück auf den Default-Branch inkl. Pull. Dynamisch — holt Issues/Spalten live per `gh`, hardcodiert nichts.
command: /quick-sprint
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent, Skill, TodoWrite, AskUserQuestion
---

# Quick Sprint

Direkter Umsetzungs-Loop über einen Batch von Issues — im Unterschied zu `implementation-sprint` (das nur plant und vor der Umsetzung stoppt) implementiert `quick-sprint` jedes Issue sofort und commitet erst nach explizitem Nutzer-Go.

## Parameter (bei Aufruf entgegennehmen, fehlende nachfragen statt raten)

- **Scope** (Pflicht): Liste konkreter Issue-Nummern. Kein Auto-Fetch von "ready"-Issues ohne Nachfrage — wenn der Nutzer keine Nummern nennt, `gh issue list --state open --label ready` vorschlagen und die Auswahl bestätigen lassen, nicht selbst entscheiden.
- **Branch**: Default `neu` — neuer Branch vom Default-Branch des Repos (`gh repo view --json defaultBranchRef` bzw. `git symbolic-ref refs/remotes/origin/HEAD`). Branchname: `feature/<kurz-domain>-<issue-nummern durch "-">`, z. B. `feature/lfg-markt-admin-145-108-110`. Falls der Nutzer explizit "im aktuellen Branch weiter" sagt, diesen Schritt überspringen.
- **TODO.md**: falls `.claude/TODO.md` existiert und dem in `CLAUDE.md` beschriebenen Format folgt, den Batch dort als Checkliste unter der passenden Domain-Überschrift führen/aktualisieren (Metadatenblock: Created/Updated, Context/Goal, Git Base State). Existiert keine, keine anlegen, außer der Nutzer bittet explizit darum.

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
2. Branch anlegen (falls `neu`).
3. **Pro Issue, in der angegebenen Reihenfolge:**
   a. Issue-Details lesen (`gh issue view <n> --json title,body,labels`).
   b. Board-Status → **In progress** (GraphQL `updateProjectV2ItemFieldValue`).
   c. Umsetzen — Architektur-/Style-Vorgaben aus `CLAUDE.md` beachten (Schichten, DRY, Dateigrößen, existierende Bausteine wiederverwenden).
   d. Vor dem Commit: Board-Status → **In review**. `.claude/TODO.md`-Checkbox NICHT abhaken (erst nach Commit).
   e. **Stop.** Änderungen liegen ungecommittet vor — auf explizites Go des Nutzers warten. Kein automatischer Commit, keine automatische Weiterarbeit am nächsten Issue.
   f. Nach Go: `pnpm run verify` falls noch nicht sauber, dann committen (Conventional-Commit-Message, `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`). Board-Status → **Done**. `.claude/TODO.md`-Checkbox abhaken. Mit dem nächsten Issue im Scope fortsetzen (zurück zu 3a).
4. **Nach dem letzten Issue: Stop.** Auf explizites Go für Push + PR + Merge warten.
5. Nach Go: `git push -u origin <branch>`, `gh pr create` (Base = Default-Branch), PR mergen mit `gh pr merge --merge` — **niemals `--squash`** (verbindlich für dieses Repo, siehe Nutzer-Feedback vom 2026-08-14: Squash zerstört die pro-Issue-Commit-Historie eines Batches). Self-Merge ist laut `CLAUDE.md` erlaubt. Danach `git checkout <default-branch>` und `git pull`.

## Wichtig

- Niemals mehrere Issues in einem Rutsch committen — ein Commit-Review-Zyklus pro Issue, auch wenn der Nutzer "mach einfach alle" sagt; dann kurz nachfragen, ob die Stop-Punkte trotzdem gewünscht sind.
- Der Board-Status **In review** wird immer gesetzt, bevor der Stop-Punkt erreicht wird — nicht erst nach dem Go.
- Ein Feld/eine Option speziell für Epics (z. B. `Epics`-Option) nie automatisiert überschreiben.
- Branch-Schutzregeln des Repos beachten (z. B. `develop` per Ruleset geschützt) — nie direkt auf den geschützten Default-Branch pushen.
