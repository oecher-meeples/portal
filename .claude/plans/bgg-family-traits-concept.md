# Konzept: BGG-Family-Signale mit Verleih-Relevanz speichern & nutzen

Stand: 2026-10-03. Überarbeitet nach Grilling-Session (grilling-Skill) — ersetzt die
Fassung vom 2026-09-28 vollständig. Vorstufe zu einem Issue, noch keine Umsetzung.

## Ausgangslage

- Der ursprüngliche Vorstands-Wunsch ("Hinweise pro Spiel, z. B. App-Pflicht") hat
  aktuell **kein** Zuhause: weder `BoardGame` noch `GameCopy` haben ein freies
  Hinweisfeld auf Titel-Ebene (`GameCopy.condition` ist zweckgebunden für
  Zustand/Mängel des Exemplars, nicht für Produkt-Fakten).
- Fünf BGG-Family-Signale haben echten Verleih-Impact, live an mehreren Titeln
  verifiziert:

| Trait | BGG-Family (Name) | Family-ID | Verifiziert an |
|---|---|---|---|
| Legacy | `Mechanism: Legacy` | 25404 | Pandemic Legacy S1, Gloomhaven |
| Kampagne | `Mechanism: Campaign Games` | 24281 | Pandemic Legacy S1, Gloomhaven |
| Begrenzte Wiederspielbarkeit | `Misc: Limited Replayability` | 72224 | Pandemic Legacy S1 |
| Offiziell solo spielbar | `Players: Games with Solitaire Rules` / `Players: Solitaire Only Games` | 5666 / 61977 | Gloomhaven, Newton |
| App/Website-Bezug | `Components: Digital Hybrid – App/Website Required` | 41489 | Werwörter (dort nachweislich zu streng getaggt — App optional, BGG markiert "Required") |

Die `DIGITAL_HYBRID`-Family ist bekanntermaßen unzuverlässig bezüglich
"zwingend" vs. "optional". Diese Unschärfe wird **bewusst in Kauf genommen**
(siehe Abschnitt "Trait-Anzeige" unten) statt technisch aufgelöst.

## Grundentscheidung aus der Grilling-Session

Ursprünglich war angedacht, `DIGITAL_HYBRID` als Sonderfall zu behandeln (eigenes
Bool-Feld, Icon statt Pill, dynamischer "Hinweistext prüfen"-Workflow im Editor).
Das wurde verworfen zugunsten einer **vollständig generischen, daten-getriebenen
Lösung**: alle fünf Traits sind strukturell gleichartig, ihr Anzeigeverhalten
steckt in einer Konfiguration (teils Code, teils DB), nicht in verstreuten
`if (trait === "...")`-Sonderfällen im Rendering-Code.

## Datenmodell

### 1. `BoardGame.traits` — unverändert generisches Enum-Array

```prisma
enum BoardGameTrait {
  LEGACY
  CAMPAIGN
  LIMITED_REPLAYABILITY
  SOLITAIRE_SUPPORTED
  DIGITAL_HYBRID
}

model BoardGame {
  // ...
  /// BGGs Mechanism/Misc/Players/Components-Family-Signale mit
  /// Verleih-Auswirkung — beim BGG-Import über eine Family-ID-Whitelist
  /// automatisch vorbefüllt, vom Admin frei änderbar (gleiche Philosophie
  /// wie `languageDependence`).
  traits BoardGameTrait[]
  /// Freier Admin-Hinweis je Titel (z. B. "App zwingend nötig", "App
  /// optional, Wortmeister-Alternative vorhanden") — nicht aus BGG
  /// automatisch befüllt. Titel-Ebene (nicht `GameCopy`), da ein Produkt-Fakt,
  /// keine Exemplar-Eigenschaft. Teil des bestehenden BoardGame-Edit-Formulars,
  /// also bereits `games:manage`-geschützt. Anzeige im Detail-View für alle.
  notes  String?
}
```

**Kein Sonderfeld für `DIGITAL_HYBRID`:** ein eigenes Bool-Feld für 1 von 5
Werten wäre inkonsistent mit den übrigen vier und bringt keinen Vorteil, wenn
die Sonderbehandlung ohnehin in die Konfiguration wandert (s. u.).

