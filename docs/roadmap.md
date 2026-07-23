# 🗺️ Projekt-Roadmap: Oecher Meeples Vereinsportal

Diese Roadmap dokumentiert die strategischen Phasen, Meilensteine und Detailziele für die Entwicklung unseres Webportals. Sie dient als Grundlage für die Erstellung von GitHub Issues und Meilensteinen.

---

## 📅 Übersicht der Phasen

---

## 🛠️ Phase 0: Technologieauswahl, Architektur & Setup
*Ziel: Festlegung des finalen Tech-Stacks, Klärung der Repository-Struktur und Bereitstellung des Fundaments.*

* [x] **Meilenstein 0.1: Technologie-Evaluierung & Architektur-Entscheidung**
    * [x] **Architektur-Struktur:** Fullstack-Monolith mit **Next.js 15** (App Router). Kein getrenntes Frontend/Backend.
    * [x] **Sprache & Framework:** **TypeScript** + **Next.js 15** (App Router), Package Manager **pnpm**, Node.js **v22 LTS**.
    * [x] **Datenbank & ORM:** **PostgreSQL** via **Neon** (serverless), ORM: **Prisma**.
    * [x] **UI & Styling:** **Tailwind CSS v4** + **shadcn/ui**.
    * [x] **Hosting & Deployment:** App → **Vercel**, Datenbank → **Neon**, Assets → **Vercel Blob**.
* **[ ] Meilenstein 0.2: Infrastruktur-Vorbereitung**
    * [ ] Initialisierung des/der GitHub-Repositories mit passender `.gitignore` und Lizenz.
    * [ ] Einrichtung von Branch-Protection-Rules (z. B. `main` geschützt, Änderungen nur via Pull Request).
    * [ ] Konfiguration von grundlegenden Tooling-Standards (Prettier, ESLint).

---

## 📌 Phase 1: Die Demo-Webseite (Public Area - Readonly)
*Ziel: Schnelle Bereitstellung eines visuellen Prototyps für die Öffentlichkeit mit Mock-Daten.*

* **[ ] Meilenstein 1.1: Konzept & Datenstruktur-Mocking**
    * [ ] Definition der benötigten Felder für die Demo-Inhalte (Blog-Beiträge, statische Seiten).
    * [ ] Erstellung einer lokalen JSON-Datei (`demo-posts.json`) für anstehende und vergangene Blog-Beiträge.
* **[ ] Meilenstein 1.2: Projekt-Setup & Layout**
    * [ ] Initialisierung des gewählten Frameworks basierend auf der Phase-0-Entscheidung.
    * [ ] Erstellung des Grunddesigns (Tailwind CSS) im Look & Feel der Oecher Meeples.
    * [ ] Bereitstellung der Pflichtseiten (Satzung, Datenschutzverordnung, Impressum).
    * [ ] Einrichtung eines Download-Bereichs für die PDF-Mitgliedsanträge.
    * [ ] Implementierung der Blog-Übersicht und Detailseiten basierend auf den Demodaten.

---

## 🔓 Phase 2: Funktionale Webseite (Public Area & Admin-Einstieg)
*Ziel: Anbindung der Datenbank, Live-Inhalte, Google-SSO und Spendenmöglichkeit.*

* **[ ] Meilenstein 2.1: Konzeption Datenbank & Auth-Flow**
    * [ ] Planung der Prisma-Datenbank-Erweiterung für das Blog-System (Beitragstabellen, Autorenverknüpfung).
    * [ ] Architektur-Planung des Authentifizierungs-Flows (Kombination aus klassischem Login und Google Single Sign-On via Auth.js/NextAuth).
* **[ ] Meilenstein 2.2: Datenbank-Fundament & Authentifizierung (Umsetzung)**
    * [ ] Einbindung des Prisma-Schemas und Durchführung der ersten Migration auf die Live-Datenbank.
    * [ ] Implementierung des sicheren Logins inklusive **Google Single Sign-On (SSO)** für Moderatoren und Admins.
* **[ ] Meilenstein 2.3: Dynamischer Content & Spenden**
    * [ ] Anbindung des öffentlichen Google Calendars zur automatischen Synchronisation von Vereinsterminen.
    * [ ] Entwicklung eines einfachen Web-Editors für Moderatoren, um Blog-Beiträge live auf der Seite zu veröffentlichen.
    * [ ] Integration einer Spendenmöglichkeit für Gäste/Unterstützer im öffentlichen Bereich (z.B. PayPal-Spendenbutton oder strukturierte Support-Info).

---

## 📸 Phase 3: Instagram-Anbindung
*Ziel: Zeitersparnis bei der Öffentlichkeitsarbeit durch automatisiertes Cross-Posting.*

