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

### 2.7 Ludothek — Spielsuche
- Suchleiste + Filter (Spieleranzahl, Spieldauer, Komplexität/Gewichtung, Mechanik, Verfügbarkeit)
- Ergebnis-Grid: Spielkarten (Cover, Titel, Spieleranzahl, Dauer, Verfügbarkeits-Badge: AVAILABLE/BORROWED/MAINTENANCE)

### 2.8 Spiel-Detailseite
- Cover, Metadaten (BGG-Import: Spieleranzahl, Dauer, Gewichtung), Beschreibung
- Liste der Exemplare (`GameCopy`) mit Standort (Vereinslager/Meeple-Name) und Status
- Liste der "Erklärbären" mit Erfahrungsstufe
- Ausleih-Button (falls verfügbar) / Reservierungs-Hinweis

### 2.9 QR-/Barcode-Scanner (Ausleihe/Rückgabe)
- Kamera-Viewfinder-Overlay mit Scan-Rahmen
- Erfolgs-Zustand: erkanntes Spiel + Status-Check (verfügbar? → Ausleihe bestätigen mit Fälligkeitsdatum)
- Fehler-Zustand: "Kein Code erkannt" / "Spiel nicht verfügbar"

### 2.10 Erklärbär-Verzeichnis
- Liste/Grid: Spiel → zugeordnete Erklärbären mit Erfahrungsstufe (Sterne/Badge), Kontakt-CTA

### 2.11 Event-Helferplan — Übersicht
- Event-Auswahl, darunter Schichtplan-Tabelle (Zeit × Rolle: Theke/Kasse/Leihe/Erklärbär)
- Eigene Zusagen hervorgehoben, Status-Badges "Bestätigt"/"Vorläufig"
- Button "In Schicht eintragen" je freiem Slot

### 2.12 Ersatzteillager
- Grid "Ausschlacht"-Spiele/Teile (inkl. Dummy-Eintrag "Allgemeines"), Zustand, Kurzbeschreibung
- Kontakt-/Abhol-Hinweis

### 2.13 Kleinanzeigen-Marktplatz
- Grid Verkaufsartikel: Bild(er), Titel, Zustand, Preis, Verkäufer
- Filter (Preis, Zustand, Spiel)
- Detailseite mit Bildergalerie, Beschreibung, Direktkontakt-Button (Mail/Telegram)
- CTA "Artikel inserieren" → Formular (Bilder-Upload, Titel, Zustand, Preis, Beschreibung)

---

## 3. Admin-Bereich

### 3.1 Admin-Dashboard
- Kennzahlen-Kacheln: aktive Mitglieder, offene Ausleihen, überfällige Rückgaben, offene Invitations
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
- Tabelle aller `BoardGame`-Einträge mit Anzahl Exemplare, Aktion "Neues Spiel via BGG-ID importieren" (zeigt Vorschau: Cover, Metadaten vor Bestätigung)
- Pro Spiel: Exemplare (`GameCopy`) verwalten — hinzufügen, Barcode/QR generieren & drucken, Status ändern
- Deinventarisierungs-Dialog: Grund auswählen (Beschädigung/Verkauf/Verlust), Bestätigung mit Hinweis "Verleih-Historie bleibt erhalten"

### 3.5 Inventur-Prüfbogen
- Listen-/Scan-Modus: Exemplar scannen → Zustand bestätigen/Mangel melden → Status aktualisieren

### 3.6 Event- & Schichtplanung (Admin)
- Event anlegen/bearbeiten
- Schicht-Editor: Rollen-Slots (Theke/Kasse/Leihe/Erklärbär) mit Zeitfenstern anlegen
- Übersicht Füllstand je Schicht (besetzt/frei/vorläufig)

### 3.7 Bring & Buy Flohmarkt — Kassenansicht
- Such-/Scanleiste für Artikel
- Artikelliste mit Status-Toggle (FOR_SALE → RESERVED → SOLD)
- Excel-Massenimport-Dialog (Datei-Upload, Vorschau-Tabelle vor Bestätigung)

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
