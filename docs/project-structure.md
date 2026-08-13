# Projekt- & Ordnerstruktur

Dieses Projekt trennt Code in **Schichten mit einer festen Import-Richtung** und gruppiert innerhalb der Schichten nach **Fachdomäne statt nach technischer Rolle**.

Zur Begriffsklärung, weil hier zwei verbreitete Vokabulare aufeinandertreffen:

- **Domain Layer im Sinne von DDD** (Geschäftsregeln, ohne jede UI-Kenntnis) ist bei uns **`src/lib/<domäne>/`** — nicht `src/components/`.
- **`src/components/entities/`** ist die *Darstellungs*-Schicht für Fachobjekte. Der Name folgt [Feature-Sliced Design](https://feature-sliced.design/docs/get-started/overview) (`entities`), nicht DDD. Der frühere Name `components/domain/` war irreführend, weil er im DDD-Sinn Geschäftslogik versprach, tatsächlich aber reine Präsentation enthielt.

Dies ist **kein** Feature-Driven Design (FDD) im methodischen Sinn — es gibt keine FDD-Feature-Liste, keine FDD-Rollen und keine FDD-Prozessschritte.

## Schichten & Import-Richtung

```text
src/lib/<domäne>/          DDD-Domain-Layer: Geschäftsregeln, Datenzugriff, Server Actions
        ↑ (UI darf lib benutzen — lib niemals UI)
src/components/
  ui/        →  entities/  →  widgets/  →  feature/  →  layout/
  (fachfrei)    (Fachobjekt   (geteilte    (ein Use     (App-Rahmen)
                 anzeigen)     Use Cases)   Case)
```

**Regel:** Eine Schicht darf nur aus Schichten **links von sich** importieren — niemals nach rechts und niemals seitwärts innerhalb von `feature/`.

Das wird per `import/no-restricted-paths` in [eslint.config.mjs](../eslint.config.mjs) **erzwungen** (Zonen werden zur Lint-Laufzeit aus dem Dateisystem generiert, neue Ordner sind automatisch abgedeckt). Zusätzlich erzwungen:

- `src/lib/**` darf nichts aus `src/components/**` importieren (Domain-Layer bleibt UI-frei).
- `src/components/ui/**` darf nichts aus `src/lib/<domäne>/**` importieren (nur `src/lib/utils/`, das fachfrei ist).
- Kein Feature-Ordner darf aus einem anderen Feature-Ordner importieren.

Aktueller Stand: **0 Verstöße** repo-weit.

## `src/lib/` — Domain Layer (DDD)

```text
src/lib/
├── auth/       Session, Tier-Ermittlung, Auth-Client
├── bgg/        BoardGameGeek-Integration
├── bringbuy/   Flohmarkt-Regeln
├── content/    News/Content (inkl. `Post.status` DRAFT/PUBLISHED — Entwürfe werden aus jeder öffentlichen/internen Query gefiltert), LFG
├── events/     Events, Schichten, Kapazität, Schicht-Labels
├── inventory/  Code-Format (OM-BOX-…), Bestandsregeln, Ersatzteillager-Schreibseite (`spare-part-listings.ts`) und -Leseseite (`spare-parts.ts`)
├── legal/      Rechtliches-Dokumente (Satzung/Datenschutz/Impressum/Beitragsordnung, feste Slugs): PDF-Text-Extraktion
│               ohne Gliederungslogik (`pdf-extract.ts`, via `unpdf`), Zod-Validierung der `sections`-Json-Spalte in `actions.ts`
├── ludothek/   Titel (`BoardGame`) & Exemplare (`GameCopy`, ADR 0008) & Aufenthalte (Holdings):
│               ├── holdings.ts         Zustandsübergänge (ausleihen, weitergeben, zurückgeben) — auf `GameCopy`
│               ├── holdings-lookup.ts  Leseseite (Zustand, Scan auflösen, Verantwortliche)
│               ├── holding-actions.ts  Server Actions über den Übergängen
│               ├── board-games.ts      Titel-CRUD: anlegen (+ erstes Exemplar), bearbeiten, BGG-Vorschau, Erweiterungs-Zuordnung (GameCollection)
│               ├── game-copies.ts      Exemplar-CRUD: weiteres Exemplar anlegen, bearbeiten, deinventarisieren, Vollständigkeitsprüfung anfordern
│               ├── permissions.ts      `requireGamesManagePermission()` — geteilt von `board-games.ts` und `game-copies.ts`
│               ├── browser.ts          Ludothek-Filter, Suche, öffentliche/interne Spielform (inkl. `kind`/Erweiterungs-Referenzen)
│               ├── query.ts            Bulk-Query für die Ludothek-Browser/Detailseite (ein Eintrag pro Exemplar, Titel-Felder aus `boardGame`-Relation, kein N+1)
│               ├── bgg-id.ts           Parsing: BGG-ID, Mechaniken-Liste (Formularfeld ↔ String[])
│               └── private-collection.ts  Crowdsourced-Suche über `PrivateGameCollectionEntry` — nie im öffentlichen Pfad (`toPublicGame`)
├── markt/      Kleinanzeigen-Marktplatz: Anzeigen-Form, Preis-/Zustand-Filter über `searchParams`
├── statistics/ Anonymisierte Verleih-Auswertungen (`loan-stats.ts`) — reine Zählwerte, keine Meeple-Referenzen
├── members/    Mitglieder, Mitgliedsstatus, Direktkontakt-Links (`contact.ts`)
├── instagram/  Cross-Posting
├── newsletter/ Brevo-Mailer (`mailer.ts`), Abonnenten beider Quellen — anonym mit Double-Opt-in
│               und Meeple-Profil-Toggle ohne Double-Opt-in (`subscribers.ts`) —, Versand-Queue
│               analog zur Instagram-Queue (`dispatch.ts`), deutsche Kategorie-Labels (`labels.ts`)
└── utils/      Fachfrei: cn(), Datums-Formatter, nav-config, prisma-Client, `use-blob-upload.ts` (geteilter Blob-Upload-Hook), `search-params.ts`,
                `require-env.ts` (Pflicht-Env-Var mit klarer Fehlermeldung statt `!`), `blob-delete.ts` (Vercel-Blob-Löschung, mehrfach genutzt)
```

Deutschsprachige **Labels** für Domänen-Enums (`MEMBERSHIP_STATE_LABELS`, `SHIFT_TYPE_LABELS`, …) liegen hier — sie sind Fachvokabular. Wie ein Zustand **aussieht** (Farbe/Tone) liegt dagegen in `components/entities/`.

`BoardGame.kind` (`BoardGameKind`: `BOARDGAME` / `BOARDGAME_EXPANSION`) und das Verknüpfungsmodell `GameCollection` (m:n, zusammengesetzter PK `[baseGameId, expansionId]`) bilden die Beziehung Basisspiel ↔ Erweiterung ab — m:n statt einer einzelnen `baseGameId`-Spalte, weil BGG Crossover-Erweiterungen zu mehreren Basisspielen kennt. Die Zuordnung wird manuell im Admin-Bereich gepflegt (`assignExpansion`/`removeExpansionAssignment` in `board-games.ts`), solange der BGG-Import blockiert ist.

## `src/components/ui/` — fachfreie Primitives

Design-System-Bausteine (shadcn-Stil auf Base-UI) plus fachfreie Bausteine mit Verhalten:

| Baustein | Zweck |
| --- | --- |
| `button`, `input`, `label`, `textarea`, `card`, `dialog`, `table`, `tabs`, `badge`, `avatar`, `tooltip`, `separator`, `dropdown-menu` | Primitives |
| `field.tsx` | `Field` / `TextField` / `TextAreaField` — Label-über-Control-Zeile (ersetzt ~60 handkopierte Wrapper) |
| `use-action.ts` | Hook: Server Action ausführen → pending/error/`router.refresh()` |
| `action-button.tsx` | Button, der eine Server Action ausführt (ersetzt 8 `Delete…Button`-Wrapper) |
| `action-dialog.tsx` | Dialog-Skelett: Open-State, Reset-on-Close, Error-Slot, Submit-Footer |
| `code-scanner.tsx` + `use-code-scanner.ts` | EAN-/QR-Scanner: Kamera, Status, `onDetected`-Callback — kennt keine Fachdomäne |
| `card-corner-overlay.tsx` | `CardCornerOverlay` — positioniert Kinder absolut in einer Kartenecke (`top-left`/`top-right`, `z-10`); von `GameCard`, `ContentListRow` genutzt |
| `page-heading`, `stat-tile`, `status-pill`, `pill-toggle`, `placeholder-media`, `instagram-icon` | Layout-/Anzeige-Primitives |

## `src/components/entities/` — Fachobjekte anzeigen

Reine Präsentation: kennt Fachtypen, führt **keine** Datenbeschaffung und **keine** Mutation aus. Jede Datei ist die *einzige* Stelle, die weiß, wie ein Fachobjekt aussieht:

```text
entities/
├── content-card.tsx            News-/Termin-Kachel
├── content-list-row.tsx        News-Listenzeile
├── content-type-badge.tsx      Blog/Termin/Turnier
├── game-card.tsx               Spiele-Kachel
├── game-zustand-pill.tsx       frei / ausgeliehen / Wartung / nicht erfasst
├── lfg-status-pill.tsx         offen / voll / abgelaufen / geschlossen
├── membership-state-pill.tsx   aktiv / gekündigt / ausgetreten / anonymisiert
└── flea-market-status-pill.tsx Freigabe / Verkauf / reserviert / verkauft
```

## `src/components/widgets/` — geteilte Use Cases

Ein **Widget** ist ein in sich geschlossener Funktionsblock, der einen kompletten Anwendungsfall abliefert und von **mehreren** Features eingebunden wird. Er gehört keinem davon.

```text
widgets/
├── game-holding/game-holding-panel.tsx
└── board-game/
    ├── board-game-form-fields.tsx   Formularfelder + Form-State ↔ Titel-Input (`BoardGameTitleInput`/`CreateBoardGameInput`)
    ├── edit-board-game-dialog.tsx   Titel-Stammdaten **und** Exemplar-Zustand bearbeiten (zwei Server Actions, ein Formular)
    ├── add-game-copy-dialog.tsx     Weiteres Exemplar zu einem bestehenden Titel anlegen (ADR 0008)
    ├── game-card-edit-overlay.tsx   Bearbeiten-Button auf der Spiele-Kachel (stoppt den Klick vor dem umschließenden Link)
    └── assign-expansion-dialog.tsx  Erweiterung ↔ Basisspiel manuell zuordnen/entfernen (GameCollection, `games:manage`, titelbezogen)
```

`GameHoldingPanel` ("was mache ich mit dem Exemplar in meiner Hand": ausleihen, bestätigen, weitergeben, zurückgeben, einlagern) wird vom Scan-Flow **und** von der Ludothek-Detailseite benutzt. Vorher lag er in `feature/scan/` und wurde von dort querimportiert — genau der Fehler, den die Schichtenregel verhindert.

`EditBoardGameDialog` wird von `feature/admin-bestand` (Tabellenzeile) **und** von `feature/ludothek` (Kachel-Overlay, nur mit `games:manage`-Berechtigung) eingebunden — deshalb `widgets/`, nicht `feature/admin-bestand/`. Die Server Actions dahinter (`createBoardGame`/`updateBoardGame` in `lib/ludothek/board-games.ts`, `createGameCopy`/`updateGameCopy`/`deinventoriseGameCopy`/`requestCompletenessCheck` in `lib/ludothek/game-copies.ts`) liegen konsequent in `lib/`, nicht in `components/feature/`, damit `widgets/` sie importieren darf.

## `src/components/feature/` — je ein Anwendungsfall

28 flache Fachdomänen-Ordner (`admin-bestand`, `admin-events`, `lfg`, `scan`, `profil`, …). Typisches Innenleben:

- `<domäne>-view.tsx` — Smart Component, verdrahtet ui/entities/widgets mit State & Actions
- `actions.ts` — Server Actions dieses Anwendungsfalls
- `*-dialog.tsx`, `use-*.ts` — Teilaspekte desselben Anwendungsfalls

Kein Ordner importiert aus einem anderen. Geteiltes wandert nach `widgets/`, `entities/`, `ui/` oder `lib/`.

## `src/components/layout/` — App-Rahmen

`app-shell`, `header`, `sidebar`, `logo`, `theme-provider`, `theme-toggle`, `user-menu`, `brand-watermark`. Reine Struktur/Positionierung; darf als oberste Schicht aus allen anderen importieren.

## Wartungsregeln

1. **Import-Richtung einhalten** — `ui → entities → widgets → feature → layout`, `lib` nie in Richtung UI. Lint bricht sonst.
2. **DRY ab der zweiten Kopie**: Wird etwas ein zweites Mal geschrieben, wandert es in die passende tiefere Schicht (`ui/` wenn fachfrei, `entities/` wenn Anzeige eines Fachobjekts, `widgets/` wenn kompletter Use Case, `lib/` wenn Regel/Format).
3. **Max. 400 Zeilen pro Datei.** Wird es mehr, entlang der Fachlichkeit aufteilen (Beispiel: `holdings.ts` → Schreibseite + `holdings-lookup.ts` Leseseite).
4. **Dateien unter 100 Zeilen nur, wenn sie mehrfach importiert werden.** Einmalig genutzte Kleinkomponenten gehören in ihren Aufrufer. Begründete Ausnahmen: `layout/*` (jeweils eigener Rahmen-Baustein) und `theme-provider.tsx` (technisch nötige `"use client"`-Grenze).
5. **Colocation**: Tests (`*.test.ts(x)`) liegen neben ihrem Subjekt.
6. **Coverage-Pflicht nur für `lib/` und `actions.ts`**: Die Geschäftsregeln (`src/lib/**`) und Server Actions (`src/components/**/actions.ts`) tragen eine Coverage-Schwelle (`vitest.config.ts`, aktuell 80 %). UI-Komponenten und Routen haben bewusst keine — das ist eine Entscheidung (siehe Issue #38), keine Lücke.
test-pr-marker
