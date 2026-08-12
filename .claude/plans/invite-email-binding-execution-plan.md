# Ausführungsplan: Einladungs-Feature — gebundene & ungebundene Einladungen

- **Erstellt/Aktualisiert:** 2026-08-12 18:25
- **Ziel:** Einladungen können optional an eine E-Mail gebunden (einmal
  einlösbar) oder ungebunden (mehrfach einlösbar bis Ablauf) sein, inkl.
  Such-/Filterleisten, Copy-/Mailto-Aktionen, "Verlängern" und konsistentem
  Button-Look auf der Mitglieder-/Einladungsseite.
- **Quelle:** `.claude/plans/invite-email-binding.md`
- **Git-Base-State:** Branch `fix/password-validation-und-login-fehler`,
  HEAD `51229e4e3cb5cc375d7d2ff853d68d6889cdde25`

> Details, Anforderungen und alle Entscheidungen stehen in der Quelldatei —
> hier nicht duplizieren, nur referenzieren.

## Persona

Du bist Senior Full-Stack Engineer für dieses Next.js/TypeScript-Projekt mit
Prisma/PostgreSQL (Neon) und einer strikt geschichteten DDD-Architektur
(`src/lib/<domäne>/` für Geschäftsregeln, `src/components/ui → entities →
widgets → feature → layout` für UI). Du arbeitest testgetrieben mit Vitest,
hältst dich strikt an die Schichtgrenzen aus `CLAUDE.md` und schreibst
Server-Actions-Code, der sowohl aus Server- als auch Client-Komponenten
sauber gebunden werden kann.

## Getroffene Annahmen

- Das Arbeitsverzeichnis enthält **bereits unstaged Änderungen aus
  vorheriger Arbeit** (u. a. an `invites.ts`, `invite-actions.ts`,
  `admin-mitglieder-view.tsx`, `register-form.tsx`, `registrieren/actions.ts`
  sowie die neue, noch unangewendete Migration `20260812164858_invite_tracking`,
  die bereits gegen die Dev-DB gelaufen ist). Das ist die korrekte
  Ausgangsbasis für diesen Plan — **nicht verwerfen, nicht zurücksetzen**.
  Nicht verwandte Änderungen (`.env.example`, `login-form.tsx`, `password.ts`,
  `format.ts`) unberührt lassen, sie gehören zu anderer, paralleler Arbeit auf
  diesem Branch.
- Alle inhaltlichen Entscheidungen (Datenmodell, Verhalten, UI, Icons,
  Wording-Freiheit) stehen abschließend in der Quelldatei — dort steht auch
  "Plan ist vollständig durchgegrillt und freigegeben". Bei Unklarheiten beim
  Umsetzen gilt die Quelldatei als Referenz, nicht Rückfragen an den Nutzer.
- Testframework ist bereits Vitest (`vitest.config.ts` vorhanden,
  Coverage-Scope beschränkt auf `src/lib/**` und `src/components/**/actions.ts`
  — UI-Komponenten sind bewusst ausgenommen, dafür sind keine Komponenten-Tests
  nötig).
- Git-Historie: pro Schritt ein Commit, **nur** die für diesen Schritt
  relevanten Dateien gezielt stagen (`git add <datei>`), nie `git add .`.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben (Server-Action-Fehlermeldungen,
  UI-Texte) auf Deutsch — passend zum Rest des Repos.
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling
  doppelt) sowie an die Schicht-Import-Regeln aus `CLAUDE.md`.
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf die
  Quelldatei.
- Dateien über 400 Zeilen (ESLint `max-lines`) möglichst entlang der
  Fachlichkeit aufteilen, nicht mechanisch abschneiden.
- **Unit-Tests:** Für neue Logik in `src/lib/**` und `src/components/**/actions.ts`
  Vitest-Tests schreiben. Definition of Done eines Schritts gilt erst als
  erfüllt, wenn die zugehörigen Tests grün sind. UI-Komponenten
  (`invite-form.tsx`, Tabellen, Dialoge) sind laut Coverage-Scope
  ausgenommen — dafür reicht ein erfolgreicher Build/Typecheck/Lint.
