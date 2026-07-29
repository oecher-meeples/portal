# Ausführungsplan: Phase 4 — Die Basis-Ludothek & Deinventarisierung

- **Erstellt/Aktualisiert:** 2026-07-29 12:00
- **Ziel:** Digitale Erfassung des Spielebestands im Admin-Bereich (`BoardGame`-Modell, manuelle Erfassung, BGG-Import per BGG-ID) inkl. Lösch-Schutz durch Deinventarisierung statt Hard-Delete (Meilensteine 4.1–4.3 aus `docs/roadmap.md`).
- **Quelle:** `docs/roadmap.md` (Abschnitt "Phase 4: Die Basis-Ludothek & Deinventarisierung"), ergänzend `docs/schema.md`, `docs/features.md` (Abschnitt 3.4), `src/data/games.ts` (bisherige Mock-Struktur), `src/components/feature/admin-bestand/admin-bestand-mock-view.tsx` (bisherige Mock-UI).
- **Git-Base-State:** Branch `develop`, HEAD `a7cf91bf5cb6c9978900e4c173e7928d10a8bed1`

> Details, Anforderungen und Kontext stehen in `docs/roadmap.md` — hier nicht duplizieren.

> ⚠️ **Vorbestehender Working-Tree-Zustand:** `.claude/plans/component-architecture-refactor.md` liegt untracked vor und gehört nicht zu diesem Plan — nicht anfassen, nicht committen.

## Persona

Du bist ein erfahrener Fullstack-TypeScript-Entwickler mit Schwerpunkt Next.js 15 (App Router), Prisma/PostgreSQL und Integration externer REST/XML-APIs. Du arbeitest inkrementell, testgetrieben und hältst dich strikt an bestehende Code-Konventionen dieses Repos (flache `src/lib/`-Module mit co-lokalisierten `.test.ts`-Dateien, dünne Server-Actions mit zentralem Permission-Check, externe HTTP-Aufrufe hinter einem schmalen, mockbaren Client — analog zu `src/lib/calendar.ts` und `src/lib/instagram/graph-client.ts`).

## Getroffene Annahmen