**`notes` bleibt bewusst ein einzelnes Freitextfeld**, kein strukturiertes
Hinweis-Modell (Tone/Zielgruppe/mehrere Einträge) — dafür gibt es aktuell keinen
belegten Bedarf. Die Idee ist als Issue
[#487](https://github.com/oecher-meeples/portal/issues/487) geparkt.

### 2. BGG-Client (`lib/bgg/client.ts`) — unverändert aus Original-Konzept

`<link type="boardgamefamily">` liefert das `id`-Attribut bereits mit
(bestätigt live). Whitelist analog zu den bestehenden Link-Filtern
(`parseAuthor`, `parseVersions`), **hardcodiert** (technisches Importdetail,
nicht admin-editierbar — nur die Anzeige ist editierbar, nicht die Erkennung):

```ts
const TRAIT_FAMILY_IDS: Record<number, BoardGameTrait> = {
  25404: "LEGACY",
  24281: "CAMPAIGN",
  72224: "LIMITED_REPLAYABILITY",
  5666: "SOLITAIRE_SUPPORTED",
  61977: "SOLITAIRE_SUPPORTED",
  41489: "DIGITAL_HYBRID",
};
```

`BggGameData.traits: BoardGameTrait[]` wird über
`toArray(item.link).filter(l => l.type === "boardgamefamily")` und Lookup der
`id` gegen die Whitelist gebildet (Duplikate durch `Set` entfernen, falls beide
Solitaire-Families gleichzeitig vorkommen).

### 3. Trait-Anzeige: Code-Teil (fix) + DB-Teil (admin-editierbar)

Pro Trait gibt es zwei Konfigurationsebenen:

**a) TS-Config (hardcodiert, nicht admin-editierbar)** — Darstellungsform, nicht
Wortlaut:

```ts
// lib/ludothek/board-game-traits.ts
const TRAIT_RENDER_CONFIG: Record<
  BoardGameTrait,
  { variant: "pill" } | { variant: "icon"; icon: LucideIcon }
> = {
  LEGACY: { variant: "pill" },
  CAMPAIGN: { variant: "pill" },
  LIMITED_REPLAYABILITY: { variant: "pill" },
  SOLITAIRE_SUPPORTED: { variant: "pill" },
  DIGITAL_HYBRID: { variant: "icon", icon: Smartphone },
};
```

Begründung: Pill-vs-Icon ist eine Design-Entscheidung, verzahnt mit
Icon-Komponente/CSS — kein erkannter Bedarf, das laufzeit-editierbar zu machen
(im Gegensatz zu Wortlaut/Dringlichkeit, die sich in der Praxis ändern können).

**b) Neue DB-Tabelle (admin-editierbar über `games:manage`)** — reiner Text/Ton,
eine Zeile pro Trait, PK = Enum-Wert:

```prisma
enum BoardGameTraitTone {
  INFO
  WARNING
  DANGER
}

/// Pro-Trait editierbare Anzeige-Texte, von games:manage im Admin-Bereich
/// pflegbar (admin/einstellungen/…) — Gegenstück zu `TRAIT_RENDER_CONFIG`
/// (Darstellungsform bleibt Code, nur Wortlaut/Dringlichkeit ist hier).
model BoardGameTraitText {
  trait           BoardGameTrait     @id
  label           String?
  tooltip         String?
  tone            BoardGameTraitTone @default(INFO)
  loanMessage     String?
  detailsMessage  String?
  updatedAt       DateTime           @updatedAt

  @@map("board_game_trait_texts")
}
```

- `label`: Pill-Text (nur für `variant: "pill"`-Traits relevant).
- `tooltip`: Hover-Text (nur für `variant: "icon"`-Traits relevant).
- `tone`: steuert Farbe/Dringlichkeit (analog `GameZustandPill`-Tone-Mapping).
- `loanMessage`: Banner-Text im Ausleihe-Flow (optional, `null` = kein Banner
  für dieses Trait).
- `detailsMessage`: ausführlicherer Text für die Detail-View (optional).

**Seed:** Migration/Seed-Script (`prisma/seed.ts`) befüllt alle 5 Zeilen mit
sinnvollen Defaults (z. B. `LEGACY` → `label: "Legacy"`,
`loanMessage: "Legacy-Spiel — nach Durchspielen ggf. nicht mehr vollständig/neutral"`,
`tone: WARNING`), damit das Feature sofort nutzbar ist, ohne dass ein Admin
zuerst manuell durch die neue Settings-Seite gehen muss.

**Rendering:** generischer Loop über `game.traits`, pro Trait Merge aus
`TRAIT_RENDER_CONFIG[trait]` (Variante/Icon) und `BoardGameTraitText`-Zeile
(Text/Ton) — kein `if (trait === "DIGITAL_HYBRID")`-Sonderfall mehr im
Komponenten-Code.

**Admin-UI:** neue Unterseite unter `admin/einstellungen/` (analog
`einladungen`/`instagram`), Formular zum Bearbeiten der 5
`BoardGameTraitText`-Zeilen, geschützt durch `games:manage`.

## Import-/Vergleichs-Flow

