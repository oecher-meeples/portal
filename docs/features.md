# Feature- & Screen-Beschreibung (für Figma-Mockups)

> Abgeleitet aus [Concept.md](Concept.md), [flow.md](flow.md), [schema.md](schema.md), [roadmap.md](roadmap.md) und [design.md](design.md). Dient als Briefing für die Erstellung von Figma-Mockups — gegliedert nach Bereich → Screen → Elemente/Zustände, inkl. Rollen-Sichtbarkeit und Theme-Vorgaben.

---

## Theme-Vorgaben für alle Screens

- Primärfarbe **`#FFDE00`** (Oecher Gelb), Sekundärfarbe **`#000000`**, siehe [design.md](design.md).
- Jeder Screen wird in **Light- und Dark-Mode** gemockt (Default richtet sich nach Systemeinstellung).
- Komponentenbasis: **shadcn/ui**-Stil (klare Kanten, dezente Schatten, Neutral-Grau als Basis, Gelb als Akzent/CTA-Farbe, nie als Vollflächen-Hintergrund).

---

## Rollen (Sichtbarkeits-Matrix)

| Rolle | Zugriff |
|---|---|
| **Gast/Besucher** | Öffentlicher Bereich, nur lesend |
| **Mitglied (Meeple)** | + Mitgliederbereich, Ludothek, LFG, Ersatzteillager, Kleinanzeigen, Helferplan |
| **Moderator** | + Blog-/Termin-Erstellung, Instagram-Freigabe |
| **Admin/Spiele-Moderator** | + Bestandsverwaltung, Schichtplanung, QR-Generierung, Deinventarisierung, Flohmarkt-Steuerung, Mitglieder-Onboarding |

---

## 1. Öffentlicher Bereich (Public Area)

### 1.1 Startseite
- Hero-Bereich mit Vereinsclaim, Primär-CTA "Jetzt Mitglied werden" / "Spenden"
- Vorschau nächster 3 Events (Datum, Titel, Ort)
- Vorschau letzter 3 Blogbeiträge (Bild, Titel, Anrisstext)
- Footer mit Links zu Rechtlichem

### 1.2 Newsroom / Blog-Übersicht
- Filterbare Liste/Grid aller veröffentlichten Beiträge (Datum, Titel, Teaserbild, Anrisstext)
- Kennzeichnung, falls Beitrag auch auf Instagram gespiegelt wurde (Icon)

### 1.3 Blog-Detailseite
- Titelbild, Titel, Veröffentlichungsdatum, Autor
- Volltextinhalt (Rich Text)
- Optionaler eingebetteter Instagram-Post-Link

### 1.4 Terminkalender (öffentlich)
- Monats-/Listenansicht, gespeist aus Google-Calendar-Sync
- Klick auf Termin → Detail-Panel (Titel, Zeit, Ort, Beschreibung)

### 1.5 Support & Spenden
- Kurzerklärung Spendenzweck
- Spenden-CTA (PayPal-Button/strukturierter Support-Info-Block)

### 1.6 Download-Bereich
- Liste der Formulare/PDFs (Mitgliedsantrag etc.) mit Download-Icon

### 1.7 Rechtliches (Satzung / Datenschutz / Impressum)
- Einfache Textseiten mit Sprunganker-Navigation (Inhaltsverzeichnis links, Text rechts)

### 1.8 Login / Registrierung (Onboarding via Invitation)
- Login-Screen: E-Mail/Passwort-Formular + "Mit Google anmelden"-Button
- Registrierung-per-Invitation-Screen: Token wird aus Link vorbefüllt, Formular zur Kontoerstellung (Passwort setzen), Fehlerzustand "Token ungültig/abgelaufen"

---

## 2. Mitgliederbereich (Members Area)

### 2.1 Mitglieder-Dashboard
- Begrüßung, Kurzübersicht: eigene offene Ausleihen, anstehende Schichten, neue interne News
- Schnellzugriffs-Kacheln zu Ludothek, LFG, Kalender, Marktplatz