- **Granularität (per Nutzerentscheidung):** Phase 4 bildet **nur** `BoardGame` aggregiert ab — ein Datensatz pro Spieltitel mit einfachen Feldern für Anzahl Exemplare (`quantity`), Standort (`location`) und Zustand (`condition`, Freitext) statt eines separaten `GameCopy`-Modells mit individuellem Barcode pro Exemplar. Kein Barcode-Feld, keine QR-Generierung/Scan-UI — das aus `docs/schema.md` skizzierte `GameCopy`/`BorrowReceipt`-Modell mit Barcode und Verleihsystem ist explizit Meilenstein 5.4 und wird hier nicht vorweggenommen. `docs/features.md` Abschnitt 3.4 (Mockup-Briefing) zeigt zwar bereits Exemplar-/QR-Verwaltung — das bleibt vorerst Mockup-Zielbild für Phase 5, nicht Umsetzungsgrundlage für Phase 4.
- **Deinventarisierung (per Nutzerentscheidung):** Neues Enum `GameInventoryStatus { ACTIVE, DEINVENTARISED }` auf `BoardGame` plus `archivedAt DateTime?` und `archivedReason String?`. Analog zum bestehenden `InstagramStatus`-Pattern im Schema. Deinventarisierte Zeilen werden nie gelöscht (kein Cascade-Delete, keine harte Löschfunktion im UI).
- **Prisma-Modell `BoardGame`:** `id`, `slug` (unique, aus Titel generiert), `title`, `bggId Int? @unique` (null bei rein manuell angelegten Spielen ohne BGG-Verknüpfung), `minPlayers Int?`, `maxPlayers Int?`, `playTimeMinutes Int?`, `weight Float?`, `imageUrl String?`, `description String?`, `mechanics String[]` (Postgres-Array, analog zu bestehenden skalaren Feldern — kein separates Mechanik-Modell nötig für Phase 4), `quantity Int @default(1)`, `location String?`, `condition String?`, `status GameInventoryStatus @default(ACTIVE)`, `archivedAt`, `archivedReason`, `createdAt`, `updatedAt`.
- **BGG-API:** Nutzung der öffentlichen, unauthentifizierten **BoardGameGeek XMLAPI2** (`https://boardgamegeek.com/xmlapi2/thing?id={id}&stats=1`), kein API-Key nötig. Antwort ist XML — es gibt im Repo noch keinen XML-Parser (nur `node-ical` für ICS), daher wird `fast-xml-parser` als neue, schlanke Abhängigkeit ergänzt (kein Netzwerk-Overhead, reine String-Verarbeitung, gut mockbar wie bei `graph-client.ts`). Gemappte Felder: `title` (primärer `name`-Eintrag), `minplayers`/`maxplayers`, `playingtime`, `image`, `description` (HTML-Entities werden dekodiert), `mechanics` (alle `link[type=boardgamemechanic]`), `weight` (`statistics.ratings.averageweight`, gerundet auf 1 Nachkommastelle). Unbekannte BGG-ID → BGG antwortet mit HTTP 200 und leerem `<items/>` (kein 404) — das wird als eigener `BggNotFoundError` behandelt, nicht als generischer HTTP-Fehler.
- **Import-Flow:** Zweistufig wie in `docs/features.md` beschrieben ("zeigt Vorschau ... vor Bestätigung"): `previewBggImport(bggId)` ruft den Client auf und gibt die gemappten Daten zurück, **ohne** zu persistieren. Der Admin sieht die Vorschau (Cover, Metadaten) im Dialog, kann Felder wie Standort/Anzahl noch ergänzen, und erst ein zweiter Bestätigungs-Klick ruft `createBoardGame(input)` auf (dieselbe Funktion wie beim rein manuellen Anlegen). Ist `bggId` bereits vergeben (unique-Constraint), wird ein sprechender Fehler statt eines rohen Prisma-Fehlers geworfen ("Spiel mit dieser BGG-ID existiert bereits").
- **Berechtigung:** Eine neue, einzelne Permission `games:manage` (analog zum bestehenden Pattern `members:manage`) deckt Anlegen, Bearbeiten und Deinventarisieren ab — ausschließlich der `admin`-Rolle zugewiesen (passt zu `docs/features.md`s Rollen-Matrix, die Bestandsverwaltung/Deinventarisierung der Rolle "Admin/Spiele-Moderator" zuordnet; eine granularere Trennung zwischen Anlegen und Deinventarisieren ist für die aktuelle Vereinsgröße Overengineering).
- **Bestehende Mock-Route wird real:** `src/app/admin/bestand/page.tsx` und `src/components/feature/admin-bestand/admin-bestand-mock-view.tsx` (bisher `GAMES`-Mock aus `src/data/games.ts`) werden durch eine DB-gestützte Version ersetzt. `src/data/games.ts` selbst bleibt unangetastet, da `src/components/feature/ludothek/*` (öffentliche/Mitglieder-Ludothek-Mockups, Phase 5) weiterhin darauf basieren — das ist expliziter Scope von Phase 5, nicht Teil dieses Plans.
- **Kein Draft/Genehmigungs-Workflow:** Neu angelegte bzw. importierte Spiele sind sofort mit Status `ACTIVE` aktiv (keine Freigabe-Schleife), analog zum bestehenden Pattern bei `Post`.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt).
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf die Quelldatei.
- Dateien über 400 Zeilen möglichst in kleinere Dateien aufteilen.
- Neue BGG-Logik gebündelt unter `src/lib/bgg/`, analog zur bestehenden Flach-Struktur unter `src/lib/` (siehe `src/lib/instagram/`).
- **Unit-Tests:** Für neue Logik/Funktionen Unit-Tests schreiben. Die Definition of Done eines Schritts gilt erst als erfüllt, wenn die zugehörigen Tests grün sind. Ausgenommen sind rein mechanische/nicht-testbare Schritte (Config, Doku, reines Layout/Routing).
- **Committe nur Dateien, die du selbst geschrieben hast** — gezieltes `git add <datei>`, kein `git add -A`/`git add .`. `.claude/plans/component-architecture-refactor.md` nicht anfassen.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert: < 1 h Arbeit).
- **Bei Fehlschlag eines Schritts:** nicht mit dem nächsten Schritt fortfahren, nichts committen, Fehler auf Deutsch melden.
- Markiere jeden erledigten Schritt mit `[x]`, sobald er abgeschlossen und committet ist.

