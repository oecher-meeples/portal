# Ausführungsplan: Phase 6 — Event-Betrieb & Bring & Buy Flohmarkt

- **Erstellt/Aktualisiert:** 2026-07-29 22:15
- **Ziel:** Eigenständiges Event-Modell mit Schichtplanung/Helferbuchung, Erklärbären-Profilen, Regal-Zuordnung, unauthentifiziertem Gäste-Bereich vor Ort und einem Bring-&-Buy-Flohmarktmodul (Meilensteine 6.1–6.4 aus `docs/roadmap.md`).
- **Quelle:** `docs/roadmap.md` (Abschnitt „Phase 6"), `CONTEXT.md` (verbindliches Glossar, Abschnitt „Event-Betrieb"), `docs/adr/0004`–`0006`, ergänzend `docs/features.md` (2.10–2.13, 3.5–3.8).
- **Git-Base-State:** Branch `develop`, HEAD `ece15cb7641da70ae6aec21040cfb9c377ead6f1`

> **Fachsprache ist verbindlich:** `CONTEXT.md` definiert Event, Regal-Zuordnung, Erklärbär, Schicht, Flohmarkt-Artikel und Gäste-Bereich. Diese Begriffe hier nicht neu definieren und im Code konsistent verwenden (englische Bezeichner im Code, siehe Datenmodell unten).

> **Modellentscheidungen und ihre Begründung** stehen in `docs/adr/0004-event-losgeloest-vom-ics-feed.md`, `0005-gaeste-scan-ean-statt-spiele-qr.md` und `0006-schicht-buchung-statt-permission-fuer-event-rechte.md`. Vor Schritt 2, Schritt 5 und Schritt 17 lesen.

## Persona

Du bist ein erfahrener Fullstack-TypeScript-Entwickler mit Schwerpunkt Next.js 15/16 (App Router, Server Actions), Prisma/PostgreSQL inkl. handgeschriebener Migrationen und selbstgebauten, abhängigkeitsarmen Parsern (siehe `src/lib/calendar.ts`, `src/lib/inventory/ean.ts`). Du arbeitest inkrementell und testgetrieben, hältst dich strikt an die bestehenden Repo-Konventionen aus Phase 4/5: Domänenlogik in flachen Modulen unter `src/lib/<thema>/` mit co-lokalisierten `.test.ts`, dünne Server-Actions je Feature-Ordner unter `src/components/feature/<bereich>/actions.ts` mit Permission- bzw. Rechte-Check als erster Zeile, Prisma-Mocks über `src/lib/__mocks__/prisma.ts`.

## Getroffene Annahmen

Alles Folgende ist in einer Klärungsrunde mit dem Nutzer entschieden bzw. aus dem bestehenden Repo abgeleitet. Fachbegriffe siehe `CONTEXT.md`, Begründungen der drei ADRs siehe dort — hier steht nur, was für die Ausführung zusätzlich nötig ist.

### Scope

