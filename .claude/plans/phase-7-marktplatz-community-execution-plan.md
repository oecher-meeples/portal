# Ausführungsplan: Phase 7 — Nice-to-Haves, Community-Marktplatz & Feinschliff

- **Erstellt/Aktualisiert:** 2026-08-03 00:00
- **Ziel:** Ersatzteillager und ganzjähriger Kleinanzeigen-Marktplatz (Ablösung der bestehenden Mock-Views unter `/markt`), erweiterte Community-Profilfelder (Telegram/Signal/Discord), eine Crowdsourced-Ludothek-Erweiterung der Spielsuche (gespeist aus zwei per Seed angelegten Demo-Mitgliedern statt eines echten BGG-Sync, siehe Hinweis unten) und ein anonymisiertes Statistiken-Dashboard (Meilensteine 7.1–7.4 aus `docs/roadmap.md`).
- **Quelle:** `docs/roadmap.md` (Abschnitt „Phase 7"), `CONTEXT.md` (verbindliches Glossar — Phase 7 selbst ist dort noch nicht dokumentiert, wird in Schritt 16 ergänzt), `docs/features.md` (2.12, 2.13, Priorisierung „Phase 7"), bestehende Mock-Daten `src/data/market.ts` und Mock-Views `src/components/feature/markt/`.
- **Git-Base-State:** Branch `app-akademie`, HEAD `34215d7df8105d9a47483c75dbfc435ccf0c184d`

> **Fachsprache:** Phase 7 führt neue Begriffe ein (Ersatzteillager-Eintrag, Kleinanzeige, Community-Kontaktfeld, Privatbesitz-Eintrag), die `CONTEXT.md` noch nicht kennt. Schritt 16 ergänzt sie dort — bis dahin gilt die Definition in diesem Plan als vorläufig verbindlich. Bestehende Begriffe (Spiel, Deinventarisierung, Verwahrer, Aufenthalt) unverändert aus `CONTEXT.md` übernehmen, nicht neu erfinden.