### 2.2 Interner Newsroom
- Wie 1.2, aber Feed mit "nur intern"-Kennzeichnung, kein Gast-Zugriff

### 2.3 Interner Kalender
- Wie 1.4, mit zusätzlichem internen Termin-Layer (z. B. Jahreshauptversammlung), farblich unterschieden von öffentlichen Terminen

### 2.4 Mein Profil
- Formular: Name, E-Mail, Bankdaten (maskiert, editierbar), verknüpfte Konten (BGG-Username, BGA-Username)
- DSGVO-Hinweis-Box, Button "Konto löschen" (führt zu Anonymisierungs-Dialog mit Warnhinweis)

### 2.5 Spielergesuche (LFG) — Übersicht
- Liste offener Gesuche: Spieltitel-Cover, Ersteller, Termin, Teilnehmerzähler ("3/5"), Status-Badge (Offen/Geschlossen)
- Filter nach Datum/Spiel
- CTA "Gesuch erstellen"

### 2.6 Spielergesuch erstellen/Detail
- Formular: Spiel auswählen (Suchfeld mit Cover-Vorschau), Titel, Beschreibung, Datum, max. Teilnehmer
- Detailansicht: Teilnehmerliste mit Avataren, Beitreten/Verlassen-Button, "Gesuch voll"-Zustand