- **Ein Plan über 6.1–6.4.** Meilenstein 6.1 (Konzeption) ist durch die drei ADRs und `CONTEXT.md` bereits weitgehend erledigt und wird am Ende nur noch abgehakt bzw. um das Flohmarkt-Datenmodell (Schritt 14) ergänzt.
- **Nicht in diesem Plan:** Ersatzteillager (Phase 7), Kleinanzeigen-Marktplatz (Phase 7), SEPA/Auszahlungsbuchhaltung für den Flohmarkt (bewusst außerhalb des Portals, siehe `CONTEXT.md` „Flohmarkt-Artikel"), Etiketten-Druck für Flohmarkt-Artikel (nicht in der Roadmap gefordert — Artikel bekommen nur einen kurzen Anzeige-Code für die Kassensuche, kein physisches Etikett).
- **Widerspruch zwischen `CONTEXT.md` und `docs/features.md` zu klären (Schritt 1):** `CONTEXT.md` definiert „Schicht" ausdrücklich ohne Erklärbär (`Avoid: Erklärbär als Schicht`) und die Roadmap (Meilenstein 6.2) nennt nur die Schicht-Typen Theke, Kasse, Spieleleihe. `docs/features.md` (2.11, 3.6) listet „Erklärbär" dagegen als vierten Schicht-Rollen-Slot. `CONTEXT.md` ist die aktuellere, verbindliche Quelle — Erklärbär bleibt ein eigenständiges Profil + Event-Anwesenheit, **keine** Schicht. `docs/features.md` wird entsprechend korrigiert.
- **„Kasse"-Schicht = Flohmarkt-Schicht:** ADR 0006 spricht von der „Flohmarkt-Schicht" eines Events; die Roadmap kennt dafür keinen eigenen Schicht-Typ, sondern nur `KASSE` (Bring & Buy findet an der Kasse statt). `KASSE` ist daher exakt die in ADR 0006 gemeinte Schicht.

### Datenmodell (englische Bezeichner, deutsche Fachsprache siehe `CONTEXT.md`)

- **`Event`** — `id`, `slug String @unique` (für teilbare Gäste-Bereich-URLs, analog `BoardGame.slug`), `title`, `startsAt DateTime`, `endsAt DateTime?`, `location String?`, Zeitstempel. Kein Bezug zum ICS-Feed (ADR 0004).
- **`EventShelfAssignment`** (Regal-Zuordnung) — `eventId`, `unitId` (nur `StorageUnit` mit `kind: SHELF`, applikationsseitig geprüft, siehe Schritt 10), `@@id([eventId, unitId])`. Rein informativ, verändert keinen `GameHolding` (ADR 0004/`CONTEXT.md`).
- **`ShiftType`**-Enum: `THEKE`, `KASSE`, `LEIHE`.
- **`Shift`** — `id`, `eventId`, `type ShiftType`, `startsAt DateTime`, `endsAt DateTime`, `capacity Int`, Zeitstempel.
- **`ShiftBooking`** — `shiftId`, `meepleId`, `uncertain Boolean @default(false)` (unsichere Zusage), `createdAt`, `@@id([shiftId, meepleId])`. Zählt für die Kapazität unabhängig von `uncertain` (einfachste Regel, verhindert Überbuchung).
- **`ExplainerExperienceLevel`**-Enum: `WITH_MANUAL`, `WITHOUT_MANUAL`, `BY_HEART` (Anzeige-Labels „Mit Anleitung" / „Ohne Anleitung" / „Im Schlaf" in `src/lib/format.ts`, analog den bestehenden Status-Label-Mappings).
- **`ExplainerGame`** (dauerhaftes Erklärbären-Profil) — `id`, `meepleId`, `boardGameId`, `level ExplainerExperienceLevel`, Zeitstempel, `@@unique([meepleId, boardGameId])`.
- **`ExplainerAttendance`** (Event-Anwesenheit) — `eventId`, `meepleId`, `createdAt`, `@@id([eventId, meepleId])`. „Heute hier erklärbar" = Kombination aus `ExplainerGame` (für ein bestimmtes Spiel) und `ExplainerAttendance` (für dieses Event).
- **`FleaMarketItemStatus`**-Enum: `PENDING`, `FOR_SALE`, `RESERVED`, `SOLD` (deckt sich mit den bestehenden String-Literalen in `src/data/bringbuy.ts` plus `PENDING` für die Freigabe).
- **`FleaMarketItem`** — `id`, `code String @unique` (kurzer Anzeige-Code für die Kassensuche, z. B. `FM-0001`, analog `nextUnitCode`), `eventId`, `sellerMeepleId`, `title`, `description String?`, `priceEuros Int`, `status FleaMarketItemStatus @default(PENDING)`, `approvedAt DateTime?`, `approvedByMeepleId String?`, Zeitstempel.
- **`BoardGame`-Ergänzung:** `explainerVideoUrl String?` — von der BGG-API best-effort automatisch befüllt (Schritt 11), manuell über `games:manage` korrigierbar.
- **Neue Permission `events:manage`:** „Events, Schichten und Regal-Zuordnungen verwalten, Flohmarkt-Artikel freigeben/Kasse bedienen außerhalb einer Kasse-Schicht" — vergeben an die Rolle `admin`.

### Regeln, die sich nicht aus dem Glossar ergeben

- **Zeitgebundenes Kassenrecht (ADR 0006):** `hasFleaMarketRights(meepleId, eventId, at = now)` ist wahr, wenn `hasPermission(meepleId, "events:manage")` **oder** eine `ShiftBooking` für eine `KASSE`-Schicht dieses Events existiert, deren Zeitfenster `at` enthält. Sowohl Artikel-Freigabe (`PENDING → FOR_SALE`) als auch Status-Wechsel in der Kassenansicht laufen über diese eine Funktion (DRY, keine zwei Berechtigungsprüfungen).
- **Flohmarkt-Artikel-Self-Service:** Jedes Mitglied legt eigene Artikel an (manuell oder per CSV) — keine Permission nötig, analog Spielergesuche. Artikel starten als `PENDING` und sind im öffentlichen Gäste-Bereich erst ab `FOR_SALE`/`RESERVED`/`SOLD` sichtbar (nie `PENDING`).
- **CSV statt Excel (Nutzer-Entscheidung):** kein neues Paket — ein schlanker handgeschriebener Parser (`src/lib/bringbuy/csv.ts`) analog dem bestehenden EAN-/ICS-Parsing-Stil, Spalten `title,price,description` (Komma-getrennt, `description` optional, einfache Anführungszeichen-Behandlung für Kommas im Text). Import erzeugt ausschließlich Artikel des importierenden Mitglieds.
- **BGG-Erklärvideo (Nutzer-Entscheidung):** `fetchBggGame` ruft den BGG-`thing`-Endpunkt zusätzlich mit `videos=1` auf und übernimmt den ersten Eintrag mit `category="instructional"` und YouTube-Host als `explainerVideoUrl`, sonst `null`. Kein Fehler, wenn der Videos-Block fehlt oder leer ist. Nachträgliche Korrektur im Bearbeiten-Dialog von `admin-bestand`.
- **Erklärbären-Erfahrungsstufe (Nutzer-Entscheidung):** genau drei feste Stufen `WITH_MANUAL` / `WITHOUT_MANUAL` / `BY_HEART`, keine freie Notiz, keine 5-Sterne-Skala.
- **Gäste-Bereich (ADR 0005, `CONTEXT.md`):** unauthentifiziert, jederzeit erreichbar unter `/events/[slug]/gast`, kein Zeitfenster-Gating. EAN-Scan liefert bei mehreren Spielen desselben Titels eine Auswahlliste (wie im internen Scan). „Im Raum" = das Spiel liegt aktuell (über die Standort-Kette) in einer Einheit, die direkt oder über einen Vorfahren einem `EventShelfAssignment` dieses Events zugeordnet ist. Anwesende Erklärbären = `ExplainerAttendance` für dieses Event, gejoint über `ExplainerGame` auf das jeweilige Spiel.
- **Filterbare „was ist gerade frei"-Liste (2.10/3.8):** Spiele, die „im Raum" sind **und** Zustand „frei" haben, gefiltert nach Spieleranzahl — reine Funktion, die auf der bestehenden Ludothek-Filterlogik aus Phase 5 aufbaut (kein Duplikat).
- **Schicht-Kapazität:** eine volle Schicht (Anzahl Buchungen == `capacity`) nimmt keine weiteren Buchungen an, unabhängig von `uncertain`. Admins können Kapazität nachträglich erhöhen.
- **Regal-Zuordnung ist nur für `StorageUnit.kind === SHELF` erlaubt** — anderer Versuch wird mit einem sprechenden Fehler abgelehnt (Kartons wandern mit ihrem Verwahrer, siehe `CONTEXT.md`).
- **Mock-Abbau:** `src/data/helferplan.ts` und `src/data/bringbuy.ts` werden entfernt, sobald die jeweiligen Views echte Daten lesen. Vorher alle Referenzen prüfen und mit umstellen.
- **Testframework:** Vitest ist bereits eingerichtet (`vitest.config.ts`, `pnpm test`) — der Template-Setup-Schritt entfällt, wie schon in Phase 4/5.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch. Fachbegriffe aus `CONTEXT.md` konsistent verwenden.
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt). Bestehende Bausteine aus `src/components/ui/` und `src/lib/ludothek/` wiederverwenden statt neu bauen.
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf `CONTEXT.md` oder die ADRs.
- Dateien über 400 Zeilen möglichst in kleinere Dateien aufteilen.
- **Unit-Tests:** Für neue Logik/Funktionen Unit-Tests schreiben. Die Definition of Done eines Schritts gilt erst als erfüllt, wenn die zugehörigen Tests grün sind (`pnpm test`). Ausgenommen sind rein mechanische/nicht-testbare Schritte (Config, Doku, reines Layout/Routing).
- **Committe nur Dateien, die du selbst geschrieben hast** — gezieltes `git add <datei>`, kein `git add -A`/`git add .`.
- **Blockierende Prozesse:** Du darfst Prozesse beenden, die für einen Schritt benötigte Ressourcen blockieren (laufender `next dev` auf dem Port, Prisma-Lock). Gezielt identifizieren, nur diesen beenden, Schritt nicht abbrechen.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert: < 1 h Arbeit).
- **Bei Fehlschlag eines Schritts:** prüfen, ob die Definition of Done teilweise erfüllt ist. Falls ja, Teilstand mit `wip:`-Präfix committen; falls nein, nichts committen. In beiden Fällen den Schritt mit `[!]` markieren, den Fehler als Stichpunkt darunter notieren und **mit dem nächsten Schritt fortfahren**. Erst nachdem alle Schritte durchlaufen sind, alle offenen Punkte gesammelt auf Deutsch besprechen.
- Markiere jeden erledigten Schritt mit `[x]`, sobald er abgeschlossen und committet ist.

