# Ausführungsplan: Implementation Sprint — Issues #96, #106, #98, #97, #104

- **Erstellt/Aktualisiert:** 2026-08-13 00:00
- **Ziel:** Fünf fachlich unabhängige, `ready`-refinierte Issues (Spenden-Gating, News-Interna-Filter, News-Detailbild, ContentCard-Hover, Startseiten-Spielezähler) umsetzen und einzeln committen.
- **Quelle:** `.claude/plans/2026-08-13-implementation-sprint-96-106-98-97-104.md`
- **Git-Base-State:** Branch `feature/ludothek-detail-titelbasis`, HEAD `b8f400cec1fa2d3da7d99945c5b2953c5ecd6e14`

> Details, Anforderungen und Kontext stehen in der Quelldatei — hier nicht duplizieren.

## Persona

Du bist Senior Full-Stack Engineer für ein Next.js/TypeScript/Prisma-Projekt (Vereinsportal "Oecher Meeples") mit strikter Schichtenarchitektur (`src/lib/<domäne>` → `components/ui → entities → widgets → feature → layout`) und Tailwind v4. Du arbeitest DRY, schichtdiszipliniert entlang `CLAUDE.md` und schreibst Unit-Tests für neue Geschäftslogik in `src/lib/**`.

## Getroffene Annahmen

- Repo und Testframework (Vitest) sind bereits vorhanden und funktionsfähig (`pnpm test` → `vitest run`) — Schritt 0/1 aus dem Standard-Template entfallen als eigene Schritte, da nichts einzurichten ist.
- Reihenfolge der Schritte: **#97 → #104 → #96 → #106 → #98** (Nutzerentscheidung, folgt der Empfehlung aus der Quelldatei).
- **#106 Variante:** (a) `CoverMedia` um einen dritten Sizing-Modus erweitern — bevorzugt, da wiederverwendbar und DRY-konform gegenüber einem lokalen `<img>`-Duplikat.
- **#106 Max-Höhe:** `max-h-[70vh]` als Startwert, in der Umsetzung per Screenshot-Check verifizieren/anpassen.
- **Granularität:** 1 Schritt pro Issue (5 Schritte gesamt) — jedes Issue ist laut Einschätzung klein/mittel und passt in den <1h-Richtwert pro Commit.
- Modellempfehlung aus der Quelldatei (durchgängig Sonnet) wird übernommen.
- Nach `issue-refine` sind alle fünf Issues bereits `ready` — keine weitere Rückfrage an GitHub nötig, ACs gelten als bindend und werden nicht dupliziert.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt).
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf die Quelldatei.
- Dateien über 400 Zeilen möglichst in kleinere Dateien aufteilen.
- Erstelle eine passende Ordnerstruktur — Schichtenregeln aus `CLAUDE.md` sind hart einzuhalten (`import/no-restricted-paths`).
- **Unit-Tests:** Für neue Logik/Funktionen Unit-Tests schreiben. Die Definition of Done eines Schritts gilt erst als erfüllt, wenn die zugehörigen Tests grün sind. Ausgenommen sind rein mechanische/nicht-testbare Schritte (Config, Doku, Boilerplate, reine CSS/Layout-Änderungen ohne neue Logik).
- **Committe nur Dateien, die du selbst geschrieben hast** — andere Dateien im Working Directory ignorieren (kein `git add .`, sondern gezieltes `git add <datei>`).
- **Blockierende Prozesse:** Du hast die Erlaubnis, Prozesse zu beenden, die für die Ausführung eines Schritts benötigte Ressourcen blockieren (z. B. einen Port, eine Datei oder einen Lock belegen). Identifiziere den blockierenden Prozess gezielt und beende nur diesen, statt den Schritt abzubrechen.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert: < 1 h Arbeit).
- **Bei Fehlschlag eines Schritts:** prüfen, ob die Definition of Done zumindest teilweise erfüllt ist. Falls ja, den erreichten Teilstand committen (Commit-Message mit Präfix `wip:`); falls nein, nichts committen. In beiden Fällen den Schritt mit `[!]` markieren, den Fehler kurz im Schritt selbst notieren (Stichpunkt unter dem Schritt) und mit dem nächsten Schritt fortfahren — **nicht abbrechen**. Erst nachdem **alle** Schritte durchlaufen wurden (egal ob `[x]` oder `[!]`), alle offenen Punkte/Fehlschläge gesammelt auf Deutsch mit dem Nutzer besprechen.
- Markiere jeden erledigten Schritt mit `[x]`, sobald er abgeschlossen und committet ist.
- Vor jedem Commit: `pnpm run verify` (format:check + typecheck + lint + test) lokal laufen lassen — Regeln aus `CLAUDE.md` "Vor dem Push".

## Schritte

- [x] **1. #97 — Startseite: Spiele-Anzahl im Untertitel an Live-Bestand koppeln**
      Neue Query in `src/lib/ludothek/` (passende bestehende Datei oder neue): `prisma.boardGame.count({ where: { kind: "BOARDGAME" } })`. Abrundungsfunktion (`Math.floor(count / 100) * 100`) direkt daneben in derselben Datei (nur 1 Aufrufer aktuell, nicht nach `lib/utils/format.ts` vorziehen). `src/app/page.tsx` ruft die Query zusätzlich zu den bestehenden Datenabrufen ab und reicht das Ergebnis als Prop an `HomeView` durch. `home-view.tsx:27` ersetzt `"über 600 Spiele"` durch den formatierten String mit dem gerundeten Wert.
      _Definition of Done:_ Unit-Tests für Query + Abrundungsfunktion grün (Coverage-Scope `src/lib/**`), `pnpm run verify` grün, Startseite zeigt den Live-Wert.
      `git commit -m "feat(home): couple game count subtitle to live inventory (#97)"`

