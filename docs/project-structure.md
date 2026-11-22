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
├── analytics/  Selbstgehostetes Seitenaufruf-Tracking (`PageView`, keine IP/PII): Beacon-Prüfung + User-Agent-Klassifizierung
│               (`collect.ts`, Schreibseite der Route `/api/analytics/collect`), Aggregationen fürs Admin-Dashboard (`queries.ts`)
├── auth/       better-auth-Instanz + Config (self-hosted, ADR 0015), Session, Tier-Ermittlung, Auth-Client;
│               Permission-Katalog + `PermissionKey`-Typ (`permission-keys.ts`, auch Quelle für `prisma/seed-roles.ts`),
│               Action-Guards mit Mitgliedsstatus-Prüfung (`action-guards.ts`, #522)
├── bgg/        BoardGameGeek-Integration
├── bringbuy/   Flohmarkt-Regeln + Server Actions: Statuswechsel/Warenkorb (`actions.ts`), Token-Anmeldung externer
│               Verkäufer:innen (`external-sellers.ts`), eigene Artikel für Meeple **und** externe Verkäufer:innen
│               (`own-items.ts`) — bewusst hier statt in `components/feature/admin-bringbuy/`, weil sowohl die
│               Kassenansicht als auch die neue Verkäufer-Registrierungsseite (`feature/bringbuy`) darauf zugreifen
│               und die Layer-Regel keinen Cross-Feature-Import erlaubt (#266). Lesefunktionen ohne Guard (Token-Lookup,
│               eigene Artikel, reservierte Warenkörbe) liegen in `queries.ts` **ohne** `"use server"` (#519)
├── content/    News/Content (`CONTENT_TYPE_LABELS` in `content-types.ts`; inkl. `Post.status` DRAFT/PUBLISHED — Entwürfe werden aus jeder öffentlichen/internen Query gefiltert), LFG
├── events/     Events, Schichten, Kapazität, Schicht-Labels
├── inventory/  Code-Format (OM-BOX-…), Bestandsregeln, Ersatzteillager-Schreibseite (`spare-part-listings.ts`) und -Leseseite (`spare-parts.ts`)
├── legal/      Rechtliches-Dokumente (Satzung/Datenschutz/Impressum/Beitragsordnung, feste Slugs): PDF-Text-Extraktion
│               ohne Gliederungslogik (`pdf-extract.ts`, via `unpdf`), Zod-Validierung der `sections`-Json-Spalte in `actions.ts`
├── links/      Kuratierte „Wichtige Links" fürs Dashboard (`ImportantLink`) — Reihenfolge nach `createdAt`, keine manuelle Sortierung
├── ludothek/   Titel (`BoardGame`) & Exemplare (`GameCopy`, ADR 0008) & Aufenthalte (Holdings):
│               ├── taxonomy/          Mitwirkende (Verlag/Autor/Illustrator) & Normalisierung/`dedupKey` (Epic #490): Import, Lese-Helfer, Admin-Actions;
│               │                      gemeinsame Upsert-Regel beider Register in `upsert.ts` (BGG-ID vor Name, nachträgliche BGG-ID);
│               │                      Tags (Mechanik/Kategorie, Strang B): `tags.ts` (Schreibseite, BGG-Labels), `tags-read.ts` (Include, Anzeigename),
│               │                      `tag-admin-actions.ts`/`tag-admin-queries.ts` für `/admin/tags`;
│               │                      Versionen (`BoardGameVersion`): `versions.ts` (`upsertBoardGameVersion`, dedupliziert per BGG-Version-ID bzw. Name+Sprachen+Verlage),
│               │                      `version-actions.ts` (gespeicherte Versionen eines Titels + noch nicht gespeicherte BGG-Versionen), `version-label.ts` (Anzeigetext)
│               ├── board-game-versions.ts BGG-Versionen auswerten: deutsche bevorzugen, Verlag/Product-Code auflösen, BGG-Version → `VersionInput`
│               ├── edition-language.ts BGG-Sprachname → Flaggen-Ländercode (Anzeige über `entities/edition-flag.tsx`)
│               ├── holdings.ts         Zustandsübergänge (ausleihen, weitergeben, zurückgeben) — auf `GameCopy`
│               ├── holdings-external.ts Übergänge mit externem Ziel (#333): an extern weitergeben/ausgeben, Umbuchen, Rückgabe-von-extern-Bestätigung
│               ├── holdings-lookup.ts  Leseseite (Zustand inkl. verfügbar/nicht-verfügbar, Scan auflösen, Verantwortliche)
│               ├── anonymer-meeple.ts  Sammelkonto "Anonymer Meeple" (#333) — Displayname-Konstante + `Member`-Lookup, geteilt mit `prisma/seed.ts`
│               ├── anonymer-meeple-name.ts Nur die Displayname-Konstante, ohne Prisma — client-sicher (Scanner, #540)
│               ├── holding-actions.ts  Server Actions über den internen Übergängen
│               ├── holding-actions-external.ts Server Actions über den externen Übergängen (#333a/b, Umbuchen, Member-Picker)
│               ├── board-game-display.ts  `BOARD_GAME_DISPLAY_SELECT` + `boardGameDisplayFields()` — Titel-Anzeigefelder, geteilt von `query.ts`, `private-collection.ts`, `admin-bestand-rows.ts` (#526)
│               ├── unit-chain.ts       Einzige Stelle des Kettenaufstiegs: `MAX_UNIT_CHAIN_DEPTH`, `walkUnitChain`, `unitChainLabel`, `findUnitAncestor`
│               ├── board-game-kind.ts  `BOARD_GAME_KIND_LABELS` (Basisspiel/Erweiterung)
│               ├── holding-actions-shared.ts   Von `holding-actions*.ts` und `scanner-actions.ts` geteilte interne Helfer (reine Datei-Größen-Trennung)
│               ├── scanner-dispatch.ts Scanner-Serien (#537): reine Buchungs-Weiche `decideReceive`/`decideTransfer` + Vorauswahl `pickCopyForMode` bei mehrdeutiger EAN
│               ├── scanner-modes.ts    Modi der Scanner-Seite: `parseScannerMode` (URL → erlaubter Modus), Labels, `toCopyChoices`
│               ├── scanner-actions.ts  Server Actions der Scanner-Serien: `scanReceiveGame`, `scanTransferGame`, `scanValidateTarget`, `scanPickCopy`
│               ├── board-games.ts      Titel-CRUD: anlegen (+ erstes Exemplar), bearbeiten, BGG-Vorschau, Erweiterungs-Zuordnung (GameCollection)
│               ├── game-issue.ts / game-defects.ts  Prüfbogen-Mangel (#528): Arten + Labels + `condition`-Format (rein), Statusübergang `ACTIVE↔MAINTENANCE` (`reportGameCopyDefect`/`clearGameCopyDefect`, ohne `"use server"` — Guard liegt in `feature/scan/inventory-actions.ts`)
│               ├── game-copies.ts      Exemplar-CRUD: weiteres Exemplar anlegen, bearbeiten, deinventarisieren, Vollständigkeitsprüfung anfordern (einzeln oder `markUnitForCompletenessCheck` für die direkten Inhalte einer Einheit, #563)
│               ├── browser.ts          Ludothek-Filter, Suche, öffentliche/interne Spielform (inkl. `kind`/Erweiterungs-Referenzen)
│               ├── query.ts            Bulk-Query für die Ludothek-Browser/Detailseite (ein Eintrag pro Exemplar, Titel-Felder aus `boardGame`-Relation, kein N+1)
│               ├── bgg-id.ts           Parsing: BGG-ID, Mechaniken-Liste (Formularfeld ↔ String[])
│               ├── storage-units.ts    Aufbewahrungseinheiten-CRUD (Code explizit oder `nextUnitCode`, Code-Lookup) — von `admin-einheiten` **und** dem Standort-Feld im Create-Dialog gebraucht, deshalb hier statt in `components/feature/`
│               └── private-collection.ts  Crowdsourced-Suche über `PrivateGameCollectionEntry` — nie im öffentlichen Pfad (`toPublicGame`)
├── markt/      Kleinanzeigen-Marktplatz: Anzeigen-Form, Preis-/Zustand-Filter über `searchParams`
├── short-id/   QR-Short-IDs (Epic #542, `https://short.oecher-meeples.org/id/<präfix>-<id>`): Präfix-Registry, `buildShortIdUrl`/
│               `parseShortId` (ignoriert alles vor `/id/`), Einheiten-Code-Mapping `box-0001` ↔ `OM-BOX-0001` (`short-id.ts`, rein,
│               client-sicher); Router-Ziel je Präfix und Recht (`resolve.ts`, `resolveShortId`)
├── statistics/ Anonymisierte Verleih-Auswertungen (`loan-stats.ts`) — reine Zählwerte, keine Meeple-Referenzen
├── members/    Mitglieder, Mitgliedsstatus, Direktkontakt-Links (`contact.ts`), `memberFullName()` (`member-display-name.ts`),
│               `revalidateMemberProfile()` (`revalidate-profile.ts`), IBAN-Reveal-Actions (`iban-reveal-actions.ts`)
├── instagram/  Cross-Posting
├── newsletter/ SMTP-Mailer (`mailer.ts`, nodemailer, No-op ohne `SMTP_HOST`), Abonnenten beider Quellen — anonym mit Double-Opt-in
│               und Meeple-Profil-Toggle ohne Double-Opt-in (`subscribers.ts`) —, Versand-Queue
│               analog zur Instagram-Queue (`dispatch.ts`), deutsche Kategorie-Labels (`labels.ts`)
└── utils/      Fachfrei: cn(), Datums-Formatter, nav-config, prisma-Client, `use-blob-upload.ts` (geteilter Blob-Upload-Hook, Browser → SeaweedFS per Presigned POST), `search-params.ts`,
                `require-env.ts` (Pflicht-Env-Var mit klarer Fehlermeldung statt `!`), `s3.ts` (S3-Client für SeaweedFS, Public-URL ↔ Key, `putBlob()`),
                `blob-upload-token.ts` (Presigned-POST-Upload-Grant mit Größen-/Typ-Policy), `blob-delete.ts` (Blob-Löschung, mehrfach genutzt),
                `action-result.ts` (`toResult`/`actionErrorMessage`/`UserFacingError` — catch-all für Server Actions mit `unstable_rethrow`),
                `sorted-unique.ts` (`sortedUniqueLabels` — Kern von `tagLabelsByType`/`contributorNamesByRole`), `escape-html.ts` (`escapeHtml`, auch Anführungszeichen), `site-url.ts` (`siteUrl()`), `cron-auth.ts` (`requireCronAuth(request)` für `app/api/cron/*`)
```

Deutschsprachige **Labels** für Domänen-Enums (`MEMBERSHIP_STATE_LABELS`, `SHIFT_TYPE_LABELS`, …) liegen hier — sie sind Fachvokabular. Wie ein Zustand **aussieht** (Farbe/Tone) liegt dagegen in `components/entities/`.

`BoardGame.kind` (`BoardGameKind`: `BOARDGAME` / `BOARDGAME_EXPANSION`) und das Verknüpfungsmodell `GameCollection` (m:n, zusammengesetzter PK `[baseGameId, expansionId]`) bilden die Beziehung Basisspiel ↔ Erweiterung ab — m:n statt einer einzelnen `baseGameId`-Spalte, weil BGG Crossover-Erweiterungen zu mehreren Basisspielen kennt. Die Zuordnung wird manuell im Admin-Bereich gepflegt (`assignExpansion`/`removeExpansionAssignment` in `board-games.ts`), solange der BGG-Import blockiert ist.

## `src/components/ui/` — fachfreie Primitives

Design-System-Bausteine (shadcn-Stil auf Base-UI) plus fachfreie Bausteine mit Verhalten:

| Baustein | Zweck |
| --- | --- |
| `button`, `input`, `label`, `textarea`, `dialog`, `table`, `tabs`, `badge`, `avatar`, `tooltip`, `separator`, `dropdown-menu` | Primitives |
| `card.tsx` | **Einzige Card-Hülle des Portals** (#580): `Card` im Portalstil (`rounded-lg`, `border`, `p-5`), `size="sm"` (`p-4`) / `"flush"` (ohne Padding, für `divide-y`-Listen, Tabellen, Accordions), `variant="destructive"`, `layout="tile"` (zentrierte Icon-Kachel). `CardHeader` + `CardAction` stellen Aktionen per Container-Query unter Titel/Beschreibung, wenn der Kopf schmaler als `@md` ist. `CardTitle` rendert `<h2>` (`as="h3"` möglich). Für Hüllen, die kein `div` sind (`Link`, `form`, `li`, Accordion-Root), liefert `cardVariants({ … })` dieselben Klassen. Bewusst eigene Bausteine bleiben: `game-list-row` (randlose Listenzeile) und Innen-/Overlay-Flächen. |
| `field.tsx` | `Field` / `TextField` / `TextAreaField` — Label-über-Control-Zeile (ersetzt ~60 handkopierte Wrapper) |
| `native-select.tsx` | `NativeSelect` — natives `<select>` im `Input`-Stil für Filter, Sortierung, Vorschlagslisten |
| `use-action.ts` | Hook: Server Action ausführen → pending/error; `router.refresh()` nur mit `refresh: true` (#525: Default aus, `revalidatePath` der Action rendert bereits neu) |
| `id-combobox.tsx` | Durchsuchbare Auswahl über `{ id, label }` — Basis von `MeepleCombobox`/`MemberCombobox` und dem Mitwirkenden-Zusammenführen (#520) |
| `action-button.tsx` | Button, der eine Server Action ausführt (ersetzt 8 `Delete…Button`-Wrapper) |
| `action-dialog.tsx` | Dialog-Skelett: Open-State, Reset-on-Close, Error-Slot, Submit-Footer |
| `code-scanner.tsx` + `use-code-scanner.ts` | EAN-/QR-Scanner: Kamera, Status, `onDetected`-Callback — kennt keine Fachdomäne |
| `use-infinite-scroll.ts` | Generischer Infinite-Scroll-Hook: `{ items, initialCount, step } → { visibleItems, sentinelRef }`, `IntersectionObserver`-Wiring |
| `card-corner-overlay.tsx` | `CardCornerOverlay` — positioniert Kinder absolut in einer Kartenecke (`top-left`/`top-right`, `z-10`); von `GameCard`, `ContentListRow` genutzt |
| `stop-row-navigation.tsx` | Stoppt den Klick, bevor er in den umschließenden `Link` einer Zeile/Kachel bubbelt — von Grid-/Listen-/Kompakt-Admin-Overlays geteilt |
| `bar-row.tsx` | `BarRow` — beschriftete Balkenzeile (Label, Wert, relativer Balken) ohne Chart-Library; von Statistiken und Admin-Seitenaufrufen geteilt |
| `page-heading`, `page-title`, `stat-tile` (inkl. `StatValue`), `status-pill`, `pill-toggle`, `placeholder-media`, `instagram-icon` | Layout-/Anzeige-Primitives |
| `page-container.tsx` | `PageContainer` — Seiten-Breitendeckel (`variant: "default" \| "wide"`); jede `*-view.tsx` legt ihre eigene Breite fest, statt dass `AppShell` global `max-w-6xl` erzwingt (#398) |

## `src/components/entities/` — Fachobjekte anzeigen

Reine Präsentation: kennt Fachtypen, führt **keine** Datenbeschaffung und **keine** Mutation aus. Jede Datei ist die *einzige* Stelle, die weiß, wie ein Fachobjekt aussieht:

```text
entities/
├── content-card.tsx            News-/Termin-Kachel
├── content-list-row.tsx        News-Listenzeile
├── content-type-badge.tsx      Blog/Termin/Turnier
├── content-timeline-entry.tsx  News-Vollansicht-Eintrag: Cover, Metadaten, vollständiger Markdown-Body (#135)
├── game-card.tsx                Spiele-Kachel (Grid)
├── game-list-row.tsx            Spiele-Zeile (Liste)
├── game-compact-row.tsx         Dichte Spiele-Zeile (Kompakt, nur `games:manage`)
├── related-game-card.tsx        Basisspiel-/Erweiterungs-Referenz: Cover + Titel-Link + Standort (#121/#122)
├── edition-flag.tsx             Sprachflagge einer nicht-deutschen Version (Ländercode aus `lib/ludothek/edition-language.ts`)
├── contact-dialog.tsx            Name → Dialog mit allen Kontaktoptionen (Mail/Telegram) — ersetzt Icon-Zeilen pro Stelle; lädt nie selbst Daten (`meeple`-Prop oder `loadMeeple`-Funktion). Für „nur `meepleId` bekannt": `widgets/contact/meeple-contact-dialog.tsx`; Erklärbär-Liste: `widgets/explainer/`
├── game-zustand-pill.tsx       frei / ausgeliehen / Wartung (nicht erfasst rendert bewusst nichts, #121)
├── lfg-status-pill.tsx         offen / voll / abgelaufen / geschlossen
├── membership-state-pill.tsx   aktiv / gekündigt / ausgetreten / anonymisiert
└── flea-market-status-pill.tsx Freigabe / Verkauf / reserviert / verkauft
```

## `src/components/widgets/` — geteilte Use Cases

Ein **Widget** ist ein in sich geschlossener Funktionsblock, der einen kompletten Anwendungsfall abliefert und von **mehreren** Features eingebunden wird. Er gehört keinem davon.

```text
widgets/
├── important-links-grid.tsx  Card-Grid für Link-Kacheln, geteilt von Schnellzugriff (fest) und den admin-kuratierten Wichtige Links (#110)
├── game-holding/
│   ├── game-holding-panel.tsx     Detailseiten-Panel: ausleihen, bestätigen, weitergeben, zurückgeben, einlagern
│   ├── game-actions-menu.tsx      Rechtebasiertes Aktionen-Dropdown für Listen-/Kompakt-Zeilen (#121/#122) — Dialoge werden außerhalb des Menüs
│   │                              gerendert (die Typeahead-Suche des Menüs würde sonst Tastatureingaben in deren Textfeldern schlucken)
│   └── holding-mini-dialogs.tsx   Ausleihen/Weitergeben/Rückgabe/Umlagern als Mini-Dialoge mit Such-Auswahl oder Scan
├── bringbuy/
│   └── register-external-seller-dialog.tsx  Self-Service-Anmeldung externer Bring & Buy-Verkäufer:innen (#266) — vom Gäste-Bereich (`feature/guest-area`) genutzt, darf aber nicht aus `feature/bringbuy` importieren (Layer-Regel), deshalb hier
├── private-collection/
│   ├── private-collection-card.tsx    Profil-Karte „Meine privaten Spiele“: BGG-Import, Sichtbarkeit für andere Meeple
│   └── private-collection-dialog.tsx  Liste der Privatspiele: Suche, Sortierung, Status-Filter, Version, Event-Freigabe (#122)
├── pending-changes/
│   └── pending-changes-panel.tsx  Offene IBAN-/E-Mail-Änderungsanträge freigeben/ablehnen (#330) — von `/admin/bank` (kind: IBAN) **und** `/admin/mitglieder` (kind: MEMBER_EMAIL) eingebunden, deshalb hier statt in einem der beiden Features
└── board-game/
    ├── board-game-form-values.ts        Form-State ↔ Titel-/Exemplar-Input (`BoardGameFormValues`, `boardGameFormTo…`) — geteilt von allen Formularen unten
    ├── edit-board-game-title.tsx        Titel-Stammdaten-Formularfelder (Titel, EAN, `kind`, BGG-Felder, Spieleranzahl, Beschreibung, …) — EAN per `hideEan` ausblendbar
    ├── edit-board-game-exemplar.tsx     Exemplar-Formularfelder (Version, Regelheft-Sprachen, Mängelvermerk) — pro `GameCopy`, nicht pro Titel
    ├── edition-fields.tsx               Versions-Dropdown: ohne Version / vorhandene / noch nicht gespeicherte BGG-Versionen / manuell (Verlag + Sprache der Version)
    ├── contributor-names-field.tsx      Namensliste für Mitwirkende mit Register-Abgleich (unbekannte Namen markiert, `knownNames` ausgenommen)
    ├── ean-field.tsx                    EAN-Input + Scan-Icon + Dropdown bei mehreren Suchtreffern, geteilt von jedem Formular mit EAN-Feld
    ├── edit-board-game-title-dialog.tsx     Titel-Stammdaten bearbeiten (Detailseiten-Header, #121/#122)
    ├── edit-board-game-exemplar-dialog.tsx  Ein Exemplar bearbeiten (Listen-/Kompakt-Zeile, Exemplar-Tabelle)
    ├── edit-board-game-dialog.tsx       Titel **und** Exemplar in einem Formular (Admin-Bestand-Tabellenzeile, Grid-Kachel-Overlay)
    ├── create-board-game-dialog.tsx     Neuen Titel anlegen, Wizard in drei Schritten: BGG-Suche/Import → Angaben prüfen → Exemplar anlegen
    ├── create-board-game-bgg-import-step.tsx  Schritt 1: Suche (Titel/Link/BGG-ID), Trefferliste, Vorschau
    ├── create-board-game-exemplar-step.tsx    Schritt 3: Version, EAN, Exemplar-Felder, Standort
    ├── create-board-game-location-field.tsx  Standort fürs erste Exemplar: Scan-Auflösung gegen Einheiten, Anlegen+Selbstzuweisung bei Fehltreffer, oder direkt „Mir zuweisen“
    ├── add-game-copy-dialog.tsx         Weiteres Exemplar zu einem bestehenden Titel anlegen (ADR 0008)
    ├── deinventorise-board-game-dialog.tsx  Exemplar deinventarisieren, optional ins Ersatzteillager
    ├── game-card-edit-overlay.tsx       Bearbeiten-Button auf der Spiele-Kachel (nutzt `StopRowNavigation`)
    └── assign-expansion-dialog.tsx      Erweiterung ↔ Basisspiel manuell zuordnen/entfernen (GameCollection, `games:manage`, titelbezogen)
```

`GameHoldingPanel`/`GameActionsMenu`/`holding-mini-dialogs.tsx` ("was mache ich mit dem Exemplar in meiner Hand": ausleihen, bestätigen, weitergeben, zurückgeben, einlagern) werden vom Scan-Flow, der Ludothek-Detailseite **und** den Listen-/Kompakt-Zeilen benutzt. `GameHoldingPanel` lag früher in `feature/scan/` und wurde von dort querimportiert — genau der Fehler, den die Schichtenregel verhindert.

Alle `board-game/*-dialog.tsx` werden von mindestens zwei Features eingebunden (`feature/admin-bestand`, `feature/ludothek`, teils `feature/admin-einheiten` für den Standort-Fallback) — deshalb `widgets/`, nicht in einem einzelnen `feature/`-Ordner. Die Server Actions dahinter (`createBoardGame`/`updateBoardGame` in `lib/ludothek/board-games.ts`, `createGameCopy`/`updateGameCopy`/`deinventoriseGameCopy`/`requestCompletenessCheck` in `lib/ludothek/game-copies.ts`, `createStorageUnit`/`findStorageUnitByCode` in `lib/ludothek/storage-units.ts`) liegen konsequent in `lib/`, nicht in `components/feature/`, damit `widgets/` sie importieren darf.

## `src/components/feature/` — je ein Anwendungsfall

31 flache Fachdomänen-Ordner (`admin-bestand`, `admin-events`, `lfg`, `scan`, `profil`, `bringbuy`, …). Typisches Innenleben:

- `<domäne>-view.tsx` — Smart Component, verdrahtet ui/entities/widgets mit State & Actions
- `actions.ts` — Server Actions dieses Anwendungsfalls
- `*-dialog.tsx`, `use-*.ts` — Teilaspekte desselben Anwendungsfalls

Beispiel `feature/scan/` (Scanner, #538): `scan-view.tsx` ist nur der Rahmen (Moduswahl ↔ `?modus=`, Kamera, manuelle Eingabe) und reicht jeden Code per Ref an den aktiven Modus weiter: `single-scan.tsx` (Einzel-Scan), `receive-series.tsx` (Erhalten), `transfer-series.tsx` (Übergeben: Zielphase, Zielwechsel-Rückfrage, Einheit in Einheit — löst die frühere Einlagern-Serie ab, #539; Umschalter „An Anonymen Meeple weitergeben", #540), `mark-series.tsx` (Zur Kontrolle markieren) bzw. `check-series.tsx` (Kontrollieren, öffnet `pruefbogen-panel.tsx`). Das Serien-Gerüst `use-scan-series.ts` (Entprellen, Sperre während einer Buchung, Vorauswahl per `scanPickCopy`) und `scan-series-log.tsx` (Log, Zähler, Exemplar-Auswahl `CopyChoiceList`) teilen sich alle Serien-Modi. Modus-Liste, URL-Parsing und Ergebnis-Labels liegen in `lib/ludothek/scanner-modes.ts`.

Kein Ordner importiert aus einem anderen. Geteiltes wandert nach `widgets/`, `entities/`, `ui/` oder `lib/`.

**Ausnahme `verwendete-bibliotheken` (#117):** `src/app/verwendete-bibliotheken/page.tsx` liegt bewusst außerhalb von `app/rechtliches/[slug]` und `feature/rechtliches/` — die Seite rendert die vollautomatisch generierte `public/THIRD-PARTY-LICENSES.md` (`pnpm run licenses:generate`) direkt zur Request-Zeit über `MarkdownContent`, ist kein `LegalDocument` und taucht nicht im Rechtliches-Editor auf (kein Redakteur bearbeitet sie je). Die rohe `.md`-Datei bleibt zusätzlich unter `/THIRD-PARTY-LICENSES.md` erreichbar.

## `src/components/layout/` — App-Rahmen

`app-shell`, `header`, `sidebar`, `logo`, `theme-provider`, `theme-toggle`, `user-menu`, `brand-watermark`. Reine Struktur/Positionierung; darf als oberste Schicht aus allen anderen importieren.

## `prisma/seed-data/` & `scripts/` — Demo-Daten

- `prisma/seed-data/demo-games.ts` — Demo-Titel inkl. ihrer BGG-Version (`version`); `demo-editions.ts` legt die Version samt Verlagen an und übernimmt bei bestehender DB ältere Demo-Versionen ohne BGG-Bezug.
- `scripts/lib/demo-games-seed-file.ts` — Lesen/Schreiben von `demo-games.ts` und Versionswahl (`pickDemoVersion`), geteilt von `refresh-demo-games-seed.ts` (alle Felder) und `backfill-demo-game-versions.ts` (nur die Version).

## Wartungsregeln

1. **Import-Richtung einhalten** — `ui → entities → widgets → feature → layout`, `lib` nie in Richtung UI. Lint bricht sonst.
2. **DRY ab der zweiten Kopie**: Wird etwas ein zweites Mal geschrieben, wandert es in die passende tiefere Schicht (`ui/` wenn fachfrei, `entities/` wenn Anzeige eines Fachobjekts, `widgets/` wenn kompletter Use Case, `lib/` wenn Regel/Format).
3. **Max. 400 Zeilen pro Datei.** Wird es mehr, entlang der Fachlichkeit aufteilen (Beispiel: `holdings.ts` → Schreibseite + `holdings-lookup.ts` Leseseite).
4. **Dateien unter 100 Zeilen nur, wenn sie mehrfach importiert werden.** Einmalig genutzte Kleinkomponenten gehören in ihren Aufrufer. Begründete Ausnahmen: `layout/*` (jeweils eigener Rahmen-Baustein) und `theme-provider.tsx` (technisch nötige `"use client"`-Grenze).
5. **Colocation**: Tests (`*.test.ts(x)`) liegen neben ihrem Subjekt.
6. **Coverage-Pflicht nur für `lib/` und `actions.ts`**: Die Geschäftsregeln (`src/lib/**`) und Server Actions (`src/components/**/*actions.ts`, also `actions.ts` und `*-actions.ts`) tragen eine Coverage-Schwelle (`vitest.config.ts`, aktuell 80 %). UI-Komponenten und Routen haben bewusst keine — das ist eine Entscheidung (siehe Issue #38), keine Lücke.
test-pr-marker