## Schritte

- [x] **0. Repository-Zustand prüfen**
      `git status` ausführen und bestätigen, dass Git funktioniert. Die vorbestehende untracked Datei `.claude/plans/component-architecture-refactor.md` zur Kenntnis nehmen und **nicht** anfassen.
      _Definition of Done:_ `git status` läuft fehlerfrei, vorbestehende fremde Änderungen bleiben unangetastet.
      Kein Commit in diesem Schritt (rein informativ).

- [x] **1. Prisma-Schema erweitern**
      `prisma/schema.prisma`: neues Enum `GameInventoryStatus { ACTIVE DEINVENTARISED }`, neues Modell `BoardGame` (Felder siehe Annahmen oben, `@@map("board_games")`). `prisma/seed.ts`: neue Permission `{ key: "games:manage", description: "Ludothek-Bestand verwalten (anlegen, bearbeiten, deinventarisieren)" }` ergänzen und ausschließlich der `admin`-Rolle zuweisen (`permissionKeys` der `admin`-Rolle erweitern). Migration gegen die Neon-DB ausführen.
      _Definition of Done:_ `prisma migrate dev` läuft ohne Fehler gegen die Neon-DB, `pnpm build` bricht nicht, `pnpm prisma db seed` (bzw. bestehendes Seed-Skript) läuft fehlerfrei durch.
      `git commit -m "feat: extend prisma schema for board game inventory"`

- [x] **2. BoardGameGeek XML-API-Client**
      `fast-xml-parser` installieren. `src/lib/bgg/client.ts`: Funktion `fetchBggGame(bggId: number)`, ruft `https://boardgamegeek.com/xmlapi2/thing?id={bggId}&stats=1` per `fetch` auf, parst die XML-Antwort und mappt sie auf einen typisierten `BggGameData`-Typ (title, minPlayers, maxPlayers, playTimeMinutes, weight, imageUrl, description, mechanics). Wirft `BggNotFoundError` bei leerem `<items/>`, `BggApiError` bei nicht-2xx-HTTP-Antwort. `src/lib/__fixtures__/bgg/` mit 2–3 Beispiel-XML-Antworten (Erfolg mit vollständigen Daten, Erfolg mit fehlenden optionalen Feldern, leeres `<items/>` für unbekannte ID) anlegen, analog zu `src/lib/__fixtures__/instagram/`.
      _Definition of Done:_ Unit-Tests (`client.test.ts`) mit gemocktem `global.fetch` decken Erfolgsfall, Fall mit fehlenden optionalen Feldern und `BggNotFoundError`-Fall ab; `pnpm test` grün.
      `git commit -m "feat: add boardgamegeek xml api client"`

- [x] **3. Server-Actions für Anlegen, Import-Vorschau und Deinventarisierung**
      `src/components/feature/admin-bestand/actions.ts`: `createBoardGame(input)` (prüft Permission `games:manage`, generiert eindeutigen `slug` aus `title` bei Kollision mit Suffix, persistiert; bei belegter `bggId` sprechender Fehler statt rohem Prisma-Unique-Fehler), `updateBoardGame(id, input)` (gleiche Permission), `previewBggImport(bggId)` (Permission-Check, ruft `fetchBggGame` aus Schritt 2 auf, gibt gemappte Daten zurück, **kein** DB-Write), `deinventoriseBoardGame(id, reason)` (Permission-Check, setzt `status: DEINVENTARISED`, `archivedAt: now()`, `archivedReason: reason`, `reason` darf nicht leer sein).
      _Definition of Done:_ Unit-Tests (`actions.test.ts`, gemockter Prisma-Client wie in `src/lib/__mocks__/prisma.ts` und gemockter `fetchBggGame`) decken ab: fehlende Permission → Fehler ohne DB-Änderung; erfolgreiches manuelles Anlegen; Slug-Kollision wird aufgelöst; Anlegen mit bereits vergebener `bggId` → sprechender Fehler; `previewBggImport` persistiert nichts; Deinventarisierung setzt alle drei Felder und schlägt bei leerem Grund fehl. `pnpm test` grün.
      `git commit -m "feat: add server actions for board game inventory management"`