- **Committe nur Dateien, die du selbst für diesen Schritt geschrieben/geändert
  hast** — andere unstaged Dateien im Working Directory unberührt lassen.
- **Blockierende Prozesse:** Erlaubnis, Prozesse zu beenden, die benötigte
  Ressourcen blockieren (z. B. einen Dev-Server auf einem Port). Gezielt nur
  den blockierenden Prozess beenden.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert < 1 h Arbeit).
- **Bei Fehlschlag eines Schritts:** prüfen, ob die Definition of Done
  zumindest teilweise erfüllt ist. Falls ja, Teilstand committen (Präfix
  `wip:`); falls nein, nichts committen. In beiden Fällen Schritt mit `[!]`
  markieren, Fehler kurz notieren, mit dem nächsten Schritt fortfahren — nicht
  abbrechen. Nach Durchlauf aller Schritte alle offenen Punkte gesammelt auf
  Deutsch mit dem Nutzer besprechen.
- Markiere jeden erledigten Schritt mit `[x]`, sobald abgeschlossen und
  committet.
- Vor jedem Commit: `pnpm run format:check && pnpm run typecheck && pnpm run lint`
  für die geänderten Bereiche laufen lassen (spätestens komplett in Schritt 14).

## Schritte

- [x] **0. Repository-Zustand verifizieren**
      Prüfen: Git-Repo vorhanden (`git status`), aktueller Branch/HEAD wie oben
      dokumentiert, unstaged Änderungen wie in den Annahmen beschrieben
      vorhanden und unverändert.
      _Definition of Done:_ `git status` läuft fehlerfrei, Branch/HEAD
      bestätigt. Kein Commit nötig (keine Änderung vorgenommen).

- [x] **1. Testframework verifizieren**
      Prüfen: Vitest ist konfiguriert (`vitest.config.ts`), `pnpm run test`
      läuft durch (Stand vor diesem Feature).
      _Definition of Done:_ `pnpm run test` läuft ohne Setup-Fehler durch.
      Kein Commit nötig (keine Änderung vorgenommen).

- [x] **2. Datenmodell: `email`/`expiresIn` + neue Migration**
      Gemäß Quelldatei Abschnitt 1: `Invite.email String?` und
      `Invite.expiresIn Int` in `prisma/schema.prisma` ergänzen (inkl.
      Modell-Kommentar zur Zweiteilung gebunden/ungebunden). Neue Migration
      `prisma/migrations/<timestamp>_invite_email_binding/migration.sql`
      exakt nach dem SQL aus der Quelldatei (Abschnitt 1) — löscht die 3
      Bestandszeilen, fügt beide Spalten hinzu. `prisma generate` ausführen.
      **Wichtig:** dies löscht reale Zeilen in der Dev-DB — das ist laut
      Quelldatei beabsichtigt, keine Rückfrage nötig.
      _Definition of Done:_ `pnpm exec prisma migrate dev` (oder Äquivalent)
      wendet die neue Migration an, `pnpm run typecheck` fehlerfrei.
      `git add prisma/schema.prisma prisma/migrations/<neue-migration>/`
      `git commit -m "feat: add optional email and expiresIn offset to Invite model"`

- [x] **3. `src/lib/members/invites.ts`: Kernlogik erweitern**
      Gemäß Quelldatei Abschnitt 2: `InviteRow` um `email: string | null` und
      `expiresIn: number` erweitern, `listInvites()` anpassen,
      `findOpenInviteByEmail(email)`, `daysToMinutes`, `computeExpiresAt`,
      Konstanten `MAX_INVITE_DAYS`, `DEFAULT_BOUND_DAYS`,
      `DEFAULT_UNBOUND_DAYS` ergänzen. `inviteStatus`/`validateInviteToken`
      bleiben unverändert. `invites.test.ts`: `BASE_INVITE`-Fixture um
      `email: null`, `expiresIn` ergänzen, neue Tests für `daysToMinutes`
      (Rundung, z. B. 2,5 Tage → 3600 Minuten) und `computeExpiresAt`.
      _Definition of Done:_ `pnpm run test src/lib/members/invites.test.ts`
      grün.
      `git add src/lib/members/invites.ts src/lib/members/invites.test.ts`
      `git commit -m "feat: support unbound invites and configurable validity in invites lib"`

