# Ausführungsplan: Ready-Sub-Issues von Epic #133 (Markt)

Erstellt: 2026-08-28
Enthält alle Informationen der 10 Ready-Issues (Titel, Body, AC, Checkliste) — **keine erneute `gh issue view`-Recherche nötig**, um mit der Umsetzung zu starten. Bei Unklarheiten während der Umsetzung trotzdem den Issue-Link im Board öffnen, falls seitdem neue Kommentare hinzukamen.

## Board-Automatik (GitHub Projects v2)

Projekt: `oecher meeples portal` (Org `oecher-meeples`, Projekt-Nr. 1)

```
PROJECT_ID = PVT_kwDOCJfCSs4BertC
STATUS_FIELD_ID = PVTSSF_lADOCJfCSs4BertCzhZEEz0
STATUS_IN_PROGRESS = 47fc9ee4
STATUS_IN_REVIEW   = df73e18b
STATUS_READY       = 61e4505c
STATUS_DONE        = 98236657
```

Item-IDs pro Issue (Mapping Issue-Nummer → Projekt-Item-ID):

| Issue | Item-ID |
|---|---|
| #136 | `PVTI_lADOCJfCSs4BertCzg2c2h0` |
| #168 | `PVTI_lADOCJfCSs4BertCzg2j4js` |
| #169 | `PVTI_lADOCJfCSs4BertCzg2j4tU` |
| #170 | `PVTI_lADOCJfCSs4BertCzg2j6X8` |
| #171 | `PVTI_lADOCJfCSs4BertCzg2j6fA` |
| #174 | `PVTI_lADOCJfCSs4BertCzg2j-W0` |
| #175 | `PVTI_lADOCJfCSs4BertCzg2j-ks` |
| #254 | `PVTI_lADOCJfCSs4BertCzg4LhGU` |
| #266 | `PVTI_lADOCJfCSs4BertCzg4LhOM` |
| #275 | `PVTI_lADOCJfCSs4BertCzg4Lhbs` |

**Regel pro Issue:**
- **Beim Start der Arbeit** (bevor der erste Commit für dieses Issue passiert):
  ```
  gh project item-edit --project-id PVT_kwDOCJfCSs4BertC --id <ITEM_ID> \
    --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 --single-select-option-id 47fc9ee4
  ```
- **Nach Fertigstellung** (Implementierung + Tests grün, bereit für PR/Review):
  ```
  gh project item-edit --project-id PVT_kwDOCJfCSs4BertC --id <ITEM_ID> \
    --field-id PVTSSF_lADOCJfCSs4BertCzhZEEz0 --single-select-option-id df73e18b
  ```

Diese beiden Befehle bei jedem Issue unten ausführen — Item-ID aus der Tabelle oben einsetzen.

## Reihenfolge

Abhängigkeit beachten: **#170 muss vor #175 fertig sein** (Crop-Baustein wird in #175 wiederverwendet). Ansonsten unabhängig, aber empfohlene Reihenfolge nach Aufwand/Zusammenhang:

1. #168 (Bugfix, klein)
2. #169 (Bugfix, klein)
3. #171 (Feature, klein — Lightbox)
4. #174 (Feature, klein — Thumbnails)
5. #170 (Feature, klein-mittel — Crop nach Kamera-Aufnahme)
6. #175 (Feature, mittel — Bearbeiten-Button, **blocked by #170**, danach entsperren)
7. #136 (Feature, mittel — Ersatzteillager Self-Service)
8. #254 (Feature, mittel — Newsletter-Abo)
9. #266 (Feature, groß — Bring & Buy Self-Service + Warenkorb)
10. #275 (Feature, mittel — BGG-Import-Dialog)