- [x] **4. Admin-Bestandsseite von Mock auf echte Daten umstellen**
      `src/components/feature/admin-bestand/admin-bestand-view.tsx` (ersetzt `admin-bestand-mock-view.tsx`, alte Mock-Komponente entfernen): Tabelle über alle `BoardGame`-Zeilen (Titel, Anzahl Exemplare, Standort/Zustand, Status-Pill `ACTIVE`/`DEINVENTARISED`, Aktionen). "+ Spiel anlegen"-Button öffnet ein Dialog mit zwei Modi ("Manuell" / "Via BGG-ID") — im BGG-Modus erst BGG-ID eingeben → Vorschau (Cover, Metadaten aus Schritt 3) anzeigen → Felder wie Standort/Anzahl ergänzbar → Bestätigen ruft `createBoardGame` auf. "Deinventarisieren"-Aktion pro aktiver Zeile öffnet Dialog mit Pflicht-Grundfeld, ruft `deinventoriseBoardGame` auf; deinventarisierte Zeilen werden wie im bisherigen Mock durchgestrichen/abgeblendet dargestellt, bleiben aber sichtbar (kein Hard-Delete, kein Ausblenden aus der Liste). `src/app/admin/bestand/page.tsx`: lädt `BoardGame`-Liste per Prisma statt `GAMES`-Mock, rendert neue View.
      _Definition of Done:_ Unit-Test für die Formular-Validierung (z. B. Pflichtfelder, BGG-ID-Format) falls als eigenständige Funktion extrahierbar; ansonsten manueller Test: Seite lädt leer, manuelles Anlegen persistiert und erscheint in der Liste, BGG-Import zeigt Vorschau und persistiert nach Bestätigung, Deinventarisieren setzt Status sichtbar um ohne die Zeile zu löschen.
      `git commit -m "feat: replace mock board game inventory with database-backed admin view"`

- [x] **5. Env-Dokumentation & Roadmap-Status-Update**
      Prüfen, ob die BGG-API zusätzliche Env-Variablen benötigt (aktuell keine, da unauthentifiziert) — falls nicht, keine `.env.example`-Änderung nötig. `docs/roadmap.md`: Meilensteine 4.1–4.3 und ihre Unterpunkte auf `[x]` setzen.
      _Definition of Done:_ `docs/roadmap.md` spiegelt den tatsächlich umgesetzten Stand wider. Kein Code, daher keine Tests nötig (mechanischer Doku-Schritt).
      `git commit -m "docs: mark phase 4 board game inventory milestones as completed"`

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Claude Sonnet 5) als Standard für alle Schritte.
- **Reasoning/Thinking:** an, hoher Effort speziell für Schritt 3 (Slug-Kollisionslogik, zweistufiger Preview/Confirm-Import-Flow, Fehlerbehandlung bei Unique-Constraints) und Schritt 2 (robustes XML-Mapping inkl. fehlender optionaler Felder und Unterscheidung "nicht gefunden" vs. "API-Fehler"); mittlerer Effort für Schritt 1 (Schema-/Migrationsentscheidungen mit Seiteneffekt auf Seed-Daten) und Schritt 4 (neue, aber klar umrissene UI mit zwei Formularmodi); niedriger Effort ausreichend für Schritte 0 und 5 (informativ/Doku).
- **Begründung:** Die eigentliche Komplexität liegt im XML-Mapping externer, nicht kontrollierter Daten (BGG kann Felder weglassen) und im zweistufigen Import-Flow mit Duplikatsprüfung — beides Stellen mit potenziell stillen Datenfehlern, wenn sie zu knapp durchdacht werden. Die reine CRUD-/UI-Arbeit ist dagegen Standardaufwand.