- [x] **4. `invite-actions.ts`: `createInvite`/`extendInvite`**
      Gemäß Quelldatei Abschnitt 3: `createInvite({ email, days })` mit
      Tage-Validierung (> 0, ≤ 183), E-Mail-Normalisierung (lowercase),
      Duplikat-Erkennung via `findOpenInviteByEmail` + automatischer
      Verlängerung (gleicher Token, `extended: true` im Rückgabewert),
      gemeinsame `applyExpiresIn`-Hilfsfunktion, exportierte
      `extendInvite(id)` für den "Verlängern"-Button. `revokeInvite`
      unverändert. Wo sinnvoll containerisierte reine Logik (Tage-Validierung,
      E-Mail-Normalisierung) in eigene, testbare Funktionen auslagern (ggf. in
      `invites.ts`, siehe Schicht-Regel: Server Actions dürfen Query-/
      Formatierungslogik aus `lib/` importieren).
      _Definition of Done:_ `pnpm run typecheck` fehlerfrei; falls die
      ausgelagerten reinen Funktionen einen eigenen Test bekommen, dieser
      grün.
      `git add src/components/feature/admin-mitglieder/invite-actions.ts`
      `git commit -m "feat: extend invites on duplicate email and add extendInvite action"`

- [x] **5. `registrieren/actions.ts`: `redeemInvite` E-Mail-Bindung**
      Gemäß Quelldatei Abschnitt 4: E-Mail-Abgleich (case-insensitiv) nur bei
      `invite.email !== null`, sonst überspringen. `redeemedAt` in der
      Transaktion nur bei gebundenen Einladungen setzen. Neue Tests: gebunden
      + falsche E-Mail → Fehler; gebunden + andere Schreibweise, gleiche
      Adresse → Erfolg; ungebunden + beliebige E-Mail → Erfolg, `redeemedAt`
      bleibt `null`.
      _Definition of Done:_ neue/angepasste Tests für `redeemInvite` grün.
      `git add src/components/feature/registrieren/actions.ts src/components/feature/registrieren/actions.test.ts`
      `git commit -m "feat: enforce email binding only for bound invites in redeemInvite"`

- [x] **6. `components/ui/copy-button.tsx`: neuer Baustein**
      Gemäß Quelldatei Abschnitt 6: `<CopyButton value label icon>` kapselt
      `navigator.clipboard.writeText` + kurzes Erfolgs-Feedback,
      `variant="outline"`. Fachfrei, gehört nach `components/ui/`.
      _Definition of Done:_ `pnpm run typecheck` und `pnpm run lint`
      fehlerfrei (UI-Komponente, kein Pflicht-Unit-Test laut Coverage-Scope).
      `git add src/components/ui/copy-button.tsx`
      `git commit -m "feat: add reusable CopyButton component"`

- [x] **7. Button-Look-Pass (unabhängig vom Rest des Features)**
      Gemäß Quelldatei Abschnitt 5, Punkt „Button-Look-Pass": in
      `admin-mitglieder-view.tsx` "Kündigung widerrufen" von `ghost` auf
      `outline` + `RotateCcw`-Icon; in `resign-membership-dialog.tsx` Trigger
      von `ghost` auf `destructive` + `UserMinus`-Icon; in
      `anonymise-meeple-dialog.tsx` die hand-gerollte `DESTRUCTIVE_OUTLINE`-
      Klasse entfernen und durch `variant="destructive"` + `ShieldOff`-Icon
      ersetzen.
      _Definition of Done:_ `pnpm run typecheck` und `pnpm run lint`
      fehlerfrei, betroffene Buttons visuell konsistent (roter Look für
      destruktiv, keine Custom-Klassen mehr für Farbgebung).
      `git add src/components/feature/admin-mitglieder/admin-mitglieder-view.tsx src/components/feature/admin-mitglieder/resign-membership-dialog.tsx src/components/feature/admin-mitglieder/anonymise-meeple-dialog.tsx`
      `git commit -m "refactor: use destructive/outline button variants instead of custom classes"`