Alle Bild-bezogenen Issues (#168, #169, #170, #171, #174, #175) betreffen denselben Feature-Ordner `src/components/feature/markt/` — nach Möglichkeit early prüfen, ob sich `object-contain`/Fit-Änderung aus #168 mit #169/#171/#174 überschneidet (DRY: gemeinsames Bild-Darstellungs-Pattern nicht mehrfach einführen).

**Geklärt (Grilling-Session 2026-08-28):** Vor #168 wird das Fit-Pattern (`object-contain`, ggf. mit Hintergrundfarbe für Leerraum) als gemeinsame Komponente/Util extrahiert (`components/entities/` oder `components/ui/`, je nach Fachlichkeit) — nicht erst optional bei #168 einführen und lose bei den Folge-Issues prüfen. #168–#175 nutzen diese Komponente von Anfang an.

---

## #168 — Markt: Bilder in Detailansicht werden zerschnitten statt gestaucht (fit-Option fehlt)

**Labels:** bug, ready, ui

### Kontext
In der Detailansicht eines Marktplatzangebots werden Bilder per `object-cover` dargestellt (`src/components/feature/markt/market-listing-detail-view.tsx:20` und `:33`). Bei Bildern, deren Seitenverhältnis vom quadratischen `aspect-square`-Container abweicht, werden Motivteile abgeschnitten statt das Bild vollständig anzuzeigen.

### Given/When/Then
**Given:** Ein Marktplatzangebot hat ein Foto mit einem Seitenverhältnis, das vom quadratischen Anzeige-Container abweicht (z. B. Hochformat- oder Panoramafoto)
**When:** Ein Meeple die Detailansicht des Angebots öffnet
**Then:** Das Bild wird vollständig sichtbar innerhalb des Containers gestaucht/eingepasst (`object-contain`) statt beschnitten, es gehen keine Bildinhalte verloren

### Checkliste
- [ ] Fit-Verhalten der Hauptbild- und Galerie-Vorschaubilder in `market-listing-detail-view.tsx` von `object-cover` auf eine Variante ohne Beschnitt umstellen (`object-contain`, ggf. mit Hintergrundfarbe für den Leerraum)
- [ ] Visuelle Prüfung mit Hoch- und Querformat-Testbildern

---

## #169 — Markt: Titelbilder werden in der Marktplatz-Übersicht nicht geladen

**Labels:** bug, ready, ui

### Kontext
Die Karte für ein Marktplatzangebot (`src/components/feature/markt/market-listing-card.tsx:19-22`) rendert immer `<PlaceholderMedia label="FOTO" />` und zeigt nie ein tatsächliches Bild aus `listing.imageUrls` an — im Gegensatz zur Detailansicht (`market-listing-detail-view.tsx`), die das erste Bild korrekt lädt.

### Given/When/Then
**Given:** Ein Marktplatzangebot hat mindestens ein Bild in `imageUrls`
**When:** Ein Meeple die Marktplatz-Übersicht (`/markt`) öffnet
**Then:** Die Angebotskarte zeigt das erste Bild aus `imageUrls` als Titelbild an; nur wenn `imageUrls` leer ist, wird der `PlaceholderMedia`-Platzhalter angezeigt

### Checkliste
- [ ] `MarketListingCard` so anpassen, dass bei vorhandenem `listing.imageUrls[0]` dieses Bild gerendert wird, sonst `PlaceholderMedia` (analog zum Muster in `market-listing-detail-view.tsx`)
- [ ] Konsistentes Fit-Verhalten mit der Detailansicht sicherstellen (siehe #168)

---

## #171 — Markt: Bilder in Detailansicht per Klick in Dialog vergrößern

**Labels:** feature, ready, ui

### Kontext
In der Detailansicht eines Marktplatzangebots (`src/components/feature/markt/market-listing-detail-view.tsx`) werden Haupt- und Galeriebild als einfache `<img>`-Elemente ohne Interaktion gerendert. Es gibt keine Möglichkeit, ein Bild vergrößert zu betrachten.

### Given/When/Then
**Given:** Ein Meeple betrachtet die Detailansicht eines Marktplatzangebots mit mindestens einem Bild
**When:** Es auf das Hauptbild oder ein Galerie-Vorschaubild klickt
**Then:** Das Bild öffnet sich vergrößert in einem Dialog/Lightbox (analog zum bestehenden `Dialog`-Baustein aus `components/ui/dialog.tsx`), der sich per Klick/Escape wieder schließen lässt

### Checkliste
- [ ] Klick-Handler auf Haupt- und Galeriebildern in `market-listing-detail-view.tsx` ergänzt
- [ ] Vergrößerte Ansicht nutzt den bestehenden `Dialog`-Baustein (`components/ui/dialog.tsx`), kein neues Modal-Skelett
- [ ] Bild wird im Dialog mit Fit ohne Beschnitt dargestellt (siehe #168)

---

## #174 — Markt: Vorschau-Thumbnails für hochgeladene Bilder im Formular

**Labels:** feature, ready, ui

### Kontext
Nach dem Hochladen von Bildern beim Erstellen/Bearbeiten eines Markt-Inserats (`market-listing-fields.tsx:124-128`) wird nur ein Zähltext „X Bild(er) hochgeladen." angezeigt — die Bilder selbst sind im Formular nicht sichtbar, bevor das Inserat gespeichert wird.

### Given/When/Then
**Given:** Ein Mitglied hat beim Erstellen/Bearbeiten eines Markt-Inserats ein oder mehrere Bilder hochgeladen
**When:** Der Upload abgeschlossen ist
**Then:** Statt des reinen Zähltexts erscheinen Vorschau-Thumbnails der hochgeladenen Bilder (`imageUrls`) direkt im Formular

### Checkliste
- [ ] Thumbnail-Grid in `MarketListingFields` statt/ergänzend zum Zähltext unter `imageUrls.length > 0`
- [ ] Konsistentes Fit-Verhalten mit Detail-/Kartenansicht (kein Beschnitt, siehe #168)

---

## #170 — Markt: Crop-Funktion nach Kamera-Aufnahme fehlt

**Labels:** feature, ready, ui
**Blockiert:** #175 (dort wird dieser Baustein wiederverwendet)

### Kontext
Die Kamera-Aufnahme (`src/components/ui/camera-capture.tsx` + `src/components/ui/use-camera-capture.ts`, #108) erzeugt beim Klick auf „Aufnehmen" direkt eine fertige Datei aus dem vollen Kamerabild (`useCameraCapture.capture()`). Es gibt keinen Zwischenschritt, in dem der Nutzer den Bildausschnitt anpassen oder den Hintergrund wegschneiden kann.

**Wichtig:** Der benötigte Baustein existiert bereits vollständig und getestet aus #223: `src/components/ui/image-crop-dialog.tsx` (`<ImageCropDialog>`, controlled, nimmt `File` entgegen, liefert gecropptes `File` via `onCropped`) + `src/lib/utils/crop-image.ts` (reine Crop-Funktion), inkl. Tests (`image-crop-dialog.test.tsx`, `crop-image.test.ts`). Dependency `react-easy-crop` ist bereits in `package.json` vorhanden. `ImageCropDialog` wird aktuell **nirgends produktiv verwendet** — hier geht es nur um den **Einbau**, nicht um den Bau des Croppers selbst.

### Given/When/Then
**Given:** Ein Mitglied nimmt beim Erstellen eines Markt-Inserats ein Foto über die In-App-Kamera auf
**When:** Die Aufnahme ausgelöst wurde
**Then:** Vor der Übernahme ins Formular erscheint ein Crop-Schritt (`ImageCropDialog`), in dem der Nutzer den Bildausschnitt frei wählen/zoomen/verschieben kann; erst nach Bestätigen des Zuschnitts wird das zugeschnittene Bild zu `imageUrls` hinzugefügt

### Checkliste
- [ ] `<ImageCropDialog>` (`src/components/ui/image-crop-dialog.tsx`) in `market-listing-fields.tsx` zwischen `handleCameraCapture(file)` und `handleImagesChange` einhängen, statt das Kamerabild direkt zu komprimieren/hochzuladen
- [ ] Nutzer kann den Zuschnitt bestätigen ("Übernehmen") oder abbrechen und erneut aufnehmen
- [ ] Ergebnis von `onCropped` bleibt ein `File`-Objekt, sodass der bestehende Upload-Pfad (`compressImage` → `useBlobUpload`) unverändert weiterläuft
- [ ] Bestehende Tests für `market-listing-fields.tsx` angepasst/ergänzt für den neuen Zwischenschritt

**Priorität (aus Live-Review): Low**

---

## #175 — Markt: Inserate nachträglich editierbar — Bearbeiten-Button auf Detailseite für Autor und Admin

**Labels:** feature, ready, ui, blocked
**Blocked by:** #170 — **erst nach #170 starten**, dann `blocked`-Label entfernen.

### Kontext
Ein „Bearbeiten"-Button existiert bereits auf der Karte in der Übersicht (`MarketListingCard`, nur für `isOwn`), aber nicht auf der Detailseite (`market-listing-detail-view.tsx`) und nicht für Admins. Zusätzlich erlaubt `MarketListingFields` beim Bearbeiten nur das Hinzufügen neuer Bilder — einzelne bereits hochgeladene Bilder können weder gelöscht noch zugeschnitten noch als Titelbild markiert werden; `imageUrls` hat keine Titelbild-Ordnung/-Markierung.

### Given/When/Then
**Given:** Ein Mitglied ist Autor eines Markt-Inserats oder hat die Admin-Berechtigung
**When:** Es die Detailseite des Inserats öffnet
**Then:** Ein „Bearbeiten"-Button ist sichtbar (analog zum bestehenden Muster in `MarketListingCard`, aber zusätzlich für Admins über die Berechtigungsprüfung aus `lib/auth/permissions.ts`); im Bearbeiten-Dialog kann jedes bereits hochgeladene Bild einzeln zugeschnitten, gelöscht oder als Titelbild markiert werden

### Checkliste
- [ ] „Bearbeiten"-Button auf `market-listing-detail-view.tsx` ergänzt, sichtbar für Autor (`sellerMeepleId === ownMeepleId`) und Admin
- [ ] Admin-Fall in der zugehörigen Server Action (`updateOwnMarketListing`/Berechtigungsprüfung) berücksichtigt, nicht nur Autoren-Check
- [ ] Pro Bild in `MarketListingFields`/`EditMarketListingDialog`: Löschen-Aktion, Zuschneiden-Aktion (nutzt `ImageCropDialog` aus #170), „Als Titelbild markieren"-Aktion
- [ ] Titelbild-Reihenfolge/-Markierung in `imageUrls` bzw. `MarketListingView` abgebildet
- [ ] `blocked`-Label auf GitHub entfernen, sobald #170 gemerged ist: `gh issue edit 175 --remove-label blocked`

---

## #136 — Feature-Idee: Meeple können Spiele ins Ersatzteillager spenden

**Labels:** feature, ready

### Kontext
Meeple sollen eigene, beschädigte oder unvollständige Spiele selbst ins Ersatzteillager (`SparePartListing`) einstellen können, statt dass das nur Admins (`games:manage`) dürfen. Das Ersatzteillager ist bereits ein eigenständiges Prisma-Modell (`prisma/schema.prisma:514-529`), unabhängig vom Marktplatz-Inserat-Flow (`/markt`).

**Abgrenzung zu #267** (Spendenseite, separates Issue): #267 behandelt vollständige, funktionsfähige Spiele, die ins Vereinseigentum (Ludothek-Bestand) übergehen. #136 behandelt ausschließlich beschädigte/unvollständige Spiele fürs Ersatzteillager.

**Geklärt (2026-08-28):**
- **Kein Eigentumsübergang.** Der Eintrag bleibt beim bisherigen Eigentümer — er wird weiterhin als `keeperMeepleId` referenziert (bestehende Fachlichkeit aus `CONTEXT.md`: "Posten loser Teile … mit einem Verwahrer"), nicht ans Vereinseigentum übertragen.
- Zweck des Self-Service-Eintrags: Kontaktmöglichkeit anbieten, damit Interessierte sich bei der/dem Eigentümer:in melden können — kein automatischer Übergang, keine Kaufabwicklung.
- **Keine Admin-Freigabe** nötig — nach dem Anlegen durch das Meeple sofort öffentlich sichtbar.
- Kontakt läuft über den bestehenden `getContactLinks()`-Baustein (`src/lib/members/contact.ts`), analog zur Marktplatz-Detailansicht — hier gibt es (anders als bei #267) eine konkrete Person (den Verwahrer), keine Vereinsadresse.

**Berechtigungen (Änderung ggü. Ist-Zustand):**
- Anlegen: aktuell nur `games:manage` (`spare-part-actions.ts:12`) → wird für jedes Meeple geöffnet (eigener Eintrag mit sich selbst als `keeperMeepleId`)
- Bearbeiten: nur der/die Verwahrer:in (`keeperMeepleId === ownMeepleId`) oder Admin
- Löschen: Verwahrer:in oder Admin

### Given/When/Then
**Given:** Ein Meeple ist eingeloggt und hat ein beschädigtes/unvollständiges Spiel
**When:** Es das Spiel selbst als Ersatzteillager-Eintrag anlegt
**Then:** Der Eintrag ist sofort für alle sichtbar (keine Freigabe nötig), das Meeple bleibt als Verwahrer (`keeperMeepleId`) hinterlegt, Interessierte sehen dessen Kontaktmöglichkeiten (`getContactLinks`)

**Given:** Ein Ersatzteillager-Eintrag wurde von einem Meeple selbst angelegt
**When:** Ein anderes Meeple (nicht Verwahrer, nicht Admin) versucht ihn zu bearbeiten oder zu löschen
**Then:** Die Aktion wird verweigert (nur Verwahrer oder Admin dürfen bearbeiten/löschen)

### Checkliste
- [ ] `createSparePartListing` erlaubt Anlegen durch jedes eingeloggte Meeple (nicht mehr nur `games:manage`), setzt `keeperMeepleId` auf das anlegende Meeple
- [ ] Self-Service-Formular zum Hinzufügen eines Spiels im Ersatzteillager (außerhalb des Admin-Bereichs `admin-bestand`)
- [ ] Sofortige öffentliche Sichtbarkeit nach dem Anlegen (kein Freigabe-Workflow)
- [ ] Bearbeiten nur durch Verwahrer:in (`keeperMeepleId === ownMeepleId`) oder Admin
- [ ] Löschen durch Verwahrer:in oder Admin
- [ ] Anzeige zeigt Kontaktmöglichkeiten des Verwahrers (`getContactLinks`), kein Eigentumsübergang an den Verein

**Geklärt (Grilling-Session 2026-08-28):**
- `createSparePartListing`/`deleteSparePartListing` liegen aktuell in `components/feature/admin-bestand/spare-part-actions.ts` (Admin-Feature) — für das Self-Service-Formular unter `components/feature/markt/` verboten zu importieren (Layer-Regel). Actions (inkl. neu zu ergänzendem `updateSparePartListing`, existiert bisher **nicht**) werden nach `src/lib/inventory/` verschoben; sowohl Admin-Seite als auch neues Markt-Self-Service-Formular rufen von dort auf.
- Kein Limit für aktive Einträge pro Meeple — bewusst unbegrenzt (Vertrauensbasis, kleine Vereins-Community).

---

## #254 — Marktplatz: Angebote abonnieren, täglicher Newsletter mit neuen Angeboten

**Labels:** feature, ready

### Kontext
Meeple sollen im Marktplatz Angebote abonnieren können. Ein täglicher Newsletter fasst alle neuen Angebote des Tages zusammen.

### Technischer Befund
Technisch anschließbar an die bestehende Newsletter-Infrastruktur: `src/lib/newsletter/mailer.ts` (`sendTransactionalEmail`) + `src/lib/newsletter/dispatch.ts` (Queue/Cron-Pattern, gleicher Cron-Trigger wie Instagram-Dispatch). Kandidat für den Digest ist `MarketListing` (`prisma/schema.prisma:524-539`, ungated, `createdAt`), **nicht** `FleaMarketItem` (eventgebunden, approval-pflichtig).

**Geklärt (2026-08-27):**
- Abo-Granularität: **kein Filter** — ein einfaches An/Aus-Abo für alle neuen Marktplatz-Angebote
- Versandzeitpunkt: **abends** (z. B. 18 Uhr), analog zum bestehenden Cron-Dispatch-Pattern
- Verhalten bei 0 neuen Angeboten am Tag: **kein Versand** (keine Leer-Mail)

### Given/When/Then
**Given:** Ein Meeple hat den Marktplatz-Newsletter abonniert
**When:** Es abends zum Versandzeitpunkt mindestens ein neues `MarketListing` seit dem letzten Versand gibt
**Then:** Der Meeple erhält eine Digest-Mail mit allen an diesem Tag neu angelegten Angeboten

**Given:** Es gab an einem Tag keine neuen Angebote
**When:** Der Versandzeitpunkt erreicht ist
**Then:** Es wird keine Mail verschickt

### Checkliste
- [ ] Abo-Mechanismus für Marktplatz-Newsletter (An/Aus, keine Kategorie-/Suchbegriff-Filterung)
- [ ] Täglicher Cron-Dispatch abends, der neue `MarketListing`-Einträge seit letztem Versand sammelt
- [ ] Bei 0 neuen Angeboten: kein Versand
- [ ] Digest-Mail über bestehende `sendTransactionalEmail`-Infrastruktur (`src/lib/newsletter/mailer.ts`)
- [ ] Abmelden/Verwalten analog zum bestehenden Newsletter-Manage-Link-Pattern

**Geklärt (Grilling-Session 2026-08-28):** Abo als einfaches `Meeple.marketNewsletterOptIn: Boolean`, **nicht** als neue Kategorie im bestehenden `NewsletterSubscriber`-Modell — dieses ist für anonyme/öffentliche Abonnenten gedacht; eine meeple-only-Kategorie dort würde eine dauerhafte Sonderfall-Verzweigung auf der Verwaltungsseite erzwingen. Verwaltung im Profil; Abmelde-Link in der Digest-Mail ohne eigenes Double-Opt-in-Token (Meeple ist bereits verifiziert).

---

## #266 — Bring & Buy: Self-Service-Verkäuferanmeldung per Token (Weiterentwicklung)

**Labels:** feature, ready

### Idee
Bring & Buy Weiterentwicklung:
- Meeple mit Recht "Event-Verwaltung" können die Seite für Gäste einblenden (bereits vorhanden: `Event.hasBringAndBuyMarket` + Zeitfenster, `isBringAndBuyMarketOpen()` in `src/lib/events/upcoming.ts`).
- Vor/während dem Event: Button "Spieleverkauf anmelden" öffnet Popup zur Eingabe von Verkäufername, Kürzel, E-Mail. Es wird ein Token generiert und alles persistiert; der Nutzer erhält eine E-Mail mit persönlichem Link.
- Auf der persönlichen Seite (per Token identifiziert) sieht der Verkäufer seine angemeldeten Spiele und kann neue per Formular (Titel, Sprache, Preis) anlegen. Status "angemeldet" (`PENDING`). Nur angemeldete Spiele können bearbeitet werden.
- Mit Übergabe am Markt wechselt der Zustand zu "Verfügbar" (`FOR_SALE`).
- Während des Events: alle Gäste sehen die verfügbaren Spiele (nach Möglichkeit mit BGG-Cover).

### Geklärt (2026-08-28)

**Zielgruppe des Token-Flows:** Dieser Feature betrifft ausschließlich **externe, nicht angemeldete Verkäufer:innen ohne Vereinsmitgliedschaft** — bewusste, eng begrenzte Ausnahme, keine allgemeine anonyme Nutzung des Portals. Vereinsmitglieder (Meeple) können ebenfalls Spiele zum Verkauf anmelden, benötigen dafür aber **kein Token** — sie sind bereits über ihre bestehende Anmeldung (Login) identifiziert. Die 2023 in #211 entfernte Mitglieder-Self-Service-Artikelanlage bleibt entfernt und wird hierdurch **nicht** wieder eingeführt; der Token-Mechanismus ist ein komplett neuer, separater Pfad ausschließlich für Externe.

**Zustandsmodell:** Das bestehende Vier-Zustands-Enum `PENDING → FOR_SALE → RESERVED → SOLD` (`prisma/schema.prisma:89-94`) bleibt vollständig erhalten, inklusive `RESERVED`.

**Kein digitaler Verkauf/Bezahlvorgang.** Die Seite bietet ausschließlich Anmeldung und Informationsdarstellung. Zustandsänderungen an der Kasse laufen weiterhin bar/physisch ab; die Kassenperson (Verkäufer:in selbst, per Token/Login identifiziert) ändert die Zustände über die eigene Seite.

**Warenkorb-Workflow für Verkäufer:innen an der Kasse:**
- Der/die Verkäufer:in sieht eine editierbare Übersichtsliste der eigenen Artikel und kann mehrere Artikel in einen "Warenkorb" legen; der Warenkorb zeigt eine Abrechnungssumme (Summe der Einzelpreise).
- Zwei Aktionen auf dem gefüllten Warenkorb: **"Verkauft"** oder **"Reservieren"**.
  - "Verkauft": alle Artikel im Warenkorb wechseln zu `SOLD`, Warenkorb wird geleert.
  - "Reservieren": erfordert die Eingabe eines Namens, unter dem der Warenkorb zwischengespeichert wird; alle enthaltenen Artikel wechseln zu `RESERVED`, Warenkorb wird geleert.
- Zusätzlicher Tab zeigt alle zwischengespeicherten, reservierten Warenkörbe (nach Name) — der/die Verkäufer:in kann einen reservierten Warenkorb wiederherstellen (z. B. um ihn später doch als "Verkauft" abzuschließen oder Artikel zu ändern).
- **Ist der Warenkorb leer**, bietet jeder einzelne Artikel in der Liste direkt die Buttons "Verkauft" und "Reserviert" an — diese lösen exakt denselben Workflow aus wie oben, nur für genau diesen einen Artikel (kein Unterschied in der Logik, nur eine Abkürzung für den Ein-Artikel-Fall).

### Befund — technischer Anschluss
- Token-per-E-Mail-Link ist als Pattern bereits etabliert (Newsletter `manageToken`, Invite `token`) — technisch anschließbar, aber neu für `FleaMarketItem`.
- `FleaMarketItem.sellerMeepleId` ist aktuell Pflichtfeld — für externe Token-Verkäufer:innen wird ein alternativer, nicht-Meeple-gebundener Verkäufer-Bezug benötigt (Name/Kürzel/E-Mail statt `sellerMeepleId`), oder das Feld muss optional werden mit einem Parallelfeld für externe Verkäufer:innen.
- Der Warenkorb-/Kassen-Workflow ist analog zum bestehenden Admin-Kassenfluss (`src/components/feature/admin-bringbuy/cashier-actions.ts`) zu bauen, aber für die Verkäufer:in selbst statt nur für Admins.

### Geklärt (Grilling-Session 2026-08-28) — Begriffskorrektur & erweitertes Zustandsmodell

**Begriffskorrektur „Verkäufer:in" im Warenkorb-Abschnitt:** Der Warenkorb-/Kassen-Workflow oben ("Warenkorb-Workflow für Verkäufer:innen an der Kasse") bezieht sich auf die **Kassenperson** (Meeple mit Kassenschicht-Berechtigung, `FLEA_MARKET_CASHIER_PERMISSION_KEY`), **nicht** auf die externe/anmeldende Person. Der Warenkorb hat die Hoheit über den gesamten Flohmarkt (alle Artikel des Events), nicht nur über eigene Artikel. Es handelt sich um eine Erweiterung der **bestehenden** Kassenansicht (`admin-bringbuy`), keine neue Self-Service-Oberfläche für externe Personen.

**Statuswechsel-Logik extrahieren:** `NEXT_STATUS`, `approveFleaMarketItem`, `setFleaMarketItemStatus` liegen aktuell in `components/feature/admin-bringbuy/cashier-actions.ts`. Sowohl die (erweiterte) Kassenansicht als auch die neue Verkäufer-Registrierungsseite (Anlegen/Bearbeiten eigener `PENDING`-Artikel) brauchen dieselbe Logik — Layer-Regel verbietet Cross-Feature-Import. Wird vor/im Rahmen von #266 nach `src/lib/bringbuy/` extrahiert.

**PENDING→FOR_SALE-Gate bleibt unverändert:** Die Freigabe bei physischer Übergabe bleibt Aufgabe der Kassenperson (`approveFleaMarketItem`), für externe **und** eigene Meeple-Artikel gleichermaßen. Meeple dürfen (wieder) eigene Artikel selbst als `PENDING` anmelden, **ohne Token**, über ihre bestehende Anmeldung — die 2023 in #211 entfernte *unkontrollierte* Self-Service-Anlage (Artikel sofort live ohne Kontrolle) bleibt entfernt; dieser neue Pfad ist kontrolliert (immer `PENDING`, Freigabe bleibt bei der Kasse) und daher kein Widerspruch zu #211.

**Erweitertes Zustandsmodell `FleaMarketItemStatus`** (englische Namen, ergänzt bestehendes `PENDING → FOR_SALE → RESERVED/SOLD`):
- `SOLD → PAID_OUT`: Kassenperson zahlt den Verkaufserlös an die Verkäufer:in aus (explizite Kassierer-Aktion, kein impliziter Zustand).
- `FOR_SALE → RETURNED` und `RESERVED → RETURNED`: Verkäufer:in holt ein nicht verkauftes Stück wieder ab (beide Vorzustände erlaubt, auch bei stornierter Reservierung).
- `FOR_SALE → DONATED`: nach Event-Ende, für nicht abgeholte Artikel — **manuelle** Kassierer-Aktion (kein Cron/Automatismus). `DONATED` ist **nur ein Status-Label** auf `FleaMarketItem` — keine automatische Ludothek-/GameCopy-Buchung; die tatsächliche Bestandsübernahme bleibt manuell/#267, um #266 nicht an die Ludothek-Domäne zu koppeln.
- Token-Gültigkeit: Der Token einer externen Person wird ungültig, sobald kein eigener Artikel mehr im Zustand `SOLD` ist (Ziel: alle eigenen Artikel erreichen `PAID_OUT`).

**Warenkorb-Persistenz:** Neues Prisma-Modell (z. B. `FleaMarketCart`: Name, `eventId`, referenzierte `FleaMarketItem`-IDs) für die "Reservierte Warenkörbe"-Liste — muss Reloads und Geräte-/Sitzungswechsel der Kassenperson überleben, reiner Client-State reicht nicht.

### Given/When/Then
**Given:** Ein Bring & Buy-Event ist sichtbar geschaltet (`hasBringAndBuyMarket`)
**When:** Eine externe, nicht als Meeple angemeldete Person auf "Spieleverkauf anmelden" klickt und Name/Kürzel/E-Mail einträgt
**Then:** Ein Token wird generiert, die Anmeldung persistiert, und die Person erhält eine E-Mail mit persönlichem Link zu ihrer Verkäuferseite

**Given:** Ein Meeple ist eingeloggt
**When:** Es während eines offenen Bring & Buy-Events Spiele zum Verkauf anmelden möchte
**Then:** Es benötigt kein Token, sondern gelangt direkt über die bestehende Anmeldung zur eigenen Verkäuferseite

**Given:** Eine Verkäufer:in (Token oder Login) hat mehrere Artikel im Status `FOR_SALE` in den Warenkorb gelegt
**When:** Sie auf "Verkauft" klickt
**Then:** Alle Artikel im Warenkorb wechseln zu `SOLD`, der Warenkorb wird geleert

**Given:** Eine Verkäufer:in hat mehrere Artikel im Warenkorb
**When:** Sie auf "Reservieren" klickt und einen Namen eingibt
**Then:** Alle Artikel wechseln zu `RESERVED`, der Warenkorb wird unter diesem Namen zwischengespeichert und geleert, und erscheint im Tab "Reservierte Warenkörbe"

**Given:** Der Warenkorb ist leer
**When:** Die Verkäufer:in bei einem einzelnen Artikel in der Liste auf "Verkauft" oder "Reserviert" klickt
**Then:** Läuft derselbe Workflow wie oben ab, beschränkt auf genau diesen einen Artikel

### Checkliste
- [ ] Popup "Spieleverkauf anmelden" (Name, Kürzel, E-Mail) für externe, nicht-Meeple-Verkäufer:innen, generiert Token + E-Mail mit persönlichem Link
- [ ] Meeple nutzen denselben Verkäuferseiten-Flow über ihre bestehende Anmeldung, ohne Token
- [ ] Formular zum Anlegen eigener Artikel (Titel, Sprache, Preis), Status `PENDING` ("angemeldet")
- [ ] Nur `PENDING`-Artikel sind für die Verkäufer:in bearbeitbar
- [ ] Übergabe am Markt: Wechsel zu `FOR_SALE` ("verfügbar"), für alle Gäste sichtbar (nach Möglichkeit mit BGG-Cover)
- [ ] Warenkorb-UI: Artikel auswählen, Summenanzeige, Aktionen "Verkauft" (→ `SOLD`) und "Reservieren" (→ `RESERVED`, mit Namenseingabe)
- [ ] Tab "Reservierte Warenkörbe": Liste nach Name, Wiederherstellen möglich
- [ ] Bei leerem Warenkorb: Einzelartikel bieten direkt "Verkauft"/"Reserviert" mit identischer Logik
- [ ] Kein digitaler Bezahlvorgang — rein Zustandsverwaltung, Bezahlung bleibt bar/physisch
- [ ] Schema-Erweiterung für externe (nicht-Meeple) Verkäufer:innen (Name/Kürzel/E-Mail statt/neben `sellerMeepleId`)

---

## #275 — Marktplatz: 'BGG for trade importieren'-Button für Angebotserstellung

**Labels:** feature, ready

### Idee
Hat ein Meeple seinen BGG-Benutzernamen im Profil gepflegt, so ist im Marktplatz ein Button "BGG for trade importieren" verfügbar. Dieser lädt die eigene Spieler-Collection nach "for trade" und öffnet einen eigenen Dialog mit allen Spielen als Liste, je Eintrag ein Button "Anzeige erstellen". Spieltitel und Bild werden aus BGG übernommen, Beschreibung/Preis/Zustand pflegt der Nutzer selbst. Nach dem Speichern kehrt der Meeple in die vorherige Liste zurück.

### Geklärt (2026-08-28)
- Der Dialog zeigt **nur die eigenen `forTrade === true`-Einträge** der Collection (kein Filter-Toggle für die restliche Collection).
- **Duplikatsschutz:** Wird für einen Titel bereits ein eigenes `MarketListing` mit demselben Namen angelegt, erscheint eine Warnung (kein Hard-Block — der Meeple kann trotzdem fortfahren, z. B. bei einer zweiten Kopie desselben Spiels).
- Es wird ein **eigener Dialog** gebaut (nicht integriert in `create-market-listing-dialog.tsx`).

### Befund — technischer Anschluss
`fetchBggCollection()` (`src/lib/bgg/collection.ts:51-82`) existiert bereits, liefert pro Eintrag bereits das `forTrade`-Flag (Zeile 24, 77) — der zuvor angenommene Blocker ("kein Collection-Endpoint", "Blocked by #255") ist überholt: #255 wurde bereits umgesetzt (`d97ae71`, `6bb358a`, PR #279), der GitHub-Issue-Status dort ist nur nicht nachgezogen (Kommentar mit Schließ-Vorschlag bereits auf #255 hinterlassen).

**Lücke (Grilling-Session 2026-08-28):** `fetchBggCollection()`/`BggCollectionEntry` liefert aktuell **kein Bild-Feld** — muss um `image`/`thumbnail` aus der BGG-Collection-XML-Antwort erweitert werden.

**Geklärt (Grilling-Session 2026-08-28):** Das BGG-Bild wird beim Import heruntergeladen und in den eigenen Blob-Storage übernommen (bestehender Upload-Pfad), **nicht** als Hotlink auf die BGG-URL in `imageUrls` übernommen — konsistentes Fit-/Lightbox-/Crop-Verhalten mit allen anderen Marktplatz-Bildern (#168–#175), kein Abhängigkeitsrisiko bei BGG-URL-Änderungen.

### Given/When/Then
**Given:** ein Meeple hat einen BGG-Benutzernamen im Profil hinterlegt
**When:** er den Marktplatz öffnet
**Then:** ist der Button "BGG for trade importieren" sichtbar; ohne gepflegten Benutzernamen ist er nicht sichtbar

**Given:** der Meeple klickt auf "BGG for trade importieren"
**When:** die eigene BGG-Collection geladen wurde
**Then:** öffnet sich ein eigenständiger Dialog mit der Liste der `forTrade === true`-Einträge, je Eintrag mit Button "Anzeige erstellen"

**Given:** der Meeple klickt bei einem Eintrag auf "Anzeige erstellen"
**When:** bereits ein eigenes `MarketListing` mit demselben Titel existiert
**Then:** wird eine Warnung angezeigt, der Meeple kann trotzdem fortfahren

**Given:** der Meeple füllt Beschreibung, Preis und Zustand aus und speichert
**When:** das Formular abgeschickt wird
**Then:** wird eine `MarketListing`-Anzeige mit Titel/Bild aus BGG angelegt, und er kehrt zur vorherigen Liste zurück

### Checkliste
- [ ] Button nur bei gepflegtem `bggUsername` sichtbar
- [ ] Eigener Dialog lädt eigene BGG-Collection via `fetchBggCollection()`, gefiltert auf `forTrade === true`
- [ ] Titel + Bild werden aus BGG übernommen, nicht editierbar
- [ ] Duplikatswarnung bei bereits existierendem `MarketListing` mit gleichem Titel (kein Hard-Block)
- [ ] Beschreibung/Preis/Zustand sind Pflichtfelder vor dem Speichern
- [ ] Nach Speichern: zurück zur Marktplatz-Liste

---

## Nicht in diesem Plan (bewusst ausgeklammert)

- **#173** — already-done, Kommentar mit Beleg hinterlassen, Schließen vorgeschlagen (noch nicht geschlossen, wartet auf Bestätigung).
- **#266-Folgeidee #269** (Bring & Buy digitale Bezahlung) — zurückgestellt, bleibt `needs-refinement`, bleibt bei Barzahlung.
- **#267** (Spendenseite PayPal + "Spiele spenden"-Karte, Vereinsbestand) — verwandtes, aber eigenständiges Issue außerhalb Epic #133, bereits mit ergänzter Kontakt-/Abgrenzungsinfo `ready`.

## Nach jedem Issue

1. `pnpm run verify` grün.
2. Board-Status → **In Review** (siehe Befehl oben).
3. Commit auf Feature-Branch, PR öffnen, auf grüne CI warten, mergen (Merge-Commit, kein Squash).
4. Nach Merge: Board-Status manuell auf **Done** setzen (nicht Teil der automatischen In-Progress/In-Review-Regel oben, aber konsequent weiterzuführen).
