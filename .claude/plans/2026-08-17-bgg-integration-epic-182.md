# Implementierungsplan: Epic #182 — BGG-Integration

- **Erstellt:** 2026-08-17
- **Branch:** `feature/bgg-integration` (von `develop`, uncommittete Vorarbeit aus #12 bereits enthalten: `src/lib/bgg/client.ts`, `.env.example`, `CLAUDE.md`, `CONTEXT.md`)
- **Scope:** #183, #184, #185, #186, #187, #189 (native Sub-Issues von #182), alle bereits auf `ready` refinement-geprüft, keine offenen Fragen.
- **Modellwahl-Empfehlung (Umsetzung):** **Claude Sonnet 5** für alle 6 Issues. Klar spezifizierte AC (Given/When/Then + Checklisten), etablierte Repo-Patterns (`requireEnv`, `fetchBggGame`-Struktur, Server Actions). Ausnahme: **#187** ist der architektonisch heikelste Schritt (neues Prisma-Modell, Haupt-/Sekundärname-Tausch-Logik, Suchindex-Erweiterung) — hier TDD-first arbeiten (siehe unten) und Diffs vor dem Commit besonders sorgfältig gegen Datenintegrität prüfen; bei Unsicherheit während der Umsetzung auf Opus wechseln, nicht vorsorglich.

## Reihenfolge & Abhängigkeiten

```
#183 (Namenssuche) ──> #186 (Massenimport)
#187 (Alternativnamen) ──> #189 (Diff-Ansicht)
#184 (DeepL-Übersetzung)   — unabhängig
#185 (Deutschsprachiges Video) — unabhängig
```

Empfohlene Bearbeitungsreihenfolge: **#183 → #184 → #185 → #187 → #186 → #189**
(Grund: #186 und #189 brauchen ihre Voraussetzung fertig; #184/#185 dazwischen, weil sie den `BggGameData`-Typ in `client.ts` erweitern, den #186 später nur konsumiert.)

## Pro Issue

### 1. #183 — Namenssuche statt BGG-ID
- Neue Funktion `searchBggGames(query: string)` in [src/lib/bgg/client.ts](../../src/lib/bgg/client.ts), analog zu `fetchBggGame()` (gleiches XML-Parsing, gleicher Fehler-Umgang, `GET /search?query=...&type=boardgame`).
- Dialog `create-board-game-dialog.tsx`: Trefferliste (Titel + Jahr) statt direktem ID-Feld; Auswahl triggert bestehende `previewBggImport(bggId)`. Manuelle ID-Eingabe bleibt als Fallback.
- Test: XML-Fixture für `search`-Response (mehrere Treffer, 0 Treffer).

### 2. #184 — DeepL-Übersetzung
- `DEEPL_API_KEY` in `.env.example` ergänzen, Zugriff über `requireEnv()`.
- Neue Übersetzungsfunktion (DeepL-API) für `description`, angewendet in der Import-Vorschau.
- Feste Mechaniken-Übersetzungstabelle in `src/lib/ludothek/` (Fallback: englischer Originalbegriff).
- Übersetzter Text bleibt vor dem Anlegen editierbar (bestehendes Formularmuster wiederverwenden, kein neues Edit-UI-Pattern erfinden).

### 3. #185 — Deutschsprachiges Regelvideo
- `selectExplainerVideoUrl()` in [client.ts:126](../../src/lib/bgg/client.ts#L126) ersetzen durch Funktion, die **alle** `category="instructional"` + `language="German"`-Videos liefert (nicht nur eines) — API liefert nur ein 15er-Fenster, das ist eine dokumentierte Grenze, keine Regression.
- UI: bei mehreren Treffern Auswahlliste (Titel + Kanal), bei einem Treffer trivial übernehmbar, bei keinem Fallback auf bisheriges Verhalten (erstes instruktives Video beliebiger Sprache) oder leer mit manueller URL-Eingabe.
- Bekannte Grenze (nur ~15 aktuellste Videos sichtbar) in Code-Kommentar + ggf. `docs/` dokumentieren.

### 4. #187 — Alternativnamen (Schema + Admin-UI)
- Prisma-Migration: neues Modell `BoardGameAlternateName` (1:n zu `BoardGame`: `id`, `boardGameId`, `name`, optionales `note`), plus `BoardGame.secondaryAlternateNameId String? @unique`.
- BGG-Import befüllt die Liste ungefiltert aus allen `name type="alternate"`-Einträgen.
- Server Actions: "Als Hauptname übernehmen" (Wertetausch `BoardGame.title` ↔ gewählte Zeile, Slug bleibt unverändert), "Als Sekundärname markieren", Löschen, manuell Anlegen.
- Suche (`matchesAdminBestandSearch`, öffentliche Ludothek-Suche) erweitern: Titel + alle Alternativnamen.
- Anzeige: Titel + Sekundärname (falls gesetzt) auf Detailseite.
- **TDD-first:** Wertetausch-Logik und Migration zuerst mit Tests absichern (Datenintegrität bei gleichzeitigem Haupt-/Sekundärname-Wechsel).

### 5. #186 — Massenimport
- Baut auf #183 auf. UI: Namensliste eingeben (`games:manage`-Berechtigung).
- Namensauflösung: `search?...&exact=1` — genau 1 Treffer → automatisch übernommen; 0 oder >1 Treffer → Zeile in Review-Liste.
- Sequentieller Import, gedrosselt auf max. 2 Anfragen/Sekunde (z. B. einfacher `setTimeout`-Drossel-Helper, kein neuer Dependency-Bedarf).
- Duplikat-Erkennung über `bggId @unique` (bereits im Schema vorhanden).
- Ergebnisübersicht (importiert/übersprungen/fehlgeschlagen) nach Abschluss.

### 6. #189 — BGG-Abgleich-Diff-Ansicht
- Baut auf #187 auf (Titel-Vergleich gegen alle BGG-Namen, nicht nur `primary`).
- "Daten mit BGG abgleichen"-Button im Titel-Editor, lädt aktuelle BGG-Daten zum Vergleich.
- Drei-Farben-Schema: Grün (identisch/Titel matcht irgendeinen BGG-Namen), Gelb (weicht ab, vorhanden), Rot (leer, obwohl BGG einen Wert liefert).

## Vor dem Push (pro Issue, aus `CLAUDE.md`)

`pnpm run verify` (format:check + typecheck + lint + test) vor jedem Merge/PR. Datei-Obergrenze 400 Zeilen beachten (bei #187 ggf. `board-games.ts` weiter aufteilen wie `holdings.ts`/`holdings-lookup.ts`). Coverage-Scope: `src/lib/**` + `src/components/**/actions.ts`.

## Board-Status

Alle 6 Issues stehen aktuell auf `ready` im Projects-v2-Board (Status-Feld-ID `PVTSSF_lADOCJfCSs4BertCzhZEEz0`, Options-IDs siehe `.claude/project-board.json`). Pro Issue **während der Umsetzung** (nächste Session) explizit setzen, nicht nur am Ende in einem Rutsch:

1. **Bei Beginn der Arbeit an einem Issue** → Status `In progress` (`47fc9ee4`).
2. **Sobald der PR für das Issue offen ist** → Status `In review` (`df73e18b`).
3. **Nach Merge** → Status `Done` (`98236657`).

Projekt-Item-IDs (einmalig ermittelt, für die Mutation):

| Issue | Item-ID |
|---|---|
| #183 | `PVTI_lADOCJfCSs4BertCzg2zeBY` |
| #184 | `PVTI_lADOCJfCSs4BertCzg2zeUI` |
| #185 | `PVTI_lADOCJfCSs4BertCzg2zero` |
| #186 | `PVTI_lADOCJfCSs4BertCzg2zfJ4` |
| #187 | `PVTI_lADOCJfCSs4BertCzg2zfLs` |
| #189 | `PVTI_lADOCJfCSs4BertCzg2zipU` |

Mutation-Vorlage (Projekt-Node-ID `PVT_kwDOCJfCSs4BertC`):

```bash
gh api graphql -f query='
mutation($item: ID!, $option: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwDOCJfCSs4BertC"
    itemId: $item
    fieldId: "PVTSSF_lADOCJfCSs4BertCzhZEEz0"
    value: { singleSelectOptionId: $option }
  }) { projectV2Item { id } }
}' -f item=<Item-ID> -f option=<Options-ID>
```

Epic #182 selbst bleibt unangetastet — sein Status wird nicht automatisch aus den Sub-Issues abgeleitet (siehe Hinweis zu Epic-Sonderfeldern in der Skill-Doku).