- `board-games-bgg-import.ts`: `traits` wird wie `mechanics`/`categories` beim
  automatischen Import übernommen.
- `board-game-bgg-compare.ts`: neues `BoardGameCompareField` `"traits"`,
  Order-independent Set-Vergleich (`sameStringSet`-Pattern wiederverwenden,
  ggf. generisch für beliebige Arrays statt nur `string[]`).
- `board-game-form-values.ts`: `traits` als Formularfeld (Mehrfachauswahl),
  `notes` als einfaches Textfeld — beide Teil des bestehenden, bereits
  `games:manage`-geschützten BoardGame-Edit-Formulars.
- `notes` **nicht** Teil des BGG-Compare (nie aus BGG befüllt).
- Admin kann den Trait-Vorschlag jederzeit korrigieren — z. B. falsches
  Legacy-Tagging entfernen, analog zur bestehenden Korrekturmöglichkeit bei
  `languageDependence`.

## Anzeige

- Pills/Icon in `game-detail-view.tsx` und `game-card.tsx`/`game-list-row.tsx`
  über den generischen Loop (s. o.).
- `notes` als einfacher Hinweis-Block im Detail-View, für alle sichtbar (auch
  ohne Login/Berechtigung), ohne Tone-/Icon-Auswahl.
- **Kein Browser-Filter für `SOLITAIRE_SUPPORTED`**: der bestehende
  Spieleranzahl-Filter (`players = 1`) deckt den praktischen Suchbedarf schon
  weitgehend ab — ein zusätzlicher Filter wäre redundant. `SOLITAIRE_SUPPORTED`
  bleibt rein informativ als Pill.

## Verleih-Warnhinweis (der eigentliche Nutzen)

- Einstiegspunkt: `event-ausleihe/ausleihe-view.tsx`, State `"available"`
  (Scan-Kiosk, direkt vor dem "Ausgeben"-Button) — recherchiert und bestätigt.
- Banner baut sich aus `loanMessage` + `tone` jedes gesetzten Traits mit
  nicht-leerem `loanMessage` zusammen.
- **Rein informativ, kein Blocker** — "Ausgeben" bleibt normal klickbar, keine
  zusätzliche Bestätigung nötig (Kiosk-UX: schneller Durchlauf hat Vorrang).
- `ausleiheGetAvailability`/`resolveGame` müssen dafür die Traits (+ ggf.
  bereits aufgelöste `BoardGameTraitText`-Daten) mit ausliefern, nicht nur den
  Titel wie aktuell.

## Bestand nachpflegen

`scripts/refresh-board-games-from-bgg.ts` existiert bereits für Bulk-Refresh —
sobald Compare-/Import-Pfad `traits` kennt, kommt das Feld dort automatisch
mit. Einmaliger Lauf für den bestehenden Bestand nach Merge. Keine Migration
bestehender Daten nötig: `traits`/`notes`/`BoardGameTraitText` sind rein neue
Felder/Tabellen, `GameCopy` bleibt unangetastet.

## Nicht Teil dieses Konzepts

- `Digital Implementations: <Plattform>`-Families: keine Verleih-Relevanz,
  bewusst nicht gespeichert.
- Strukturiertes Mehrfach-Hinweis-Modell für `notes` (Tone, Zielgruppe, mehrere
  Einträge pro Spiel) — Idee geparkt in
  [Issue #487](https://github.com/oecher-meeples/portal/issues/487).
- Admin-editierbare `variant`/`icon`-Zuordnung — bleibt Code (s. o.).

## Grobe Phasen für ein Issue

1. Prisma-Migration: Enum `BoardGameTrait`, Feld `BoardGame.traits`, Feld
   `BoardGame.notes`, Enum `BoardGameTraitTone`, Tabelle `BoardGameTraitText`
   + Seed mit Defaults für alle 5 Zeilen.
2. BGG-Client: `traits` parsen (inkl. `DIGITAL_HYBRID`), Fixtures ergänzen
   (z. B. Pandemic-Legacy-/Werwörter-ähnliche Family-Links).
3. Compare/Import/Form-Values verdrahten (`traits` im Compare, `notes` nicht).
4. `TRAIT_RENDER_CONFIG` (Code) + generische Pill/Icon-Rendering-Komponente(n),
   die Code-Config und `BoardGameTraitText` mergen.
5. Admin-Settings-Seite für `BoardGameTraitText` (`games:manage`-geschützt).
6. Anzeige in Detail-/Card-/List-Views (Pills/Icon + `notes`-Block).
7. Verleih-Warnbanner in `ausleihe-view.tsx` (`loanMessage`/`tone`).
8. Bulk-Refresh-Script einmalig für Bestand laufen lassen.