- [x] **2. #104 — `/news`: interne Inhalte für Meeples sichtbar machen + Filter-Checkbox**
      Fix in `src/app/news/page.tsx:11-14`: Tier-Check anhand des bereits geladenen `user` ergänzen (Tier-Vergleich analog zu `nav-config.ts`/`lib/auth/session.ts` prüfen und wiederverwenden statt neu zu erfinden), `internal`-Filter nur für Gäste anwenden. Neue Checkbox "Nur interne anzeigen" in `news-browser.tsx`, sichtbar nur für Mitglied-Tier+ über eine `canSeeInternal`-Prop von der Page. Filter-State client-seitig, kombinierbar mit bestehenden Typ-Filtern, kein Server-Roundtrip nötig. Nicht mit #10 (Mini-Kalender-Farbcodierung) verwechseln — nicht anfassen.
      _Definition of Done:_ Unit-Test für den Tier-Check (falls als eigenständige Funktion in `src/lib/**` extrahiert) grün, `pnpm run verify` grün, manuelle Prüfung: Gast sieht keine internen Inhalte/keine Checkbox, Meeple sieht Checkbox + kann filtern.
      `git commit -m "fix(news): show internal content to members and add filter checkbox (#104)"`

- [x] **3. #96 — Support & Spenden: für Gäste ausblenden, PayPal-Button ohne echte Aktion**
      `NavItem`-Typ in `nav-config.ts` um optionales `minTier?: Tier` erweitern. Rendering-/Filterstelle(n) (`sidebar.tsx`, ggf. `downloads.ts`) nutzen `item.minTier ?? group.minTier` für die Sichtbarkeitsprüfung. `src/app/page.tsx` lädt den User analog zu `news/page.tsx` (`getCurrentUser`) und reicht `isLoggedIn`/`user` an `HomeView` durch; `home-view.tsx:90-93` rendert den CTA-Block nur für eingeloggte Nutzer. `spenden-mock-view.tsx`: "Mit PayPal spenden" zeigt bei Klick eine lokale Fehlermeldung "Feature noch nicht implementiert" (einfacher lokaler State, kein `useAction`). "Mitgliedsantrag herunterladen" bleibt unverändert. Direkter Aufruf von `/spenden` bleibt technisch erreichbar (keine Middleware-Sperre).
      _Definition of Done:_ Typecheck/Lint grün, `pnpm run verify` grün, manuelle Prüfung: Gast sieht "Support & Spenden" nicht in der Sidebar und keinen CTA auf der Startseite; PayPal-Klick zeigt Fehlermeldung; Download-Button funktioniert weiterhin.
      `git commit -m "feat(nav): gate donation entry point behind member tier (#96)"`

- [x] **4. #106 — News-Detailseite: Titelbild dynamisch statt festem 21:9-Zuschnitt**
      `cover-media.tsx` um einen dritten Sizing-Modus erweitern (z. B. `sizing="natural"`): kein fixer `aspect-*`-Container, stattdessen `max-h-[70vh]` + `w-auto`/`object-contain`, per Prop aktivierbar, bestehende Aufrufer (`ContentCard` etc.) bleiben unverändert auf dem bisherigen Modus. `post-detail-view.tsx:22` nutzt den neuen Modus statt `aspect="aspect-[21/9]"`.
      _Definition of Done:_ `pnpm run verify` grün, visuelle Prüfung mit Hochformat-, Quadrat- und Breitformat-Testbild (lokale Test-Assets oder Platzhalter-URLs) zeigt kein erzwungenes Letterboxing/Zuschnitt mehr, Max-Höhe `max-h-[70vh]` hält den Titelbereich kompakt.
      `git commit -m "feat(news): render detail cover image at natural aspect ratio (#106)"`

- [x] **5. #98 — ContentCard: größerer Bildausschnitt, Kurztext erst bei Hover**
      Nur `content-card.tsx` ändern (Issue-Vorgabe: `CoverMedia` selbst nicht global verändern, nur per Props/className steuern). Standardzustand: größerer Bildbereich (z. B. `aspect-[4/3]` statt implizitem `aspect-video`), Excerpt ausgeblendet (`hidden group-hover:block`, `group` ist bereits auf dem äußeren `Link` vorhanden). Hover: Bildbereich schrumpft auf `aspect-video`, `fit="contain"` statt `cover`, Excerpt erscheint, `transition-all` für den Aspect-Wechsel — bei Unsicherheit zur Tailwind-v4-Syntax kurz mit dem `tailwind-patterns`-Skill gegenchecken.
      _Definition of Done:_ `pnpm run verify` grün, visuelle Prüfung auf `/` (Newsroom-Sektion) und `/news`: Standardansicht zeigt größeres Bild ohne Excerpt, Hover zeigt Excerpt mit sauberem Übergang.
      `git commit -m "feat(content-card): enlarge default image, reveal excerpt on hover (#98)"`

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Sonnet 5)
- **Reasoning/Thinking:** ein, niedriger bis mittlerer Effort — alle fünf Schritte sind klein bis mittel, ohne Architektur-Trade-offs, aber #96 (Typ-Erweiterung über zwei Schichten) und #106/#98 (CSS-Feinschliff mit Iterationsbedarf) sind nicht rein mechanisch.
- **Begründung:** Deckt sich mit der Einschätzung aus der Quelldatei — kein Bedarf für Opus (keine mehrdeutigen Architekturentscheidungen) oder Haiku (mehr als reines Mechanik-Copy-Paste).