> **Reihenfolge weicht von der Meilenstein-Nummerierung ab:** Die Kleinanzeigen-Kontaktfunktion („Direktkontakt via Telegram/Mail") braucht die Profilfelder aus Meilenstein 7.3. Dieser Plan baut deshalb zuerst die Profil-Erweiterung (Gruppe B), dann Ersatzteillager/Kleinanzeigen (Gruppe C/D), dann die Privatbesitz-Daten und Crowdsourced-Suche (Gruppe E), dann das Statistiken-Dashboard (Gruppe F). Inhaltlich bleiben alle vier Meilensteine vollständig abgedeckt.

> **BGG-Import funktioniert aktuell nicht:** Wie schon beim Spiele-Import (Meilenstein 4.3, siehe Kommentar in `prisma/seed-data/demo-games.ts`) und der Erweiterungs-Zuordnung (`.claude/plans/live-review-issues-24-33-execution-plan.md`, #12) antwortet `boardgamegeek.com` aus dieser Umgebung mit 401/403 auf jede Anfrage. Der in der Roadmap für 7.3 vorgesehene **echte BGG-Sammlungs-Sync wird deshalb in diesem Plan übersprungen** — kein `fetchBggCollection`, kein Sync-Button. Stattdessen legt Schritt 12 zwei Demo-Mitglieder mit je 30 privaten, nicht im Vereinsbestand geführten Spielen per Seed an, damit die Crowdsourced-Suche (Schritt 13) gegen reale Daten entwickelt und getestet werden kann. Der echte Sync bleibt eine spätere Ergänzung, sobald #12 behoben ist — analog zur bestehenden Behandlung der Erweiterungs-Zuordnung.

## Persona

Du bist ein erfahrener Fullstack-TypeScript-Entwickler mit Schwerpunkt Next.js 15/16 (App Router, Server Actions), Prisma/PostgreSQL inkl. handgeschriebener Migrationen und dem bestehenden BGG-XML-Client (`src/lib/bgg/client.ts`). Du arbeitest inkrementell und testgetrieben, hältst dich strikt an die Repo-Konventionen: Domänenlogik in flachen Modulen unter `src/lib/<thema>/` mit co-lokalisierten `.test.ts`, dünne Server-Actions je Feature-Ordner unter `src/components/feature/<bereich>/actions.ts` mit Permission- bzw. Meeple-Check als erster Zeile, Prisma-Mocks über `src/lib/__mocks__/prisma.ts`. Du ersetzt Mock-Views (`*-mock-view.tsx`, `src/data/*.ts`) durch echte, datenbankgestützte Versionen, wie es die Phasen 5 und 6 bereits mit `helferplan.ts`/`bringbuy.ts` vorgemacht haben.

## Getroffene Annahmen

Alles Folgende ist aus dem bestehenden Repo abgeleitet bzw. sind die einfachsten Regeln, die die Roadmap-Fragen beantworten. Nicht aus dem Nutzer-Chat geklärt — bei Ausführung kurz gegenlesen, ob die Annahme noch trägt.

### Scope

- **Ein Plan über 7.1–7.4.** Meilenstein 7.1 (Konzeption) wird durch die Datenmodell-Entscheidungen unten sowie den `CONTEXT.md`-Ergänzungsschritt (16) abgedeckt.
- **Nicht in diesem Plan:** Zahlungsabwicklung/Treuhand für Kleinanzeigen (bewusst außerhalb des Portals, wie schon beim Flohmarkt in Phase 6), Reservierungs-/Chat-Funktion für Kleinanzeigen (Kontakt läuft über Mail/Telegram außerhalb des Portals), Push-Benachrichtigungen bei neuen Kleinanzeigen, Foto-Moderation/-Freigabe für Kleinanzeigen-Bilder (Self-Service ohne Freigabeprozess, analog LFG-Gesuchen), **echter BGG-Sammlungs-Sync** (BGG-API aktuell blockiert, siehe Hinweis oben — `syncOwnBggCollection`/`fetchBggCollection` werden nicht gebaut; die Roadmap-Formulierung „optionale BGG-Sammlungs-Synchronisation" gilt für diesen Plan als durch Demo-Daten ersetzt, nicht als erledigt).
- **Dummy-Spiel „Allgemeines" (roadmap-offene Frage in 7.1):** **kein** Dummy-`BoardGame`-Datensatz. `SparePartListing.boardGameId` ist nullable — `null` **ist** „Allgemeines" (kein Fake-Spiel, keine Sonderbehandlung in Ludothek-Queries, die ohnehin nie auf Ersatzteillager-Einträge schauen).
- **Kein Vereinsheim (`CONTEXT.md`):** Ersatzteillager-Einträge brauchen einen `keeperMeepleId` (Pflichtfeld) statt eines physischen Orts — wer die Teile gerade hat, analog `StorageUnit.keeperMeepleId`.
- **Kein Abhol-/Verkauft-Workflow im Portal:** Weder Ersatzteillager-Einträge noch Kleinanzeigen brauchen einen Status (`SOLD`/`TAKEN`) oder eine Historie — beide sind reine Self-Service-Listen ohne Buchhaltung (analog `CONTEXT.md` „Flohmarkt-Artikel: keine Auszahlungsbuchhaltung"). Erledigt = gelöscht (durch Ersteller bzw. `games:manage` beim Ersatzteillager).

### Datenmodell (englische Bezeichner)

- **`Meeple`-Ergänzung:** `telegramHandle String?`, `signalHandle String?`, `discordHandle String?` — analog den bestehenden `bggUsername`/`bgaUsername`-Feldern, gleiche Bearbeitungsstelle (`profil`).
- **`SparePartListing`** (Ersatzteillager) — `id`, `title` (Pflicht, z. B. „Allgemeines" oder Spieltitel-Bezug), `boardGameId String?` (Herkunftsspiel, `onDelete: SetNull` — ein hart gelöschtes `BoardGame` gibt es nicht, aber defensiv), `condition String` (Freitext, analog `BoardGame.condition`), `description String?`, `keeperMeepleId String` (Pflicht, `onDelete: Restrict` — kein Eintrag ohne jemanden, der ihn gerade hat), Zeitstempel. `@@map("spare_part_listings")`.
- **`MarketListing`** (Kleinanzeige) — `id`, `sellerMeepleId String` (`onDelete: Cascade`), `title`, `description`, `priceEuros Int`, `condition String` (Freitext), `imageUrls String[]` (analog `BoardGame.mechanics String[]` — kein eigenes Bild-Model nötig, Reihenfolge = Array-Reihenfolge), Zeitstempel. `@@map("market_listings")`.
- **`PrivateGameCollectionEntry`** (Privatbesitz-Eintrag — Datenmodell für einen künftigen BGG-Sync, aktuell per Seed befüllt, siehe Hinweis oben) — `id`, `meepleId String` (`onDelete: Cascade`), `bggId Int`, `title`, `imageUrl String?`, `minPlayers Int?`, `maxPlayers Int?`, `playTimeMinutes Int?`, `syncedAt DateTime`, `@@unique([meepleId, bggId])`, `@@map("private_game_collection_entries")`. Kein `weight`/`mechanics` — der BGG-Collection-Endpunkt liefert sie ohnehin nicht zuverlässig, Crowdsourced-Suche filtert entsprechend nur nach Spieleranzahl/Dauer.
- **Keine neue Permission nötig:** Ersatzteillager-Anlage nutzt die bestehende `games:manage`-Permission (Anlage ist inventarnahe Admin-Arbeit, analog Deinventarisierung); Kleinanzeigen und Profilfelder sind reines Mitglieder-Self-Service (`requireMeeple()`); Statistiken-Dashboard ist für jedes eingeloggte Mitglied lesbar (`requireMember()`), keine neue Permission.

### Regeln, die sich nicht aus dem Glossar ergeben

- **Ersatzteillager-Anlage verknüpft mit Deinventarisierung:** Der bestehende Deinventarisierungs-Dialog (`admin-bestand`, Meilenstein 4.2) bekommt eine zusätzliche Checkbox „Teile ins Ersatzteillager aufnehmen" — bei Haken wird zusätzlich zur Deinventarisierung ein `SparePartListing` mit `boardGameId` auf das deinventarisierte Spiel und `keeperMeepleId` = ausführende:r Admin:in angelegt. Unabhängig davon bleibt eine eigenständige „Eintrag anlegen"-Aktion für den Dummy-Fall „Allgemeines" (kein `boardGameId`) und für lose Teile ohne Deinventarisierungs-Anlass.
- **Bild-Upload wiederverwenden statt neu bauen (DRY):** Der bestehende Cover-Bild-Upload im Blog-Editor (`post-form.tsx`, Zeilen 76–94) nutzt bereits `@vercel/blob/client` mit einem serverseitig ausgestellten Token. Für Kleinanzeigen-Bilder (mehrere Dateien) wird dieses Muster in einen gemeinsamen Hook `src/lib/utils/use-blob-upload.ts` (`uploadFiles(files, pathPrefix): Promise<string[]>`) extrahiert und **von `post-form.tsx` und der neuen Kleinanzeigen-Formular-Komponente gemeinsam genutzt** — zweite Kopie desselben Upload-Musters wird nicht angelegt.
- **Direktkontakt-Button (2.13):** `getContactLinks(meeple)` in `src/lib/members/contact.ts` liefert `{ mailHref, telegramHref }` — `mailHref` immer (`Meeple.email` ist für aktive Mitglieder gesetzt), `telegramHref` nur wenn `telegramHandle` gesetzt (`https://t.me/<handle>`, führendes `@` beim Speichern entfernen). Kein Signal-/Discord-Link im Kontakt-Button — die Roadmap nennt für 2.13 nur Mail/Telegram; Signal/Discord sind reine Profilangaben (7.3), die ein Mitglied im eigenen Profil öffentlich für andere Mitglieder einsehbar macht (siehe Spieldetailseite/Erklärbär-Kontakt in einer späteren, hier nicht geforderten Erweiterung).
- **Demo-Daten statt BGG-Sync:** Zwei Demo-Mitglieder (analog `ADMIN_USER` in `prisma/seed.ts`, eigener Login über `SEED_DEMO_MEEPLE_1_EMAIL`/`SEED_DEMO_MEEPLE_2_EMAIL` mit Fallback-Defaults) bekommen je 30 `PrivateGameCollectionEntry`-Zeilen aus einem neuen, festen Pool realer Spieltitel mit echten Wikimedia-Coverbildern (gleiches Muster wie `prisma/seed-data/demo-games.ts`) — **ohne Überschneidung** mit den Titeln in `DEMO_GAMES`/`DEMO_EXPANSIONS`, damit „nicht in der Ludothek enthalten" auch tatsächlich stimmt. `syncedAt` wird auf den Seed-Zeitpunkt gesetzt. Kein Sync-Button, keine Server-Action dafür — reine Seed-Daten.
- **Crowdsourced-Suche nur intern, kein öffentlicher Leak:** `PrivateGameCollectionEntry`-Treffer erscheinen ausschließlich in der internen Ludothek-Projektion (eingeloggt), mit sichtbarem Hinweis „im Privatbesitz von \<Anzeigename\>" — niemals in der öffentlichen Projektion (`toPublicGame`/Gäste-Bereich bleiben unverändert). Filterung ausschließlich nach Spieleranzahl/Dauer (kein `weight`/`mechanics`-Datenfeld vorhanden, siehe Datenmodell); ein eigener Toggle „auch Privatbesitz anzeigen" (Default aus) ergänzt die bestehende Filterleiste aus `src/lib/ludothek/browser.ts`.
- **Statistiken-Dashboard ist anonymisiert:** `src/lib/statistics/loan-stats.ts` aggregiert ausschließlich Zählwerte — `mostBorrowedGames(holdings, boardGames, limit)` (Anzahl `LOAN`/`HANDOVER`-Aufenthalte je Spiel, absteigend) und `mostActiveLoanWeekdays(holdings)` (Histogramm über `startedAt.getDay()` für `LOAN`/`HANDOVER`-Aufenthalte). Keine Meeple-Namen, keine Verweise auf einzelne Ausleihvorgänge — reine, gut testbare Funktionen über bereits vorhandene `GameHolding`-Daten (kein neues Tracking-Model).
- **Mock-Abbau:** `src/data/market.ts` sowie `market-listing-mock-view.tsx`, `markt-browser.tsx` (Mock-Variante) werden entfernt, sobald die jeweiligen Views echte Daten lesen — analog dem Vorgehen in Phase 5/6 bei `helferplan.ts`/`bringbuy.ts`. Vorher alle Referenzen prüfen und mit umstellen.
- **Testframework:** Vitest ist bereits eingerichtet — der Template-Setup-Schritt entfällt.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch. Fachbegriffe konsistent verwenden (siehe Hinweis zu `CONTEXT.md` oben).
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt). Bestehende Bausteine (`useAction`, `ActionButton`, `ActionDialog`, `TextField`/`TextAreaField`, `CodeScanner`, `format.ts`-Helfer) wiederverwenden statt neu bauen.
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf `CONTEXT.md` oder diesen Plan.
- Dateien über 400 Zeilen möglichst in kleinere Dateien aufteilen.
- **Unit-Tests:** Für neue Logik/Funktionen Unit-Tests schreiben. Die Definition of Done eines Schritts gilt erst als erfüllt, wenn die zugehörigen Tests grün sind (`pnpm test`). Ausgenommen sind rein mechanische/nicht-testbare Schritte (Config, Doku, reines Layout/Routing).
- **Committe nur Dateien, die du selbst geschrieben hast** — gezieltes `git add <datei>`, kein `git add -A`/`git add .`.
- **Blockierende Prozesse:** Du darfst Prozesse beenden, die für einen Schritt benötigte Ressourcen blockieren (laufender `next dev` auf dem Port, Prisma-Lock). Gezielt identifizieren, nur diesen beenden, Schritt nicht abbrechen.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert: < 1 h Arbeit).
- **Bei Fehlschlag eines Schritts:** prüfen, ob die Definition of Done teilweise erfüllt ist. Falls ja, Teilstand mit `wip:`-Präfix committen; falls nein, nichts committen. In beiden Fällen den Schritt mit `[!]` markieren, den Fehler als Stichpunkt darunter notieren und **mit dem nächsten Schritt fortfahren**. Erst nachdem alle Schritte durchlaufen sind, alle offenen Punkte gesammelt auf Deutsch besprechen.
- Markiere jeden erledigten Schritt mit `[x]`, sobald er abgeschlossen und committet ist.

## Schritte

### A — Vorbereitung

- [x] **0. Repository- und Toolchain-Zustand prüfen**
      `git status` ausführen und den Ausgangszustand zur Kenntnis nehmen. `pnpm test` einmal laufen lassen (grüner Ausgangszustand). `CONTEXT.md`, `docs/features.md` (2.12/2.13) und `src/data/market.ts` sowie `src/components/feature/markt/` und `src/components/feature/bringbuy/markt-view.tsx` lesen, um die abzulösenden Mock-Stellen vollständig zu kennen.
      _Definition of Done:_ `git status` läuft fehlerfrei, `pnpm test` grün.
      Kein Commit (rein informativ).

### B — Community-Profil (Fundament für den Kontakt-Button)

- [x] **1. Prisma-Schema: Kontaktfelder am Meeple**
      `prisma/schema.prisma`: `Meeple` um `telegramHandle String?`, `signalHandle String?`, `discordHandle String?` ergänzen.
      _Definition of Done:_ `pnpm prisma migrate dev` fehlerfrei gegen die Neon-DB, `pnpm build` bricht nicht.
      `git commit -m "feat: add telegram, signal and discord fields to meeple"`

- [x] **2. Profil-Formular erweitern**
      `src/components/feature/profil/actions.ts`: `OwnProfileInput`/`updateOwnProfile` um `telegramHandle`/`signalHandle`/`discordHandle` erweitern (führendes `@` beim Speichern trimmen, analog bestehender `optionalText`-Normalisierung). `profile-details-form.tsx`: drei neue `<TextField>`-Zeilen unterhalb BGG-/BGA-Username, mit Platzhalter-Hinweis „ohne @".
      _Definition of Done:_ Tests decken ab: führendes `@` wird entfernt; leere Eingabe speichert `null`; bestehende BGG-/BGA-Felder bleiben unverändert funktionsfähig. `pnpm test` grün.
      `git commit -m "feat: extend profile form with telegram, signal and discord"`

- [x] **3. Direktkontakt-Helfer**
      `src/lib/members/contact.ts`: `getContactLinks(meeple: { email: string | null; telegramHandle: string | null })` → `{ mailHref: string | null; telegramHref: string | null }`.
      _Definition of Done:_ Tests decken ab: beide Felder gesetzt → beide Links; nur `email` → nur `mailHref`; keins gesetzt → beide `null`; `telegramHandle` ohne führendes `@` (bereits normalisiert aus Schritt 2) ergibt einen korrekten `t.me`-Link. `pnpm test` grün.
      `git commit -m "feat: add direct-contact link helper"`

### C — Ersatzteillager

- [x] **4. Prisma-Schema: SparePartListing**
      `prisma/schema.prisma`: `SparePartListing` (`@@map("spare_part_listings")`, Index auf `boardGameId`, `keeperMeepleId`).
      _Definition of Done:_ `pnpm prisma migrate dev` fehlerfrei, `pnpm build` bricht nicht.
      `git commit -m "feat: add spare part listing model"`

- [x] **5. Ersatzteillager-Verwaltung (Admin)**
      `src/components/feature/admin-bestand/spare-part-actions.ts` (mit `requirePermission("games:manage")`): `createSparePartListing(input)`, `deleteSparePartListing(id)`. Deinventarisierungs-Dialog (bestehender Flow aus Meilenstein 4.2) um Checkbox „Teile ins Ersatzteillager aufnehmen" erweitern — bei Haken zusätzlicher `createSparePartListing`-Aufruf mit `boardGameId` und `keeperMeepleId` = aktuell angemeldete:r Admin:in, innerhalb derselben Transaktion wie die Deinventarisierung.
      _Definition of Done:_ Tests decken ab: fehlende Permission → Fehler ohne DB-Änderung; Deinventarisierung mit gesetzter Checkbox legt genau einen `SparePartListing` an; ohne Checkbox keinen; Löschen entfernt genau den einen Eintrag. `pnpm test` grün.
      `git commit -m "feat: add spare part listing administration"`

- [x] **6. Ersatzteillager-Ansicht (Mitglieder)**
      `src/lib/inventory/spare-parts.ts`: reine Datenaufbereitungsfunktion `toSparePartListingView(listing, keeper)` (Titel, Zustand, Kurzbeschreibung, Verwahrer-Anzeigename als Abhol-Hinweis). `src/components/feature/markt/spare-part-listing-view.tsx` ersetzt `market-listing-mock-view.tsx`-Pendant für den Ersatzteillager-Tab in `markt-browser.tsx` (echte Daten statt `SparePartListing`-Mock-Typ aus `src/data/market.ts`). `src/app/markt/page.tsx` lädt `SparePartListing`s aus Prisma statt `SPARE_PART_LISTINGS`.
      _Definition of Done:_ Test deckt die Aufbereitungsfunktion ab (Verwahrer-Name korrekt aufgelöst, `boardGameId: null` zeigt „Allgemeines"-Titel unverändert). Manueller Smoke-Test: `/markt` zeigt reale Ersatzteillager-Einträge. `pnpm test` grün.
      `git commit -m "feat: back the spare part lager view with real data"`

### D — Kleinanzeigen-Marktplatz

- [x] **7. Gemeinsamer Blob-Upload-Hook (DRY-Extraktion)**
      _Vorher lesen:_ `post-form.tsx` Zeilen 76–94 (bestehendes Upload-Muster), zugehörige Server-Route/Action, die das Upload-Token ausstellt.
      `src/lib/utils/use-blob-upload.ts`: `useBlobUpload(pathPrefix)` → `{ uploadFiles(files: File[]): Promise<string[]>; isUploading: boolean; error: string | null }`, kapselt Token-Anfrage + `put()` je Datei. `post-form.tsx` auf den neuen Hook umstellen (Verhalten unverändert, nur Extraktion).
      _Definition of Done:_ Bestehender Cover-Bild-Upload-Test (falls vorhanden) bleibt grün; neuer Test für `useBlobUpload` (Mehrfach-Upload, Fehlerfall). `pnpm test` grün.
      `git commit -m "refactor: extract shared blob upload hook from the post editor"`

- [x] **8. Prisma-Schema: MarketListing**
      `prisma/schema.prisma`: `MarketListing` (`@@map("market_listings")`, Index auf `sellerMeepleId`).
      _Definition of Done:_ `pnpm prisma migrate dev` fehlerfrei, `pnpm build` bricht nicht.
      `git commit -m "feat: add market listing model"`

- [x] **9. Kleinanzeigen-Self-Service**
      `src/components/feature/markt/actions.ts` (mit `requireMeeple()`): `createMarketListing(input)` (Ersteller = eigener Meeple), `updateOwnMarketListing`, `deleteOwnMarketListing` (nur eigene). `markt-browser.tsx`: Formular „Anzeige inserieren" (Titel, Zustand, Preis, Beschreibung, Bilder-Upload über `useBlobUpload` aus Schritt 7), eigene Anzeigen bearbeitbar/löschbar in der Liste.
      _Definition of Done:_ Tests decken ab: ohne Session kein Schreibzugriff; Bearbeiten/Löschen fremder Anzeigen wird abgelehnt; `imageUrls` wird als Array korrekt gespeichert (0..n Bilder). `pnpm test` grün.
      `git commit -m "feat: add self-service market listing creation"`

- [x] **10. Kleinanzeigen-Übersicht & Detailseite mit echten Daten**
      `src/app/markt/page.tsx`: `MARKET_LISTINGS` durch echte `MarketListing`-Abfrage (inkl. Filter Preis/Zustand über `searchParams`, analog Ludothek-Filterkonvention) ersetzen. `src/app/markt/[id]/page.tsx`: `getMarketListing`-Mock durch `prisma.marketListing.findUnique` ersetzen, `generateStaticParams` entfernen (dynamische Route, echte IDs). Detailseite nutzt `getContactLinks` (Schritt 3) für den „Verkäufer kontaktieren"-Button (Mail immer, Telegram wenn vorhanden).
      _Definition of Done:_ Manueller Smoke-Test: Übersicht und Detailseite zeigen reale Anzeigen inkl. Bildergalerie und funktionierendem Kontakt-Button; unbekannte ID ⇒ `notFound()`. `src/data/market.ts`, `market-listing-mock-view.tsx` entfernt, `pnpm build` ohne Referenz darauf. `pnpm test` grün.
      `git commit -m "feat: replace mock market listings with database-backed marketplace"`

### E — Privatbesitz-Demo-Daten & Crowdsourced-Ludothek

- [x] **11. Prisma-Schema: PrivateGameCollectionEntry**
      `prisma/schema.prisma`: `PrivateGameCollectionEntry` (`@@map("private_game_collection_entries")`, `@@unique([meepleId, bggId])`, Index auf `meepleId`).
      _Definition of Done:_ `pnpm prisma migrate dev` fehlerfrei, `pnpm build` bricht nicht.
      `git commit -m "feat: add private game collection entry model"`

- [x] **12. Demo-Daten: zwei Demo-Mitglieder mit je 30 privaten Spielen**
      _Vorher lesen:_ Kommentar in `prisma/seed-data/demo-games.ts` (Zeilen 1–8, BGG-Blockade-Begründung) — hier dasselbe Muster fortsetzen, kein echter BGG-Import.
      `prisma/seed-data/demo-private-collection.ts`: neuer, fester Pool von **60 realen Spieltiteln mit echten Wikimedia-/Wikipedia-Coverbildern** (gleiche Datenqualität wie `DEMO_GAMES`, aber **ohne jede Titel-Überschneidung** mit `DEMO_GAMES`/`DEMO_EXPANSIONS` — geprüft per Set-Vergleich im Seed-Skript, nicht nur von Hand), mit `bggId` (reale BGG-IDs für Konsistenz mit dem Datenmodell), `title`, `imageUrl`, `minPlayers`, `maxPlayers`, `playTimeMinutes`. `prisma/seed.ts`: zwei Demo-Nutzer `SEED_DEMO_MEEPLE_1`/`SEED_DEMO_MEEPLE_2` (Muster wie `ADMIN_USER`/`upsertNeonAuthUser`, Rolle `mitglied`, Env-Var-Overrides mit Fallback-Defaults für E-Mail/Passwort), je ein `Meeple`, dann die ersten 30 bzw. die zweiten 30 Titel aus dem neuen Pool als `PrivateGameCollectionEntry` (`syncedAt: new Date()`) zugeordnet.
      _Definition of Done:_ `pnpm db:seed` läuft idempotent (erneuter Lauf erzeugt keine Duplikate, `upsert` bzw. Vorab-Löschen der Demo-Einträge). Test für die Titel-Überschneidungsprüfung (Pool und `DEMO_GAMES` sind disjunkt) in einer kleinen Skript-Testdatei oder als Teil eines bestehenden Seed-Datentests. `pnpm test` grün.
      `git commit -m "feat: seed two demo meeples with private game collections"`

- [x] **13. Crowdsourced-Suche in der internen Ludothek**
      _Vorher lesen:_ `src/lib/ludothek/browser.ts`, `src/lib/ludothek/query.ts` (bestehende Filter-/Query-Struktur, nicht duplizieren).
      `src/lib/ludothek/private-collection.ts`: `buildPrivateCollectionResults(filters)` (players/duration-Filter wiederverwendet aus `browser.ts`) → Liste `{ id, title, imageUrl, minPlayers, maxPlayers, playTimeMinutes, ownerMeepleId, ownerDisplayName }`. Interne Ludothek-Ansicht: Toggle „auch Privatbesitz anzeigen" (Default aus, nur intern sichtbar), zusätzlicher Abschnitt/Badge „im Privatbesitz von \<Anzeigename\>" unterhalb der Vereinsspiele-Ergebnisse. Gegen die Demo-Daten aus Schritt 12 manuell durchklicken.
      _Definition of Done:_ Tests decken ab: Filterung nach Spieleranzahl/Dauer liefert korrekte Teilmenge; Toggle aus ⇒ keine Privatbesitz-Ergebnisse; öffentliche Projektion (`toPublicGame`-Pfad) zeigt nie Privatbesitz-Einträge (Regressionstest gegen den „kein Leak"-Grundsatz). `pnpm test` grün.
      `git commit -m "feat: add crowdsourced private collection results to the internal search"`

### F — Statistiken-Dashboard

- [x] **14. Aggregations-Logik**
      `src/lib/statistics/loan-stats.ts`: `mostBorrowedGames(holdings, boardGames, limit = 10)`, `mostActiveLoanWeekdays(holdings)` — reine Funktionen wie in den Annahmen beschrieben, ausschließlich Zählwerte, keine Meeple-Referenzen im Rückgabewert.
      _Definition of Done:_ Tests decken ab: korrekte Rangfolge nach Ausleihanzahl inkl. Gleichstand-Verhalten (stabil nach Titel sortiert); Wochentags-Histogramm über mehrere Zeitzonen-unabhängige Testfälle; `HANDOVER` zählt wie `LOAN`, andere `HoldingOrigin`-Werte nicht. `pnpm test` grün.
      `git commit -m "feat: add anonymised loan statistics aggregation"`

- [x] **15. Statistiken-Seite**
      Route `src/app/statistiken/page.tsx` (mit `requireMember()`). `statistiken-view.tsx`: „Beliebteste Spiele" (Top-10-Liste mit Ausleihzahl), „Aktivste Ausleihtage" (Balken je Wochentag) — beide rein clientseitig aus den in Schritt 14 aggregierten Daten gerendert, keine neuen Chart-Bibliotheken (bestehende `Card`/`Progress`-Bausteine aus `components/ui/` wiederverwenden). Navigationseintrag in `src/lib/utils/nav-config.ts` (Mitgliederbereich-Gruppe).
      _Definition of Done:_ Manueller Smoke-Test: Seite lädt ohne Fehler mit realen Bestandsdaten, zeigt keine Meeple-Namen. `pnpm test` grün (bestehende Tests weiterhin grün, keine neue Logik in der View selbst).
      `git commit -m "feat: add anonymised loan statistics dashboard"`

### G — Abschluss

- [x] **16. `CONTEXT.md` um Phase-7-Begriffe ergänzen**
      Neuer Abschnitt „Marktplatz & Community" mit den Begriffen Ersatzteillager-Eintrag, Kleinanzeige, Privatbesitz-Eintrag (inkl. `Avoid`-Hinweisen, analog bestehendem Format). Hinweis auf den vorerst nur per Demo-Daten befüllten Privatbesitz-Eintrag ergänzen (kein echter Sync, siehe oben).
      _Definition of Done:_ Begriffe sind eindeutig definiert, keine Kollision mit bestehendem Vokabular. Kein Code, keine Tests.
      `git commit -m "docs: document phase 7 vocabulary in context glossary"`

- [x] **17. Roadmap- und Schema-Doku aktualisieren**
      `docs/schema.md`: Stand-Markierungen der in diesem Plan migrierten Tabellen von 🔜 Phase 7 auf ✅ migriert umstellen (`spare_part_listings`, `market_listings`, `private_game_collection_entries`, `meeples.telegramHandle`/`signalHandle`/`discordHandle`). `docs/roadmap.md`: Meilensteine 7.1, 7.2, 7.4 auf `[x]`; Meilenstein 7.3 nur den Profilfelder-Unterpunkt abhaken, den BGG-Sync-Unterpunkt mit einem Hinweis versehen, dass er mangels erreichbarer BGG-API übersprungen und durch Demo-Daten für zwei Mitglieder ersetzt wurde (analog dem bestehenden Hinweis zur Instagram-Inaktivität in Phase 3). `docs/features.md`: Abschnitte 2.12/2.13 bei Bedarf an den tatsächlich umgesetzten Stand angleichen.
      _Definition of Done:_ Roadmap und Schema-Doku spiegeln den umgesetzten Stand inkl. des offenen BGG-Sync-Punkts; `CONTEXT.md` bleibt konsistent mit Schritt 16.
      `git commit -m "docs: mark phase 7 milestones complete"`

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Claude Sonnet 5) als Standard für alle Schritte.
- **Reasoning/Thinking:** an. Hoher Effort für Schritt 13 (Crowdsourced-Suche darf unter keinen Umständen in die öffentliche Projektion durchsickern — sicherheitsrelevanter Datenschutz-Fall, nicht nur ein Feature-Bug). Mittlerer Effort für 1, 2, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15. Niedriger Effort genügt für 0, 3, 11, 16, 17.
- **Begründung:** Phase 7 hat keine kryptografischen oder transaktionalen Constraints wie Phase 4/5. Der BGG-Sync selbst entfällt als Risikofaktor komplett (siehe Hinweis oben — die API ist unerreichbar, daher wird sie gar nicht erst gebaut). Die eine verbleibende heikle Stelle ist fachlich riskant statt technisch: ein Leak von Privatbesitz-Daten in die öffentliche Ludothek-Projektion wäre ein Datenschutzproblem (zeigt an, wer welche Spiele privat besitzt, ohne Login) und verdient einen gezielten Regressionstest. Der Rest folgt etablierten CRUD- und Formular-Mustern aus Phase 5/6; Schritt 12 (Demo-Daten) ist mechanisch, aber wegen der Pool-Disjunktheit zu `DEMO_GAMES` sorgfältig zu prüfen.
