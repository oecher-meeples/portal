# Plan: Want-to-Play-Import und Profilkarte „Das möchte ich spielen“

- **Stand:** 2026-11-25
- **Issue:** #637 (Folge-Issue Auswertung Vorstand: #638, nicht Teil dieses Plans)
- **Basis:** `origin/develop` (#632 ist per PR #639 gemergt). Branch `feature/637-want-to-play-import`, ein einziger PR mit allen Phasen.
- **Regeln:** `CLAUDE.md` (Schichten, DRY, max. 400 Zeilen, `pnpm run verify` vor Push, Push über PowerShell, kein Squash-Merge).

## Ziel

Eine einzige Quelle für „Want to Play“: `game_want_to_play`. Der BGG-Import füllt sie
optional mit **allen** Want-to-Play-Spielen einer Person (auch ohne Besitz), nur
hinzufügend. Besitz inkl. „For Trade“ bleibt ein getrennter, überschreibender Import
nach `private_game_collection_entries`.

## Entscheidungen (verbindlich)

| Thema | Entscheidung |
| --- | --- |
| Überschreiben | Besitz-Import überschreibt weiter komplett; Hinweise in der UI, kein „Remember“ |
| Want-to-Play-Import | Nur hinzufügen, nie entfernen. Schalter aus: vorhandene Einträge bleiben |
| Schalter | `meeples.shareWantToPlay` wird umbenannt zu `importWantToPlay`, Werte bleiben, Default `false` (Opt-in). Hinweis unter dem Schalter: „Ausschalten stoppt nur künftige Importe. Bereits importierte Spiele bleiben sichtbar, bis du sie auf der Karte ‚Das möchte ich spielen‘ entfernst.“ Label nennt die Sichtbarkeit für alle Mitglieder |
| Entfernen | Keine Sperrliste. Entfernte Einträge kommen beim nächsten (manuellen) Import zurück, Hinweistext erklärt das |
| Stubs | Bleiben in `board_game_titles` (eine Quelle für Detailseiten); Erkennung per Heuristik, keine Spalte |
| Sichtbarkeit | Jeder Eintrag in `game_want_to_play` ist für eingeloggte Meeple sichtbar, ohne weitere Freigabe. `shareForTrade` bleibt |
| Stub | Titel gilt als Stub, wenn Beschreibung **und** `minPlayers`/`maxPlayers` leer sind (Bild zählt nicht) |
| Stub-Daten | Titel, Bild, Jahr, Durchschnittsbewertung. Vollständige Daten erst bei Besitz (Person oder Verein) |
| BGG-Abfrage | `wanttoplay=1&stats=1&excludesubtype=boardgameexpansion`, **ohne** `own`. `wishlist`/`want to buy` ignoriert |
| Besitz und Wunsch | Titel steht in beiden Listen |
| Ludothek | Unverändert: nur Titel mit Vereinsexemplar (+ Filter Privatbesitz). Reine Want-to-Play-Titel nie |
| Detailseite ohne Exemplar | Abgespeckte Katalogseite für Eingeloggte, wenn der Titel Want-to-Play-Einträge hat; sonst 404 |
| Karte „Das möchte ich spielen“ | Andere sehen sie bei nicht leerer Liste. Besitzer sieht sie immer, mit „Alles entfernen“ und rotem x |
| Nachladen | 25 Einträge je Schritt, Nachladen beim Scrollen, Cursor nach (Titel, ID) |
| Teilfehler | Schlägt nur der Want-to-Play-Teil fehl, bleibt der Job `DONE` mit separatem Fehlerfeld |
| Datenmigration | `wantToPlay = true`-Einträge nur für Meeple mit `shareWantToPlay = true` kopieren |

## Phase 1 – Datenmodell

1. `prisma/schema.prisma`:
   - `Meeple.shareWantToPlay` → `importWantToPlay` (`@default(false)`, Werte bleiben), Kommentar anpassen.
   - `PrivateGameCollectionEntry.wantToPlay` entfernen.
   - `PrivateCollectionImportJob`: `wantToPlayCount Int?`, `wantToPlayError String?`.
2. Neue Migration, von Hand geschrieben (Reihenfolge wichtig):
   ```sql
   ALTER TABLE "meeples" RENAME COLUMN "shareWantToPlay" TO "importWantToPlay";
   INSERT INTO "game_want_to_play" ("id","meepleId","boardGameId")
     SELECT gen_random_uuid()::text, e."meepleId", e."boardGameId"
     FROM "private_game_collection_entries" e
     JOIN "meeples" m ON m."id" = e."meepleId"
     WHERE e."wantToPlay" AND m."importWantToPlay"
     ON CONFLICT ("meepleId","boardGameId") DO NOTHING;
   ALTER TABLE "private_game_collection_entries" DROP COLUMN "wantToPlay";
   ALTER TABLE "private_collection_import_jobs"
     ADD COLUMN "wantToPlayCount" INTEGER, ADD COLUMN "wantToPlayError" TEXT;
   ```
   Auf der lokalen DB per `migrate deploy` anwenden (Telegram-Freigabe des Hooks nötig, Befehl ggf. einzeln senden).
3. `pnpm exec prisma generate`.

**Commit:** `feat(db): Want-to-play-Import-Schalter, Job-Felder, wantToPlay-Flag entfernt (#637)`

## Phase 2 – Stub-Erkennung (Katalog)

1. `isIncompleteStub` aus `private-collection-import.ts` nach `src/lib/ludothek/board-game-stub.ts` verschieben und umbenennen zu `isCatalogStub`: `!description && minPlayers === null && maxPlayers === null` (kein Bild).
2. `findOrCreateBoardGameTitle` (`board-game-title-lookup.ts`): Hat ein bestehender Titel (per `bggId`) den Stub-Status und liefert der Aufrufer vollständige Daten (Beschreibung oder Spielerzahl), werden die Felder aktualisiert (Contributors/Tags nur, wenn mitgeliefert). Bestehende vollständige Titel bleiben unverändert.
3. Beide Aufrufer nutzen dieselbe Funktion: `resolvePrivateTitle` (Besitz-Import) und der Vereins-Pfad (`board-games.ts`, BGG-Import beim Anlegen eines Exemplars). Prüfen, dass der Vereins-Pfad einen Stub wirklich aufwertet und nicht an „Titel existiert schon“ scheitert (Duplikat-Warnung `use-board-game-duplicate-guard.ts`: ein Stub darf nicht als echtes Duplikat blockieren).
4. Tests: `board-game-stub.test.ts`; Erweiterung der Tests von `board-game-title-lookup` (Stub wird aufgewertet, vollständiger Titel nicht überschrieben).

**Commit:** `feat(ludothek): Katalog-Stubs erkennen und bei Besitz aufwerten (#637)`

## Phase 3 – BGG-Client und Import

1. `src/lib/bgg/collection.ts`:
   - Gemeinsamen Parser `parseCollectionItems` extrahieren (DRY), Items um `yearPublished` (`yearpublished`) und `averageRating` (`stats.rating.average.value`) erweitern.
   - `BggCollectionEntry.wantToPlay` entfernen.
   - Neu: `fetchBggWantToPlay(username): Promise<BggWantToPlayEntry[]>` mit `{ bggId, title, imageUrl, yearPublished, averageRating }`; Filter auf `status.wanttoplay === "1"`. Gleiche Fehlerbehandlung (`BggCollectionUnavailableError`).
2. `private-collection-import.ts` → `runBggCollectionImport` bekommt `{ id, bggUsername, importWantToPlay }` und läuft in zwei Phasen:
   - Phase 1 (Besitz): wie bisher, ohne `wantToPlay` an den Einträgen.
   - Phase 2 (nur bei `importWantToPlay`): Titel per `findOrCreateBoardGameTitle({ title, bggId, imageUrl, yearPublished, averageRating })` anlegen, **ohne** `fetchBggGame`/Übersetzung; `gameWantToPlay.createMany({ skipDuplicates: true })`. Kein `deleteMany`.
   - Rückgabe: `{ success, imported, wantToPlay?: { count } | { error } }`; Fehler in Phase 2 macht Phase 1 nicht ungültig.
   - Die Funktion wird dafür aufgeteilt (`runOwnedImport`, `runWantToPlayImport`), damit die Datei unter 400 Zeilen bleibt.
3. `private-collection-import-queue.ts`: `claimNextJob` selektiert `importWantToPlay`; `finishJob` schreibt `importedCount`, `wantToPlayCount`, `wantToPlayError`.
4. `private-collection-sync.ts`: unverändert bis auf den neuen Parameter.
5. Tests: `collection.test.ts` (Parser: Jahr, Bewertung, Filter), `private-collection-import.test.ts` (Phase 2 an/aus, nur hinzufügen, Stub ohne `fetchBggGame`, Teilfehler), `private-collection-import-queue.test.ts` (Zähler/Fehler).

**Commit:** `feat(bgg-import): Want-to-play-Import in zweiter Phase (#637)`

## Phase 4 – Abfragen und Detailseite

1. `shared-collection-meeples.ts`:
   - „Want to Play“ liest nur noch `game_want_to_play` (kein `shareWantToPlay`-Filter, `anonymizedAt: null`).
   - „For Trade“ unverändert.
   - `hasWantToPlayMark` entfällt: Wer in der Liste steht, bekommt „Doch nicht mehr“, alle anderen „Ich will das auch spielen“ (`render-game-detail.tsx` vereinfachen).
2. Abgespeckte Katalogseite:
   - `render-game-detail.tsx`: Gibt es keine Vereins-/Privatexemplare, aber der Titel existiert und hat mindestens einen Want-to-Play-Eintrag, und der Betrachter ist intern, dann `CatalogTitleView` rendern; sonst `notFound()`.
   - Neu `src/components/feature/ludothek/catalog-title-view.tsx`: Cover (`GameCoverMedia`), Titel (`PageTitle`), Jahr, `BggRatingBadge`, die Karte „möchten das spielen“ (mit Button), BGG-Link `https://boardgamegeek.com/boardgame/<bggId>`.
3. Tests: Abfrage-Test anpassen, `catalog-title-view.test.tsx`, Test für das Seiten-Routing (Gast bekommt 404, Eingeloggter die Katalogseite).

**Commit:** `feat(ludothek): Want-to-play aus eigener Tabelle, Katalogseite für Titel ohne Exemplar (#637)`

## Phase 5 – Profil: Karte „Das möchte ich spielen“

1. `src/lib/ludothek/want-to-play-list.ts` (Domänenschicht):
   - `listWantToPlay(meepleId, { after?, take = 25 })` → `{ items, total, nextCursor }`, sortiert nach Titel, Cursor `(title, id)`; Einträge mit `boardGame { slug, title, imageUrl }`.
   - `removeWantToPlay(meepleId, boardGameId)`, `clearWantToPlay(meepleId)`.
2. Server Actions `src/components/feature/mitglied-profil/want-to-play-list-actions.ts`:
   - `loadMoreWantToPlayAction(meepleId, cursor)`: nur mit gültigem Mitgliedsstatus, für jede fremde Liste erlaubt (intern sichtbar).
   - `removeWantToPlayEntryAction(boardGameId)` und `clearWantToPlayAction()`: nur für die eigene Session (Meeple-ID nie vom Client).
3. Komponente `want-to-play-list-card.tsx` (Feature `mitglied-profil`, Client):
   - Karte mit `CardTitle` „Das möchte ich spielen“ + Zähler-Badge (Gesamtzahl).
   - Raster aus Cover (`CoverMedia`), Titel; ganzer Eintrag ein Link zur Detailseite (`/ludothek/<slug>`, neuer Tab, wie bei „Zum Tausch angeboten“).
   - `IntersectionObserver`-Sentinel lädt die nächsten 25 per `loadMoreWantToPlayAction`.
   - Besitzer: „Alles entfernen“ (Rückfrage per `ActionButton confirm`), pro Eintrag rotes x (`text-destructive`). Hinweis: „Spiele, die auf BGG als Want to Play stehen, kommen beim nächsten Import wieder, solange der Import aktiv ist.“ Entfernte Einträge werden lokal ausgeblendet, kein `router.refresh()` (wie im Dialog).
   - Besitzer sieht die Karte immer (leerer Zustand mit Erklärung); andere nur bei `total > 0`.
4. `mitglied-profil-view.tsx` ist nahe an der 400-Zeilen-Grenze: das Laden der Daten in eine Hilfsfunktion `loadWantToPlayCardData` auslagern, die Karte nur einbinden.
5. Tests: Domänenfunktionen (Paginierung, Cursor, Löschen nur eigener Einträge), Actions (Berechtigung), Komponente (Sichtbarkeit je Rolle, Entfernen, Nachladen mit gemocktem Observer).

**Commit:** `feat(profil): Karte „Das möchte ich spielen“ mit Nachladen und Entfernen (#637)`

## Phase 6 – Karte und Dialog „Meine privaten Spiele“

1. `private-collection-card.tsx`: Schalter „Meine ‚Want to Play‘ zeigen“ ersetzen durch „Want-to-play von BGG importieren“ (`importWantToPlay`) mit Hinweis „Gilt ab dem nächsten Import. Bereits importierte Einträge bleiben stehen.“ Action `setPrivateCollectionShareAction` um den Namen `importWantToPlay` ergänzen (Whitelist), `shareWantToPlay` entfernen.
2. `getOwnPrivateCollection` liefert `wantToPlay` pro Eintrag aus `game_want_to_play` (Abfrage der `boardGameId`-Menge der Person). Der Filter „Want to Play“ und der Status-Pill im Dialog nutzen diesen Wert.
3. `setPrivateCollectionEntryFlagAction`: `wantToPlay` schreibt in `game_want_to_play` (Upsert/Delete über `boardGameId` des Eintrags); `forTrade` bleibt am Eintrag.
4. Dialog: Hinweis im Bearbeiten-Modus „Löschen und For-Trade-Änderungen gelten bis zum nächsten BGG-Import (die Sammlung wird überschrieben).“
5. Import-Status (`import-job-status.tsx`): zeigt „X Spiele importiert, Y Want-to-Play“ und den Teilfehler.
6. `mitglied-profil-view.tsx`, `profile-access.ts` auf `importWantToPlay` umstellen; `private-collection.ts` bereinigen (`wantToPlay` nicht mehr an Einträgen).
7. Tests anpassen: Card-Test (Schalter, Hinweis), Actions-Test, Dialog-Test.

**Commit:** `feat(profil): Schalter „Want-to-play importieren“, Dialog nutzt game_want_to_play (#637)`

## Phase 7 – Stub-Sichtbarkeit (Audit)

Stellen, die Titel ohne Exemplar-Filter auflisten, einzeln prüfen und festhalten (Ergebnis in den PR-Text):

- `src/app/lfg/page.tsx:34`, `src/app/erklaerbaeren/page.tsx:27`, `src/app/statistiken/page.tsx:30`
- `src/lib/ludothek/board-games.ts:85` und `:358`
- Titel-Auswahl/Suche (`game-combobox.tsx`, `board-game-title-lookup.ts`, BGG-ID-Suche) und die Duplikat-Erkennung

Regel: Reine Want-to-Play-Titel (Titel ohne Vereinsexemplar, ohne Privatbesitz) erscheinen in keiner Auswahl und Statistik des Vereinsbestands. Ausnahme: die Duplikat-Erkennung muss sie finden, damit kein zweiter Titel mit derselben BGG-ID entsteht. Wo ein Filter fehlt, ergänzen (z. B. `copies: { some: … }` oder Privatbesitz). Je Fundstelle ein Test. Die Ludothek-Übersicht selbst (`buildLudothekGames`, `buildPrivateLudothekGames`) filtert bereits über Exemplare/Privateinträge; ein Regressionstest stellt sicher, dass ein Stub dort nie auftaucht.

**Commit:** `fix(ludothek): Want-to-play-Stubs aus Listen und Statistiken fernhalten (#637)`

## Phase 8 – Datenschutz

1. `src/lib/members/data-export.ts`: `GameWantToPlay` in die Entitätenliste, die Abfrage und das Ergebnisobjekt aufnehmen (mit Titel und Datum); Test ergänzen.
2. `src/lib/members/anonymisation.ts`, **Stufe 1** (entschieden): Im bestehenden `tx.meeple.update` zusätzlich `privateCollectionVisible: false` und `importWantToPlay: false` setzen (die private Sammlung `PrivateGameCollectionEntry` bleibt stehen, ist aber für andere ausgeblendet; `bggUsername` wird dort schon geleert, ein erneuter Import ist damit unmöglich). Zusätzlich `tx.gameWantToPlay.deleteMany({ where: { meepleId } })`, weil es für „Das möchte ich spielen“ keinen Sichtbarkeitsschalter mehr gibt. Klassenkommentar der Datei (Stufenbeschreibung) ergänzen. Test ergänzen.
3. **Stufe 2** (entschieden): Dort, wo `Member.meepleId` getrennt und `anonymizedAt` gesetzt wird, die private Sammlung hart löschen: `tx.privateGameCollectionEntry.deleteMany({ where: { meepleId } })` (und `game_want_to_play`, falls nicht schon durch Stufe 1 geschehen; Stufe 1 wird in Stufe 2 idempotent mit aufgerufen). Grund: Stufe 3 findet das Meeple nicht mehr, weil Stufe 2 die Verknüpfung trennt. Klassenkommentar ergänzen („Stufe 2 löscht zusätzlich die private Sammlung“). Test ergänzen (Sammlung weg, Meeple-Zeile bleibt).
4. **Stufe 3** bleibt unverändert (löscht nur die `Member`-Zeile). Löschen des Meeples: Cascade ist vorhanden.

**Commit:** `fix(datenschutz): Want-to-play im Datenexport, Anonymisierung Stufe 1/2 anpassen (#637)`

## Phase 9 – Doku und Abschluss

1. `CONTEXT.md`: Begriffe „Want to Play“, „Katalogtitel/Stub“ ergänzen. `docs/project-structure.md` nur, wenn sich Ordner ändern.
2. Seed: Demo-Daten für `game_want_to_play` ergänzen (nur Entwicklung, keine Produktionsdaten).
3. `pnpm run dup` prüfen (keine neuen Klone), `pnpm run verify` (Push über PowerShell), manuelles Durchspielen mit der lokalen DB: Import mit Schalter an/aus, Katalogseite, Profilkarte, Nachladen.
4. PR gegen `develop` (nach dem Merge von #632), Merge-Commit, kein Squash.

## Risiken und offene Punkte

- **Importdauer:** Phase 2 macht keinen Einzelabruf je Titel; nur die BGG-Collection-Abfrage (mit Warteantwort). Bei Last den Job-Fortschritt prüfen.
- **Doppelte BGG-Abfragen:** Besitz und Want to Play sind zwei Requests; die bestehende Drosselung (`BGG_REQUEST_THROTTLE_MS`) beachten.
- **Stub vs. sparsamer BGG-Eintrag:** Ein echtes Spiel ohne Beschreibung und Spielerzahl gilt dauerhaft als Stub und wird bei Besitz erneut geladen. Akzeptiert (wie bisher).
- **Katalogseite:** Zeigt nur Titel mit Want-to-Play-Einträgen; entfernen alle ihre Einträge, wird die Seite 404. Gewollt.
- **Entfernte Einträge kommen zurück:** Bei aktivem Import und Eintrag auf BGG. Gewollt, daher der Hinweis.
- **Anonymisierung:** Stufe 1 blendet die private Sammlung aus und löscht Want-to-Play, Stufe 2 löscht die Sammlung (Phase 8). Das weicht vom Wunsch „Stufe 3“ ab, weil Stufe 3 das Meeple nicht mehr findet.

## Reihenfolge und Abhängigkeiten

1 → 2 → 3 → 4 → 5/6 (parallel möglich) → 7 → 8 → 9. Phase 7 hängt an 3 (erst dann entstehen Stubs im Bestand), Phase 4 an 1 und 3.