## Schritte

### A — Vorbereitung und Doku-Korrektur

- [x] **0. Repository- und Toolchain-Zustand prüfen**
      `git status` ausführen und den Ausgangszustand zur Kenntnis nehmen. `pnpm test` einmal laufen lassen (grüner Ausgangszustand). `CONTEXT.md` und `docs/adr/0004`–`0006` lesen.
      _Definition of Done:_ `git status` läuft fehlerfrei, `pnpm test` grün.
      Kein Commit (rein informativ).

- [x] **1. Doku-Widerspruch Erklärbär/Schicht auflösen**
      `docs/features.md`: Abschnitt 2.11 („Event-Auswahl, darunter Schichtplan-Tabelle (Zeit × Rolle: Theke/Kasse/Leihe/Erklärbär)") und 3.6 (Schicht-Editor-Rollen-Slots) auf die drei Schicht-Typen Theke/Kasse/Leihe korrigieren; Erklärbär-Zusage als eigenen Abschnitt beschreiben (Anwesenheits-Toggle statt Schicht-Slot). 3.7 „Excel-Massenimport" auf „CSV-Massenimport" umbenennen, ebenso in 6.4-nahen Stellen von `docs/roadmap.md`, falls dort wörtlich „Excel" steht.
      _Definition of Done:_ Kein Dokument nennt mehr Erklärbär als Schicht-Rolle oder Excel-Import. Kein Code, keine Tests.
      `git commit -m "docs: align feature briefs with the shift and csv-import decisions"`

### B — Event- und Schicht-Fundament

- [x] **2. Prisma-Schema: Event, Schicht, Permission**
      _Vorher lesen:_ ADR 0004, ADR 0006.
      `prisma/schema.prisma`: `Event` (`@@map("events")`), `ShiftType`-Enum, `Shift` (`@@map("shifts")`, Index auf `eventId`), `ShiftBooking` (`@@map("shift_bookings")`). `prisma/seed.ts`: Permission `events:manage` ergänzen, Rolle `admin` erhält sie automatisch (bestehende `permissionKeys: PERMISSIONS.map(...)`-Logik).
      _Definition of Done:_ `pnpm prisma migrate dev` fehlerfrei gegen die Neon-DB, `pnpm db:seed` läuft durch, `pnpm build` bricht nicht.
      `git commit -m "feat: add event and shift models with events:manage permission"`

- [x] **3. Event-Verwaltung (Admin)**
      `src/components/feature/admin-events/actions.ts` (mit `requirePermission("events:manage")`): `createEvent`, `updateEvent`, `deleteEvent` (nur wenn keine Schichten/Regal-Zuordnungen/Flohmarkt-Artikel existieren). `admin-events-view.tsx`: Tabelle aller Events (Titel, Zeitraum, Ort, Anzahl Schichten), Anlage-/Bearbeiten-Dialog. Route `/admin/events`, Navigationseintrag in `src/lib/nav-config.ts` (Administration-Gruppe).
      _Definition of Done:_ Tests decken ab: fehlende Permission → Fehler ohne DB-Änderung; Löschen eines Events mit vorhandenen Schichten wird abgelehnt; `slug` wird eindeutig aus dem Titel generiert (Kollisionsfall). `pnpm test` grün.
      `git commit -m "feat: add event administration"`

- [x] **4. Schicht-Editor (Admin)**
      `src/components/feature/admin-events/shift-actions.ts` (mit `requirePermission("events:manage")`): `createShift`, `updateShift`, `deleteShift` (nur wenn keine Buchungen vorhanden). Event-Detailansicht in `admin-events-view.tsx` (oder eigene Detailseite `/admin/events/[id]`) erweitert um Schicht-Tabelle mit Füllstand (besetzt/frei) je Schicht.
      _Definition of Done:_ Tests decken ab: fehlende Permission → Fehler ohne DB-Änderung; Löschen einer besetzten Schicht wird abgelehnt; Füllstand-Berechnung (besetzt/Kapazität) korrekt inkl. `uncertain`-Buchungen. `pnpm test` grün.
      `git commit -m "feat: add shift editor for events"`

- [x] **5. Schicht-Buchung: Rechte-Ableitung**
      _Vorher lesen:_ ADR 0006.
      `src/lib/events/shift-rights.ts`: `hasFleaMarketRights(meepleId, eventId, at?)` — implementiert exakt die ADR-0006-Regel (Permission `events:manage` **oder** aktive `KASSE`-Buchung, deren Zeitfenster `at` enthält). Eigenständig und getestet, **bevor** Schritt 17 sie verwendet (DRY, keine Zweitimplementierung).
      _Definition of Done:_ Tests decken ab: `events:manage`-Inhaber hat immer Recht; gebuchte `KASSE`-Schicht innerhalb des Zeitfensters gewährt Recht; außerhalb des Zeitfensters nicht; `THEKE`/`LEIHE`-Buchung gewährt kein Recht; keine Buchung und keine Permission → kein Recht. `pnpm test` grün.
      `git commit -m "feat: derive flea market rights from kasse shift bookings"`

- [x] **6. Schicht-Buchung (Mitglieder-Self-Service) & Helferplan-Ansicht**
      `src/components/feature/helfer/actions.ts` (mit `requireMeeple()`): `bookShift(shiftId, uncertain)` (lehnt volle Schichten und Doppelbuchungen ab), `updateBookingCertainty(shiftId, uncertain)`, `cancelBooking(shiftId)` — immer nur die eigene Buchung. `helfer-view.tsx` ersetzt `helfer-mock-view.tsx`: Event-Auswahl (Standard: nächstes anstehendes Event), darunter Schichtplan-Tabelle (Zeit × Typ) mit eigenen Zusagen hervorgehoben, Buchen/Zusage-Status ändern/Abmelden. Route `/helfer` unverändert, `src/data/helferplan.ts` entfernen.
      _Definition of Done:_ Tests decken ab: ohne Session kein Schreibzugriff; Buchung einer vollen Schicht wird abgelehnt; Doppelbuchung abgelehnt; Abmelden entfernt genau die eigene Buchung; `uncertain`-Wechsel ändert keine fremde Buchung. `pnpm build` ohne Referenz auf `src/data/helferplan.ts`. `pnpm test` grün.
      `git commit -m "feat: replace mock helferplan with database-backed shift booking"`

### C — Erklärbären

- [x] **7. Prisma-Schema: Erklärbären-Profil und Event-Anwesenheit**
      `prisma/schema.prisma`: `ExplainerExperienceLevel`-Enum, `ExplainerGame` (`@@map("explainer_games")`), `ExplainerAttendance` (`@@map("explainer_attendances")`). `src/lib/format.ts`: Label-Mapping für `ExplainerExperienceLevel` ergänzen (DRY, ein Ort für alle Status-Labels).
      _Definition of Done:_ `pnpm prisma migrate dev` fehlerfrei, `pnpm build` bricht nicht.
      `git commit -m "feat: add explainer profile and event attendance models"`

- [x] **8. Erklärbär-Profil (Self-Service)**
      `src/components/feature/erklaerbaeren/actions.ts` (mit `requireMeeple()`): `addExplainerGame(boardGameId, level)`, `updateExplainerGameLevel`, `removeExplainerGame` — ausschließlich auf dem eigenen `Meeple`. `erklaerbaeren-view.tsx`: Verzeichnis Spiel → zugeordnete Erklärbären mit Erfahrungsstufe (Badge, Label aus Schritt 7), eigener Bearbeiten-Bereich „Meine Spiele als Erklärbär". Route `/erklaerbaeren`, Navigationseintrag in der Mitgliederbereich-Gruppe.
      _Definition of Done:_ Tests decken ab: ohne Session kein Schreibzugriff; Doppeleintrag für dasselbe Spiel aktualisiert die Stufe statt zu duplizieren (`@@unique`); Entfernen löscht genau den eigenen Eintrag. `pnpm test` grün.
      `git commit -m "feat: add self-service explainer game profiles"`

- [x] **9. Event-Anwesenheit der Erklärbären**
      `src/components/feature/helfer/attendance-actions.ts` (mit `requireMeeple()`): `markAttending(eventId)`, `markNotAttending(eventId)` — nur eigene Anwesenheit. Integration in `helfer-view.tsx` (aus Schritt 6): Toggle „Ich bin heute als Erklärbär da" für das ausgewählte Event, sichtbar nur für Meeples mit mindestens einem `ExplainerGame`-Eintrag.
      _Definition of Done:_ Tests decken ab: ohne `ExplainerGame`-Eintrag kein Anwesenheits-Eintrag anlegbar (oder UI blendet es aus — im Test die Server-Action-Ablehnung prüfen); doppeltes Markieren erzeugt keinen zweiten Eintrag; Abmelden entfernt den Eintrag. `pnpm test` grün.
      `git commit -m "feat: add per-event explainer attendance"`

### D — Regal-Zuordnung & BGG-Erklärvideo

- [x] **10. Regal-Zuordnung (Admin)**
      `src/components/feature/admin-events/shelf-assignment-actions.ts` (mit `requirePermission("events:manage")`): `assignShelfToEvent(eventId, unitId)` (lehnt `kind !== SHELF` mit sprechendem Fehler ab), `unassignShelfFromEvent`. Event-Detailansicht erweitert um Abschnitt „Regal-Zuordnung": Auswahl aus vorhandenen Regalen (aus `src/lib/inventory`/`src/lib/ludothek` wiederverwendet), Liste aktuell zugeordneter Regale.
      _Definition of Done:_ Tests decken ab: fehlende Permission → Fehler ohne DB-Änderung; Zuordnung eines Kartons (`kind: BOX`) wird abgelehnt; doppelte Zuordnung ist idempotent (kein Fehler, kein Duplikat); Entfernen einer nicht zugeordneten Einheit ist ein No-op ohne Fehler. `pnpm test` grün.
      `git commit -m "feat: add shelf-to-event assignment for the guest area"`

- [x] **11. BGG-Erklärvideo**
      `src/lib/bgg/client.ts`: `fetchBggGame` um `videos=1` im Request-URL erweitern, `BggGameData` um `explainerVideoUrl: string | null` ergänzen, Auswahlregel „erster Eintrag mit `category=instructional` und YouTube-Host" implementieren, fehlender/leerer Videos-Block ⇒ `null` ohne Fehler. `admin-bestand`: BGG-Import übernimmt `explainerVideoUrl` in die Vorschau und beim Anlegen; Bearbeiten-Dialog erhält ein manuell korrigierbares Textfeld dafür.
      _Definition of Done:_ `src/lib/bgg/client.test.ts` erweitert (neue Fixture mit Videos-Block, eine ohne): korrekte Auswahl bei mehreren Videos, `null` ohne Videos-Block, `null` wenn kein `instructional`-Eintrag vorhanden. `pnpm test` grün.
      `git commit -m "feat: auto-populate explainer video links from bgg"`

### E — Gäste-Bereich (öffentlich, unauthentifiziert)

- [x] **12. Gäste-Bereich-Logik**
      _Vorher lesen:_ ADR 0005.
      `src/lib/events/guest-area.ts`: `isGameInEventRoom(boardGameId, eventId)` (Standort-Kette über `StorageUnit`-Vorfahren gegen `EventShelfAssignment`, mit Tiefenbegrenzung analog `getResponsibleMeeple`), `getAttendingExplainers(boardGameId, eventId)` (Join `ExplainerAttendance` × `ExplainerGame`), `getFreeGamesInRoom(eventId, filters)` (baut auf der bestehenden Ludothek-Filterlogik aus `src/lib/ludothek/` auf, kein Duplikat — Zustand „frei" **und** „im Raum").
      _Definition of Done:_ Tests decken ab: Spiel in direkt zugeordnetem Regal ⇒ im Raum; Spiel in Karton, der im zugeordneten Regal steht ⇒ im Raum (Kette über zwei Ebenen); nicht zugeordnetes Regal ⇒ nicht im Raum; anwesende Erklärbären nur für das angefragte Spiel und Event; „was ist frei"-Filter kombiniert Zustand und Spieleranzahl korrekt. `pnpm test` grün.
      `git commit -m "feat: add guest-area room and explainer lookup logic"`

- [x] **13. Öffentliche Gäste-Seite**
      Route `src/app/events/[slug]/gast/page.tsx` (unauthentifiziert, kein `requireMember()`, jederzeit erreichbar). `guest-area-view.tsx`: EAN-/Manuell-Scan (Hook aus `src/components/feature/scan/use-code-scanner.ts` wiederverwendet, kein zweiter Scan-Code), Spielinfo-Karte (Cover, Kurzregeln, `explainerVideoUrl` als eingebetteter YouTube-Link, anwesende Erklärbären aus Schritt 12), Auswahlliste bei mehreren EAN-Treffern, filterbare „was ist gerade frei"-Liste nach Spieleranzahl. Bei unbekanntem Event-`slug` ⇒ `notFound()`.
      _Definition of Done:_ Unit-Tests für die datenaufbereitenden Funktionen der Seite (Auswahl bei Mehrfachtreffern, Filteranwendung); manueller Smoke-Test: Route ohne Login erreichbar (kein Redirect zu `/login`), unbekannter Slug ⇒ 404. `pnpm test` grün.
      `git commit -m "feat: add public guest area for on-site events"`

### F — Bring & Buy Flohmarkt

- [x] **14. Prisma-Schema: Flohmarkt-Artikel und Code-Generierung**
      `prisma/schema.prisma`: `FleaMarketItemStatus`-Enum, `FleaMarketItem` (`@@map("flea_market_items")`, Index auf `eventId`, `sellerMeepleId`). `src/lib/bringbuy/codes.ts`: `nextFleaMarketItemCode(existingCodes)` (`FM-0001`, fortlaufend, lückensicher — Muster analog `nextUnitCode` aus `src/lib/inventory/codes.ts`, aber eigenständige Funktion, da anderes Präfixformat).
      _Definition of Done:_ `pnpm prisma migrate dev` fehlerfrei; Tests für die Code-Generierung (Fortlaufen inkl. Lücken). `pnpm test` grün.
      `git commit -m "feat: add flea market item model and code generation"`

- [x] **15. Artikel-Self-Service**
      `src/components/feature/bringbuy/actions.ts` (mit `requireMeeple()`): `createFleaMarketItem(eventId, title, priceEuros, description?)` (Ersteller = eigener Meeple, Status `PENDING`, Code aus Schritt 14), `updateOwnFleaMarketItem`, `deleteOwnFleaMarketItem` (nur eigene, nur solange `PENDING` oder `FOR_SALE`). `markt-view.tsx`: Formular „Artikel anlegen" innerhalb der bestehenden `/markt`-Route, eigene Artikelliste mit Status.
      _Definition of Done:_ Tests decken ab: ohne Session kein Schreibzugriff; neuer Artikel startet als `PENDING`; Bearbeiten/Löschen fremder Artikel wird abgelehnt; Löschen eines bereits `RESERVED`/`SOLD`-Artikels wird abgelehnt. `pnpm test` grün.
      `git commit -m "feat: add self-service flea market item creation"`

- [x] **16. CSV-Massenimport**
      `src/lib/bringbuy/csv.ts`: `parseFleaMarketCsv(raw)` → Liste aus `{ title, priceEuros, description? }` bzw. Zeilen-Fehler (Header-Validierung, Zahl-Parsing für `price`, robust gegenüber Windows-Zeilenumbrüchen). `src/components/feature/bringbuy/import-actions.ts`: `importFleaMarketItemsCsv(eventId, raw)` — legt alle geparsten Zeilen als eigene `PENDING`-Artikel des importierenden Mitglieds an, gibt eine Zusammenfassung (angelegt/Fehlerzeilen) zurück. UI: Datei-Upload mit Vorschau-Tabelle vor Bestätigung im Markt-Bereich.
      _Definition of Done:_ Tests decken ab: gültige CSV mit und ohne `description`; fehlerhafte Preis-Zeile wird als Fehler gemeldet statt den Import abzubrechen; leere Datei liefert eine leere, fehlerfreie Liste; Import erzeugt genau so viele Artikel wie gültige Zeilen. `pnpm test` grün.
      `git commit -m "feat: add csv bulk import for flea market items"`

- [x] **17. Kassenansicht**
      _Vorher lesen:_ ADR 0006.
      `src/components/feature/bringbuy/cashier-actions.ts` (jede Funktion prüft `hasFleaMarketRights` aus Schritt 5 zuerst): `approveFleaMarketItem(itemId)` (`PENDING → FOR_SALE`, setzt `approvedAt`/`approvedByMeepleId`), `setFleaMarketItemStatus(itemId, status)` (`FOR_SALE ⇄ RESERVED → SOLD`, keine Rückkehr aus `SOLD`), `findFleaMarketItemByCode(eventId, code)`. `admin-bringbuy-view.tsx` ersetzt `admin-bringbuy-mock-view.tsx`: Event-Auswahl, Kennzahlen-Kacheln (gelistet/verkauft heute/Umsatz/reserviert — echte Aggregation statt Mock-Zahlen), Artikelliste mit Status-Wechsel, Codesuche statt „QR scannen" (kein physisches Etikett, siehe Annahmen), Freigabe-Aktion für `PENDING`-Artikel. Route bleibt `/admin/bringbuy`, aber Zugriff jetzt über `hasFleaMarketRights` statt einer festen Permission (Seiten-Guard prüft Session + Recht, nicht nur `events:manage`). `src/data/bringbuy.ts` entfernen.
      _Definition of Done:_ Tests decken ab: ohne Recht (keine `events:manage`-Permission, keine aktive `KASSE`-Buchung) → Fehler ohne DB-Änderung; Freigabe setzt `approvedAt`/`approvedByMeepleId` genau einmal; `SOLD → *` wird abgelehnt; Statistik-Aggregation zählt nur Artikel des ausgewählten Events. `pnpm build` ohne Referenz auf `src/data/bringbuy.ts`. `pnpm test` grün.
      `git commit -m "feat: replace mock bring and buy cashier view with shift-gated access"`

- [x] **18. Flohmarkt-Artikel im Gäste-Bereich**
      `guest-area-view.tsx` (aus Schritt 13) um eine Artikelliste erweitern: alle Artikel des Events mit Status `FOR_SALE` oder `RESERVED` (nie `PENDING`), mit Preis und Status-Badge. Datenzugriff über eine neue, reine Funktion in `src/lib/events/guest-area.ts` (kein Duplikat der Kassenansicht-Query).
      _Definition of Done:_ Test deckt ab: `PENDING`-Artikel erscheinen nicht in der Gäste-Liste, `FOR_SALE`/`RESERVED`/`SOLD` korrekt behandelt (verkaufte Artikel je nach Entscheidung ein-/ausgeblendet — hier: ausgeblendet, da nicht mehr erwerbbar). `pnpm test` grün.
      `git commit -m "feat: show approved flea market items in the guest area"`

### G — Abschluss

- [x] **19. Dashboards mit Event-Daten**
      `src/lib/dashboard.ts` erweitern: Mitglieder-Dashboard-Platzhalter „Anstehende Schichten" (aus Phase 5, Schritt 21) durch echte Aggregation der eigenen `ShiftBooking`s der nächsten Events ersetzen. Admin-Dashboard: Kennzahl „aktive Events" (Events mit `endsAt` in der Zukunft oder ohne `endsAt`) ergänzen.
      _Definition of Done:_ Tests decken ab: eigene Schicht-Buchungen korrekt aggregiert, vergangene Events ausgeschlossen; Admin-Kennzahl zählt nur zukünftige Events. `pnpm test` grün.
      `git commit -m "feat: populate dashboards with event and shift data"`

- [x] **20. Roadmap- und Schema-Doku aktualisieren**
      `docs/schema.md`: Stand-Markierungen der in diesem Plan migrierten Tabellen von 🔜 Phase 6 auf ✅ migriert umstellen (`events`, `event_shelf_assignments`, `shifts`, `shift_bookings`, `explainer_games`, `explainer_attendances`, `flea_market_items`, `board_games.explainerVideoUrl`, Permission `events:manage`). `docs/roadmap.md`: Meilensteine 6.1–6.4 auf `[x]`.
      _Definition of Done:_ Roadmap und Schema-Doku spiegeln den umgesetzten Stand; `CONTEXT.md` und die ADRs bleiben unverändert gültig. Kein Code, keine Tests.
      `git commit -m "docs: mark phase 6 milestones complete"`

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Claude Sonnet 5) als Standard für alle Schritte.
- **Reasoning/Thinking:** an. Hoher Effort für Schritt 12 (Standort-Ketten-Ermittlung „im Raum" über mehrere Ebenen — dieselbe Fehlerklasse wie die Verantwortlichkeits-Kette in Phase 5) und Schritt 5/17 (zeitgebundene Rechte-Ableitung nach ADR 0006, an der zwei Folge-Schritte hängen). Mittlerer Effort für 2, 4, 6, 8, 9, 10, 11, 14, 15, 16, 18, 19. Niedriger Effort genügt für 0, 1, 3, 13, 20.
- **Begründung:** Kein Schritt in Phase 6 erreicht die Risikotiefe von Phase 5 (keine Kryptografie, keine irreversible Anonymisierung, kein handgeschriebener DB-Constraint). Die zwei heiklen Stellen sind fachlich statt technisch riskant: eine falsch bestimmte „im Raum"-Kette zeigt Gästen ein Spiel, das gar nicht da ist, und eine falsch abgeleitete Kassenberechtigung (ADR 0006) öffnet oder sperrt die Flohmarkt-Kasse zur falschen Zeit. Beides ist über gezielte Tests in Schritt 5 und 12 gut eingrenzbar, verdient aber höhere Sorgfalt als die übrige, konventionelle CRUD- und Formular-Arbeit entlang etablierter Repo-Muster.