* **[ ] Meilenstein 3.1: Konzeption API & Queue-Design**
    * [ ] Analyse der Meta Graph API (Instagram) Anforderungen bezüglich Token-Laufzeiten und Berechtigungen.
    * [ ] Konzeption einer Hintergrund-Warteschlange (Queue), damit Webseiten-Ladezeiten nicht von der Instagram-API blockiert werden.
* **[ ] Meilenstein 3.2: Instagram Integration & Moderations-Erweiterung (Umsetzung)**
    * [ ] Einrichten des OAuth-Verfahrens für den Vereins-Instagram-Account im Backend.
    * [ ] Implementierung der Queue zum sicheren Übermitteln von Bildern und Texten.
    * [ ] Integration einer Checkbox im Blog-Editor: "Auch auf Instagram teilen" inkl. Status-Anzeige (Erfolgreich gepostet / Fehlgeschlagen).

---

## 🎲 Phase 4: Die Basis-Ludothek & Deinventarisierung (Admin-Sicht)
*Ziel: Digitale Erfassung des Spielebestands, BGG-Import und Lösch-Schutz.*

* **[ ] Meilenstein 4.1: Konzeption Ludothek & Archivierungs-Logik**
    * [ ] Validierung des `BoardGame`-Prisma-Modells: Wie bilden wir Zustände und Standorte sauber ab?
    * [ ] **Konzept Deinventarisierung:** Planung einer Archivierungs-Logik (z.B. neuer Status `DEINVENTARISED` oder Feld `archivedAt`), damit Spiele bei Verkauf/Verlust/Zerstörung nicht hart gelöscht werden müssen (Schutz der `Borrow`-Historie) und ein Grund hinterlegt werden kann.
* **[ ] Meilenstein 4.2: Spiele-Erfassung & Deinventarisierung (Umsetzung)**
    * [ ] Aktivierung und Migration der `BoardGame`-Tabellen im Prisma-Schema.
    * [ ] Erstellung einer Eingabemaske für Admins zur manuellen Anlage sowie zur Deinventarisierung von Spielen (inkl. Angabe des Grundes).
* **[ ] Meilenstein 4.3: BoardGameGeek (BGG) API-Sync**
    * [ ] Implementierung des API-Importeurs: Nach Eingabe einer BGG-ID werden Spieldaten (Spieleranzahl, Spieldauer, Kategorien, Coverbild) automatisch geladen und gespeichert.

---

## 📱 Phase 5: Spiele-Verwaltung, Mitglieder-Bereich, Scan & Community
*Ziel: Interner Bereich für Mitglieder, physischer Verleih, interne News, Kalender und Spielergesuche.*

* **[ ] Meilenstein 5.1: Konzeption Mitglieder-Features & QR-Infrastruktur**
    * [ ] Datenbank-Planung für das **Spielergesuche-Modul** (Wer sucht Mitspieler für welches Spiel/wann?).
    * [ ] Konzeption der QR-Code-Generierung für Spiele und der Kamera-Scan-Schnittstelle im Browser.
    * [ ] Planung des Datenflusses für interne News und den internen Google-Kalender.
* **[ ] Meilenstein 5.2: Mitglieder-Einstieg, Interne News & Kalender (Umsetzung)**
    * [ ] Erweiterung des Google-SSO/Logins für reguläre Vereinsmitglieder (Meeples).
    * [ ] Self-Service-Bereich zur sicheren Änderung der eigenen Bankdaten (DSGVO-konforme Verschlüsselung).
    * [ ] **Interne Newsroom-Seite:** Ein geschützter News-Feed, der nur für eingeloggte Mitglieder sichtbar ist.
    * [ ] **Vereinsinterner Google Kalender:** Integration eines zweiten, internen Kalenders für vereinsinterne Veranstaltungen (z.B. Jahreshauptversammlung, Helfertreffen).
* **[ ] Meilenstein 5.3: Intelligente Spielsuche & Spielergesuche**
    * [ ] Bereitstellung der Spiele-Suche für Mitglieder mit Filtern (Dauer, Komplexität, Mechaniken).
    * [ ] **Spielergesuche-Modul:** Mitglieder können Gesuche inserieren ("Suche 3 Leute für Twilight Imperium am Samstag") und andere können sich per Klick anmelden.
