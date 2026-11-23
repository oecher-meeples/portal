---
status: accepted
supersedes: 0008-boardgame-titel-exemplar-trennung.md (teilweise)
---

# Detailseiten-Slug wechselt von `GameCopy` auf `BoardGame`, ohne Redirects

ADR 0008 trennte Titel (`BoardGame`) und Exemplar (`GameCopy`), ließ die Detailseite aber weiter über `GameCopy.slug` routen — bei mehreren Exemplaren eines Titels (der eigentliche Grund für ADR 0008) hatte jedes Exemplar seine eigene URL, obwohl die Seite inhaltlich den Titel zeigt. #121/#122 gruppiert die Detailseite jetzt konsequent nach Titel (Exemplar-Tabelle/-Karte statt einer Seite pro Exemplar) und braucht dafür eine Titel-Route.

## Considered Options

- **Bei `GameCopy.slug` bleiben, Detailseite lädt zusätzlich alle Schwester-Exemplare:** verworfen — die URL bliebe pro Exemplar, obwohl mehrere URLs dieselbe Titel-Seite anzeigen würden; verwirrend beim Teilen von Links und schlecht für Suchmaschinen-Indexierung.
- **`BoardGame.slug` (neu, ADR-0008-Nachtrag) als Routing-Basis, alte `GameCopy`-Slug-URLs per 301-Redirect erhalten:** aufwendiger als nötig — die Ludothek-Detailseite hat keine externe Verlinkung (kein SEO-Traffic von außen, keine Bookmarks außerhalb des Vereins) und ist noch keine Woche im aktuellen Slug-Schema live; das Redirect-Mapping hätte Dauerkosten ohne echten Nutzen.
- **`BoardGame.slug` als Routing-Basis, alte URLs brechen ohne Redirect:** bevorzugt. Backfill slugifiziert bestehende Titel (Kollisionen per Zahlen-Suffix, dieselbe Logik wie `GameCopy.slug`), `GameCopy.slug` bleibt für Admin-Deep-Links (z. B. Revalidierungs-Pfade während der Übergangsphase) erhalten, wird aber nicht mehr für die öffentliche Route benutzt.

## Consequences

- `BoardGame.slug` (`@unique`) kommt per Migration mit SQL-Backfill aus `title` hinzu; `findOrCreateBoardGameTitle`/`uniqueBoardGameSlug` generieren ihn ab jetzt bei jedem neuen Titel.
- `/ludothek/[slug]/page.tsx` löst über `BoardGame.slug` auf; `buildLudothekGames()` liefert pro Exemplar weiterhin eine Zeile, die Seite gruppiert client-seitig nach `boardGameId` für die Exemplar-Tabelle.
- Alle internen Links (`GameCard`, `GameListRow`, `GameCompactRow`, `RelatedGameCard`) zeigen auf `boardGameSlug`, nicht mehr auf `slug` (Exemplar).
- Wer eine alte `/ludothek/<exemplar-slug>`-URL aus der Zeit vor #121 offen hat, bekommt eine 404 — akzeptiert, siehe Begründung oben.
