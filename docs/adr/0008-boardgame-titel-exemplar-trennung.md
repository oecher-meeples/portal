---
status: accepted
supersedes: 0001-ludothek-aufenthalte-statt-exemplare.md (teilweise)
---

# BoardGame-Datenmodell: Titel und Exemplar getrennt

ADR 0001 hatte eine getrennte Titel-/Exemplar-Ebene bewusst verworfen, unter der Bedingung, sie "nicht wieder vorzuschlagen, ohne dass es echte Duplikate gibt". Diese Bedingung ist inzwischen erfüllt: die Vereins-Ludothek hat mehrere Exemplare desselben Titels (z. B. zwei Kartons „Catan"), und private BGG-Sammlungen führen zu Meeple-Titel-Beziehungen, die nichts mit dem physischen Vereinsbestand zu tun haben. `BoardGame` mischte bisher beides in einer Zeile. Diese ADR trennt: `BoardGame` bleibt reine Titel-/Produkt-Metadaten (BGG-Daten, ein Datensatz pro Titel), neu hinzu kommt `GameCopy` als Exemplar-Ebene (Zustand, Inventarstatus, Standort-Kette über `GameHolding`).

## Considered Options

- **Beim bisherigen Modell bleiben, Duplikate über zusätzliche `BoardGame`-Zeilen mit gleicher `bggId`/`ean` abbilden:** war die ADR-0001-Lösung, bricht aber jetzt, weil private Sammlungen (`PrivateGameCollectionEntry`) denselben Titel unabhängig vom Vereinsbestand referenzieren müssen und BGG-Metadaten (Beschreibung, Bild, Spieleranzahl) pro Exemplar dupliziert und bei Änderungen inkonsistent würden.
- **Titel und Exemplar getrennt, `GameCopy` mit `boardGameId`-FK:** ein Titel-Datensatz pro Produkt, beliebig viele Exemplare. Bevorzugt — löst die Duplikat- und Sammlungs-Fälle, ohne die in ADR 0001 etablierte Aufenthalts-Logik (`GameHolding`) anzutasten; die zeigt künftig auf `GameCopy` statt auf `BoardGame`.
- **Volles Expand/Contract über mehrere Deploys für die Datenmigration:** nicht nötig — der bestehende Datenbestand ist eine kleine Vereinsbibliothek ohne Produktions-Live-Daten zum Zeitpunkt der Migration, eine einzelne transaktionale Migration reicht.

## Consequences

- `BoardGame` behält `bggId` (jetzt `@unique`, nullable), `title`, `ean`, `minPlayers`, `maxPlayers`, `playTimeMinutes`, `weight`, `imageUrl`, `description`, `mechanics`, `explainerVideoUrl`, `kind`. `quantity`/`location` entfallen endgültig (waren bereits als Cleanup vorgemerkt).
- `GameCopy` bekommt `slug` (unique), `boardGameId`, `condition`, `needsCompletenessCheck`, `lastCheckedAt`, `status`, `archivedAt`, `archivedReason` — alles, was bisher exemplarbezogen war.
- `GameHolding.boardGameId` wechselt auf `GameHolding.gameCopyId` — die Aufenthalts-Logik aus ADR 0001 bleibt unverändert, zeigt nur auf eine andere Tabelle.
- `GameCollection` (Grundspiel↔Erweiterung), `ExplainerGame`, `SparePartListing` bleiben auf Titel-Ebene — eine Erweiterung, ein Erklärbär-Profil oder ein Ersatzteil gehört zum Titel, nicht zum einzelnen Exemplar.
- `PrivateGameCollectionEntry` referenziert künftig `BoardGame` (Titel) per FK statt eigene Titel-Metadaten zu duplizieren, bleibt aber ein eigenständiges Modell (Meeple ↔ Titel ↔ `syncedAt`) — es entsteht **kein** `GameCopy` für Privatbesitz, private Sammlungen kennen keine Exemplare.
- `onDelete` von Exemplar zu Titel ist `Restrict`, nicht `Cascade`: ein Titel mit noch existierenden Exemplaren darf nicht durch versehentliches Löschen seine Exemplare mitreißen.
- Der bisherige `_Avoid_`-Hinweis zu „Exemplar" bei der `Spiel`-Definition in `CONTEXT.md` entfällt — der Begriff wird jetzt aktiv gebraucht.
- ADR 0001 bleibt bestehen (die Aufenthalts-Modellierung ist weiterhin gültig), wird aber im dort verworfenen Punkt zur Titel-/Exemplar-Trennung von dieser ADR abgelöst.