- [x] **8. `invite-form.tsx`: Checkbox, Tage-Feld, volle Breite**
      Gemäß Quelldatei Abschnitt 6: Checkbox „Ungebundene Einladung (mehrfach
      nutzbar, keine E-Mail-Bindung)" blendet E-Mail-Feld aus/deaktiviert es;
      neues Zahlenfeld „Gültigkeit (Tage)" mit reaktivem Default (1 bzw. 7),
      `max=183`; Layout auf volle Breite (kein `max-w-sm` im Elternteil mehr,
      siehe Schritt 10 für den Aufrufer); Submit-Button `variant="default"` +
      `UserPlus`-Icon; bei `extended === true` Hinweistext statt normaler
      Erfolgsanzeige (Wording frei wählbar, sinngemäß "E-Mail wurde bereits
      eingeladen, Gültigkeitsdauer wurde verlängert.").
      _Definition of Done:_ `pnpm run typecheck` und `pnpm run lint`
      fehlerfrei, Formular ruft `createInvite({ email, days })` korrekt auf.
      `git add src/components/feature/admin-mitglieder/invite-form.tsx`
      `git commit -m "feat: add unbound invite toggle and configurable validity to invite form"`

- [x] **9. Mitgliedertabelle: Hintergrund, Suche, Statusfilter**
      Gemäß Quelldatei Abschnitt 5: Tabellen-Wrapper `bg-card`, Client-Wrapper
      mit Suchfeld (Icon `Search`, filtert `displayName`) und
      Single-Select-Quick-Filter (`Aktiv` Default · `Gekündigt` ·
      `Ausgetreten` · `Anonymisiert` · `Alle`), `useMemo`-Filterung analog
      `admin-bestand-view.tsx`.
      _Definition of Done:_ `pnpm run typecheck` und `pnpm run lint`
      fehlerfrei, Default-Filter zeigt nur `aktiv`-Mitglieder.
      `git add src/components/feature/admin-mitglieder/admin-mitglieder-view.tsx`
      `git commit -m "feat: add search and status filter to Mitglieder table"`

- [x] **10. Einladungstabelle: Spalten, Suche, Multiselect-Filter, Stat-Card**
      Gemäß Quelldatei Abschnitt 6: Spaltenreihenfolge `E-Mail` (`?? "*"`) →
      `Status` → `Erzeugt von` → `Erzeugt am` → `Läuft ab / eingelöst am`,
      `bg-card`, Suchfeld (filtert `email`), 4 unabhängige Toggle-Buttons
      (Mehrfachauswahl: Offen/Abgelaufen/Eingelöst/Widerrufen, Default
      Offen+Abgelaufen). Neue Stat-Card mit zwei `StatTile`s ("Offene
      Einladungen" / "Abgelaufene Einladungen"), Zahlen aus den ungefilterten
      `invites` berechnet, direkt über der Tabelle.
      _Definition of Done:_ `pnpm run typecheck` und `pnpm run lint`
      fehlerfrei, Default-Filter zeigt nur offene+abgelaufene Einladungen,
      Stat-Card-Zahlen ändern sich nicht mit Suchfeld/Filter.
      `git add src/components/feature/admin-mitglieder/admin-mitglieder-view.tsx`
      `git commit -m "feat: add search, multi-select status filter and stats card to invites table"`

- [x] **11. Einladungstabelle: Aktionsspalte (Copy/Mailto/Verlängern/Widerrufen)**
      Gemäß Quelldatei Abschnitt 6: für offene Einladungen vier Buttons
      (Token kopieren / Einladung kopieren / Link kopieren / Per Mail
      versenden — via `CopyButton` aus Schritt 6 und `mailto:`-Button mit
      `Mail`-Icon, `to`-Feld leer bei ungebundenen Einladungen) +
      `Widerrufen` (`variant="destructive"` + `Ban`-Icon statt `ghost`); für
      abgelaufene Einladungen `Verlängern`-Button
      (`extendInvite`-`ActionButton` mit `confirm`, `variant="outline"` +
      `RotateCcw`-Icon). Einladungstext-Vorlage aus `invite-form.tsx` als
      Formatierungsfunktion nach `src/lib/members/invites.ts` ziehen, von
      Mailto-Button und "Einladung kopieren" gemeinsam genutzt.
      _Definition of Done:_ `pnpm run typecheck` und `pnpm run lint`
      fehlerfrei, alle vier Buttons + Verlängern/Widerrufen funktional
      verdrahtet.
      `git add src/components/feature/admin-mitglieder/admin-mitglieder-view.tsx src/components/feature/admin-mitglieder/invite-form.tsx src/lib/members/invites.ts`
      `git commit -m "feat: add copy, mailto and extend actions to invites table"`

- [x] **12. `register-form.tsx`: E-Mail aus Link vorausfüllen**
      Gemäß Quelldatei Abschnitt 7: `email`-Query-Param zusätzlich zu `token`
      lesen; vorhanden → Feld befüllt + `readOnly`; nicht vorhanden → Feld
      frei editierbar, kein Server-Roundtrip.
      _Definition of Done:_ `pnpm run typecheck` und `pnpm run lint`
      fehlerfrei.
      `git add src/components/feature/registrieren/register-form.tsx`
      `git commit -m "feat: prefill and lock email field from invite link"`

- [x] **13. Doku aktualisieren**
      Gemäß Quelldatei Abschnitt 9: `docs/schema.md`-Absatz zu `Invite` auf
      die Zweiteilung gebunden/ungebunden umschreiben; `CLAUDE.md`-Tabelle
      „Vor dem Wiedererfinden" um `<CopyButton>` ergänzen.
      _Definition of Done:_ Doku-Änderungen spiegeln den finalen Code-Stand
      wider (kein Build-Bezug).
      `git add docs/schema.md CLAUDE.md`
      `git commit -m "docs: document bound/unbound invites and CopyButton reuse"`

- [x] **14. Gesamtverifikation**
      `pnpm run verify` (format:check + typecheck + lint + test) über das
      gesamte Projekt laufen lassen. Etwaige Restfehler aus vorherigen
      Schritten hier beheben.
      _Definition of Done:_ `pnpm run verify` vollständig grün.
      `git commit -m "chore: fix remaining verify issues" --allow-empty` nur
      falls tatsächlich noch Dateien zu committen sind; sonst kein Commit.

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Claude Sonnet 5)
- **Reasoning/Thinking:** an, mittlerer Effort — der Plan selbst ist bereits
  vollständig durchgegrillt und lässt praktisch keine offenen
  Architekturfragen mehr zu, aber die Umsetzung berührt eine Zustandsmaschine
  (Invite-Status, zwei Einladungsarten, Verlängerungs-Semantik) und eine
  destruktive Migration (Löschen von Bestandszeilen) — hier lohnt sich
  sorgfältiges Nachdenken vor jedem Schritt, kein reines Abtippen.
- **Begründung:** Die Aufgabe ist kein unklares Architekturproblem (dafür
  reicht kein Opus-Niveau an Tiefe), aber auch nicht rein mechanisch (dafür
  wäre Haiku zu schwach) — Sonnet 5 mit aktiviertem Thinking bei mittlerem
  Effort passt zur Komplexität von Server-Actions mit mehreren Fallunter-
  scheidungen, Prisma-Migrationen und einer vom Nutzer bereits bis ins Detail
  spezifizierten, aber dennoch mehrteiligen UI.