* **[ ] Meilenstein 5.4: Scan-Infrastruktur & Verleih**
    * [ ] Entwicklung einer Admin-Funktion zur Generierung und zum Ausdruck von QR-Code-Etiketten für Spiele.
    * [ ] Integration einer Smartphone-Kamera-Scanfunktion im Browser (für EAN-Barcodes und Vereins-QR-Codes).
    * [ ] Implementierung der transaktionssicheres Ausleih- und Rückgabelogik (Verknüpfung der `Borrow`-Historie).
    * [ ] Digitaler Prüfbogen für die Inventur (Zustandserfassung, Mängelmeldung).

---

## 📅 Phase 6: Event-Betrieb & Bring & Buy Flohmarkt
*Ziel: IT-Unterstützung für Spieletage, Großveranstaltungen und den internen Flohmarkt.*

* **[ ] Meilenstein 6.1: Konzeption Event-Strukturen & Flohmarkt-Datenmodell**
    * [ ] Prisma-Datenmodellierung für das Bring & Buy Flohmarkt-Modul (Isolierte Tabellen für Artikel, Preise, Status und Verkäufer-Zuordnung).
    * [ ] Ablauf-Planung für den mobilen Gäste-Modus vor Ort auf Großevents.
* **[ ] Meilenstein 6.2: Helferplan & Erklärbären (Umsetzung)**
    * [ ] Möglichkeit für Mitglieder, sich bei Spielen als "Erklärbär" (inkl. Erfahrungsstufe) einzutragen.
    * [ ] Dashboard für Admins zur Erstellung von Event-Schichten (Theke, Kasse, Spieleleihe).
    * [ ] Buchungssystem: Mitglieder tragen sich selbstständig in Schichten ein (inkl. Kennzeichnung für "unsichere Zusage").
* **[ ] Meilenstein 6.3: Mobiler Public Event-Bereich (Gäste-Modus vor Ort)**
    * [ ] Optimierte Ansicht für Event-Besucher: Scannen eines Spiele-QR-Codes zeigt sofort die Spielinfos, verlinkt Erklärvideos (YouTube) und listet anwesende Vereins-Erklärbären auf.
    * [ ] Filterbare Spieleliste für Event-Gäste ("Welche Absacker für 4 Personen sind gerade im Raum verfügbar?").
* **[ ] Meilenstein 6.4: Bring & Buy Flohmarkt-Modul**
    * [ ] Formular für Mitglieder, um eigene Flohmarkt-Artikel anzulegen (manuell oder via Excel-Massenimport).
    * [ ] Bereitstellung einer zentralen Listen- und Kassenansicht für den Verkaufstag (Wer verkauft was zu welchem Preis?).

---

## 🚀 Phase 7: Nice-to-Haves, Community-Marktplatz & Feinschliff
*Ziel: Komfort-Features, Community-Schnittstellen, Ersatzteillager, fortlaufende Kleinanzeigen und Statistiken.*

* **[ ] Meilenstein 7.1: Konzeption Marktplatz & Ersatzteillager**
    * [ ] **Konzept Ersatzteillager:** Definition der Datenbankstruktur für freigegebene Ersatzteil-Spiele. Wie mappen wir Teile ohne festes Spiel (Zuweisung zu einer Dummy-Spiele-ID für "Allgemeines")?
    * [ ] **Konzept Interner Flohmarkt (Kleinanzeigen):** Datenmodellierung für ganzjährigen C2C-Handel (Bilder-Array, Freitext, Preis, Verknüpfung zum Verkäuferprofil für Direktkontakt via Telegram/Mail).
* **[ ] Meilenstein 7.2: Ersatzteillager & Kleinanzeigen (Umsetzung)**
    * [ ] **Das „Ausschlacht“-Lager:** Ansicht für Mitglieder, welche kaputten/gespendeten Spiele oder Allgemeinteile ("Allgemeines") aktuell zum Ausschlachten im Vereinsheim bereitliegen.
    * [ ] **Interner Flohmarkt (Kleinanzeigen):** Erstellung des digitalen schwarzen Bretts. Mitglieder können unkompliziert Spiele mit Bild, Preis und Text inserieren und Käufer sehen die bevorzugte Kontaktmethode.
* **[ ] Meilenstein 7.3: Erweiterte Community-Profile & Synchronisation**
    * [ ] Felder für externe Kontaktdaten im Profil (Board Game Arena, BGG, Telegram, Signal, Discord).
    * [ ] Optionale BGG-Sammlungs-Synchronisation für Mitglieder.
* **[ ] Meilenstein 7.4: Erweiterte Suche & Auswertung**
    * [ ] Crowdsourced Ludothek: Bei der Spielsuche optional auch Spiele anzeigen, die sich im Privatbesitz von Mitgliedern befinden und mitgebracht werden könnten.
    * [ ] Statistiken-Dashboard: Anonymisierte Auswertungen über die beliebtesten Spiele und aktivsten Verleihtage.