### 2.7 Ludothek — Spielsuche (zwei Projektionen)
- Eine Komponente, zwei Sichten: **öffentlich** ohne Standort, Zustand und Personen; **intern** (eingeloggt) zusätzlich mit Standort-Kette, Zustand und Verantwortliche:r
- Suchleiste (matcht auch Verlag/Autor, #205) + Filter (Spieleranzahl, Spieldauer, Komplexität/Gewichtung, Mechanik, Erstveröffentlichung von/bis); intern zusätzlich Zustand, "ist ausgeliehen", "bei Meeple X"
- **Alle Filter liegen in `searchParams`** und werden serverseitig angewendet, damit jede Filterkombination als Link teilbar ist
- Ergebnis-Grid: Spielkarten (Cover, Titel, Spieleranzahl, Dauer, Verlag); Listenansicht zusätzlich mit Verlag, nicht in der Kompakt-Ansicht (#205); intern Zustands-Badge (frei / ausgeliehen / Wartung / nicht erfasst)
- **Sprachneutral**-Badge für Titel mit BGGs Language-Dependence-Level 1 (kein notwendiger Text, #188)
- Deinventarisierte Spiele erscheinen nicht

### 2.8 Spiel-Detailseite
- Cover, Metadaten (BGG-Import: Spieleranzahl, Dauer, Gewichtung), Beschreibung
- Sprachabhängigkeit (BGGs 5-stufiges Poll-Modell, als Vorschlag beim Import übernommen) und je Exemplar die Regelheft-Sprache(n) (DE/EN/Sonstige, Mehrfachauswahl, #188)
- Intern zusätzlich: **Standort-Kette** (Spiel → Karton → Regal → Verwahrer), Verantwortliche:r, Zustand, letzte Prüfung
- Intern: **Aufenthalts-Historie** (Vorgang, Ziel, Zeitraum, erfasst von; unbestätigte Aufenthalte mit Herkunftshinweis)
- Aktionen: "Ausleihen", "Zurückgeben", "Weitergeben", "Ich habe dieses Spiel erhalten" — je nach aktuellem Aufenthalt
- Liste der "Erklärbären" mit Erfahrungsstufe (Phase 6)
- Keine Reservierung und keine Leihfrist

### 2.9 QR-/EAN-Scan (kontextabhängig)
- Kamera-Viewfinder-Overlay mit Scan-Rahmen, dazu **immer** ein manuelles Eingabefeld
- Erst scannen, dann werden **nur die möglichen Vorgänge** angeboten:
  - Spiel in einer Einheit → Ausleihen / Umlagern / Prüfen
  - eigenes ausgeliehenes Spiel → Zurückgeben / Weitergeben
  - Spiel bei anderer Person → "Ich habe es erhalten" / "Ich nehme es zur Rückgabe an"
  - Einheiten-QR → Inhalt anzeigen, Spiel einlagern, Einheit umlagern
  - unbekannter Code → "nicht im Bestand", bei `games:manage` mit Anlage-Link (EAN vorbefüllt)
  - mehrere EAN-Treffer → Auswahlliste (die EAN kennzeichnet das Produkt, nicht das Spiel)
- **Serienmodi** für Reihenarbeit: "Einlagern in \<Einheit\>" und "Prüfen" halten das Ziel für Folgescans fest
- Fehler-Zustände: "Kein Kamerazugriff", "Kein Code erkannt"

### 2.10 Erklärbär-Verzeichnis
- Liste/Grid: Spiel → zugeordnete Erklärbären mit Erfahrungsstufe (Sterne/Badge), Kontakt-CTA

### 2.11 Event-Helferplan — Übersicht
- Event-Auswahl, darunter Schichtplan-Tabelle (Zeit × Schicht-Typ: Theke/Kasse/Leihe)
- Eigene Zusagen hervorgehoben, Status-Badges "Bestätigt"/"Vorläufig"
- Button "In Schicht eintragen" je freiem Slot
- Eigener Abschnitt "Ich bin heute als Erklärbär da": Anwesenheits-Toggle für das ausgewählte Event, sichtbar für Meeples mit mindestens einem Erklärbär-Profileintrag — kein Schicht-Slot, siehe 2.10

### 2.12 Ersatzteillager
- Grid "Ausschlacht"-Spiele/Teile (`boardGameId: null` = "Allgemeines", kein Dummy-`BoardGame`-Datensatz), Zustand, Kurzbeschreibung
- Abhol-Hinweis (Verwahrer-Anzeigename)
- Anlage eigenständig oder per Checkbox aus der Deinventarisierung, Verwaltung durch `games:manage`

### 2.13 Kleinanzeigen-Marktplatz
- Grid Verkaufsartikel: Bild(er), Titel, Zustand, Preis, Verkäufer
- Filter (Preis, Zustand)
- Detailseite mit Bildergalerie, Beschreibung, Direktkontakt-Button (Mail/Telegram)
- CTA "Anzeige inserieren" → Formular (Bilder-Upload, Titel, Zustand, Preis, Beschreibung), eigene Anzeigen bearbeitbar/löschbar

---

## 3. Admin-Bereich

### 3.1 Admin-Dashboard
- Kennzahlen-Kacheln: aktive Mitglieder, offene Ausleihen, Spiele im Bestand, nicht erfasste Spiele, offene Prüfungen, offene Invitations (kein Überfälligkeits-Widget — es gibt keine Leihfrist)
- Schnellzugriff: Mitglied einladen, Spiel anlegen, Event erstellen

### 3.2 Mitgliederverwaltung
- Tabelle aller Meeples (Name, Status, Beitrittsdatum, Austrittsdatum)
- Aktion "Neues Mitglied anlegen" → löst Invitation-Flow aus (siehe flow.md #2)
- Invitation-Liste mit Status (offen/verwendet/abgelaufen) + Aktion "Widerrufen"

### 3.3 Blog-/Termin-Redaktion (Moderator)
- Editor (Rich Text, Titelbild-Upload, Veröffentlichungsdatum)
- Checkbox "Auch auf Instagram teilen" + Status-Anzeige (Warteschlange/Erfolgreich/Fehlgeschlagen, Retry-Button)
- Termin-Formular getrennt oder kombiniert (Titel, Zeit, Ort, öffentlich/intern-Toggle)

### 3.4 Spielebestand-Verwaltung
- Tabelle aller `BoardGame`-Einträge (ein Datensatz je physischem Spiel) mit Standort-Kette, Zustand, letzter Prüfung und Prüf-Flag; Aktion "Neues Spiel via BGG-ID importieren" (zeigt Vorschau: Cover, Metadaten vor Bestätigung)
- EAN-Feld mit Prüfsummen-Validierung; mehrfach vergebene EAN ist erlaubt und erzeugt nur einen Hinweis
- Filter "ungeprüft", "Mangel", "nicht erfasst"; deinventarisierte Spiele standardmäßig ausgefiltert, per Umschalter einblendbar
- Deinventarisierungs-Dialog: Grund angeben, Bestätigung mit Hinweis "Aufenthalts-Historie und Standort bleiben erhalten"

### 3.4a Aufbewahrungseinheiten-Verwaltung
- Tabelle aller Kartons und Regale (Code, Art, Label, Standort-Kette, Verwahrer, Anzahl Spiele)
- Detailansicht: Inhalt, Bewegungshistorie (`StorageUnitMove`), Aktionen (bearbeiten, Eltern-Einheit setzen, stilllegen — nur wenn leer)
- **Etiketten-Druckansicht**: QR-Raster für Einheiten, QR-Inhalt ist der reine Code (`OM-BOX-0001`, `OM-SHELF-C4`) — domainunabhängig und offline lesbar
- Rückholliste "Bestände bei ausgetretenen Mitgliedern"

### 3.5 Vollständigkeitsprüfung (Prüfbogen)
- Scan-Serienmodus "Prüfen": Spiel scannen → Zustand bestätigen oder Mangel melden (Notiz ist Pflicht)
- Bestätigung setzt `lastCheckedAt` und löscht das Prüf-Flag; ein Mangel setzt den Bestandsstatus auf `MAINTENANCE`
- Zustand bestätigen und Mangel melden darf **jedes** Mitglied; Mängel schließen erfordert `games:manage`
- Prüfbedürftige Spiele bleiben ausleihbar

### 3.6 Event- & Schichtplanung (Admin)
- Event anlegen/bearbeiten
- Schicht-Editor: Schicht-Typen (Theke/Kasse/Leihe) mit Zeitfenstern und Kapazität anlegen
- Übersicht Füllstand je Schicht (besetzt/frei/vorläufig)

### 3.7 Bring & Buy Flohmarkt — Kassenansicht
- Such-/Scanleiste für Artikel
- Artikelliste mit Status-Toggle (FOR_SALE → RESERVED → SOLD)
- CSV-Massenimport-Dialog (Datei-Upload, Vorschau-Tabelle vor Bestätigung)

### 3.8 Mobiler Gäste-Modus (Event vor Ort)
- Reduzierte, touch-optimierte Ansicht für Tablet/Smartphone am Eingang
- QR-Scan → sofortige Spielinfo-Karte (Cover, Kurzregeln, YouTube-Erklärvideo-Link, anwesende Erklärbären)
- Filterbare "Was ist gerade frei?"-Liste nach Spieleranzahl

---

## Priorisierung nach Roadmap (für Mockup-Reihenfolge)

Gemäß [roadmap.md](roadmap.md) zuerst mocken:

1. **Phase 1:** 1.1–1.3, 1.6, 1.7 (Public, Mock-Daten)
2. **Phase 2–3:** 1.4, 1.5, 1.8, 3.3 (Auth, Content, Instagram)
3. **Phase 4:** 3.4 (Basis-Ludothek, BGG-Import, Deinventarisierung)
4. **Phase 5:** 2.1–2.10, 3.2 (Mitgliederbereich, Scan, LFG)
5. **Phase 6:** 2.11, 3.5, 3.6, 3.7, 3.8 (Events, Helferplan, Flohmarkt)
6. **Phase 7:** 2.12, 2.13 (Ersatzteillager, Kleinanzeigen, Nice-to-Haves)
