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
    * [x] Initialisierung des/der GitHub-Repositories mit passender `.gitignore` und Lizenz.
    * [ ] Einrichtung von Branch-Protection-Rules (`main` geschützt, Änderungen nur via Pull Request). Zurückgestellt: benötigt Admin-Rechte auf dem Repo (aktuell nur „write“). Vorbereitetes Ruleset liegt unter [`.github/ruleset-protect-main.json`](../.github/ruleset-protect-main.json), anwendbar via `gh api repos/App-Akademie-Students/rapid-extendable-prototyping-v1-0-JHerwig/rulesets -X POST --input .github/ruleset-protect-main.json`.
    * [x] Konfiguration von grundlegenden Tooling-Standards (Prettier, ESLint, EditorConfig).

---

## 📌 Phase 1: Die Demo-Webseite (Public Area - Readonly)
*Ziel: Schnelle Bereitstellung eines visuellen Prototyps für die Öffentlichkeit mit Mock-Daten.*

* [x] **Meilenstein 1.1: Konzept & Datenstruktur-Mocking**
    * [x] Definition der benötigten Felder für die Demo-Inhalte (Blog-Beiträge, statische Seiten).
    * [x] Erstellung lokaler Demo-Blogbeiträge im **Markdown-Format** (statt einer reinen JSON-Datei): Redakteur:innen verfassen Beiträge auch im späteren Live-Editor (Meilenstein 2.3) in Markdown, daher soll die Demo-Datenstruktur von Anfang an dieselbe Form haben. Metadaten (Titel, Slug, Datum, Typ, Autor) bleiben strukturiert, nur der Beitragstext wird als Markdown gespeichert und über eine Markdown-Rendering-Bibliothek (z. B. `react-markdown`) ausgegeben.
* [x] **Meilenstein 1.2: Projekt-Setup & Layout**
    * [x] Initialisierung des gewählten Frameworks basierend auf der Phase-0-Entscheidung.
    * [x] Erstellung des Grunddesigns (Tailwind CSS) im Look & Feel der Oecher Meeples.
    * [x] Bereitstellung der Pflichtseiten (Satzung, Datenschutzverordnung, Impressum).
    * [x] Einrichtung eines Download-Bereichs für die PDF-Mitgliedsanträge.
    * [x] Implementierung der Blog-Übersicht und Detailseiten basierend auf den Demodaten.

---

## 🔓 Phase 2: Funktionale Webseite (Public Area & Admin-Einstieg)
*Ziel: Anbindung der Datenbank, Live-Inhalte, Google-SSO und Spendenmöglichkeit.*

* [x] **Meilenstein 2.1: Konzeption Datenbank & Auth-Flow**
    * [x] Planung der Prisma-Datenbank-Erweiterung für das Blog-System (Beitragstabellen, Autorenverknüpfung).
    * [x] Architektur-Planung des Authentifizierungs-Flows — umgesetzt als **Neon Auth (Stack Auth)** statt Auth.js/NextAuth (siehe `.claude/plans/phase-2-execution-plan.md`, Annahme „Auth-Architektur"); Google SSO dabei bewusst zurückgestellt.
* **[ ] Meilenstein 2.2: Datenbank-Fundament & Authentifizierung (Umsetzung)**
    * [x] Einbindung des Prisma-Schemas und Durchführung der ersten Migration auf die Live-Datenbank.
    * [ ] Implementierung des sicheren Logins inklusive **Google Single Sign-On (SSO)** für Moderatoren und Admins. Login/Registrierung via Neon Auth + einladungsbasiertem Invite-Flow ist umgesetzt; Google SSO selbst ist laut Plan explizit zurückgestellt (offen).
* **[ ] Meilenstein 2.3: Dynamischer Content & Spenden**
    * [x] Anbindung des Kalenders zur automatischen Synchronisation von Vereinsterminen — umgesetzt über den **öffentlichen ICS-Feed** statt der Google Calendar API (siehe Plan-Annahme „Kalender-Sync").
    * [x] Entwicklung eines einfachen Web-Editors (Markdown) für Moderatoren, um Blog-Beiträge live auf der Seite zu veröffentlichen.
    * [ ] Integration einer Spendenmöglichkeit für Gäste/Unterstützer im öffentlichen Bereich (z.B. PayPal-Spendenbutton oder strukturierte Support-Info). Laut Plan explizit aus Phase 2 herausgenommen (offen).

---

## 📸 Phase 3: Instagram-Anbindung
*Ziel: Zeitersparnis bei der Öffentlichkeitsarbeit durch automatisiertes Cross-Posting.*

* [x] **Meilenstein 3.1: Konzeption API & Queue-Design**
    * [x] Analyse der Meta Graph API (Instagram) Anforderungen bezüglich Token-Laufzeiten und Berechtigungen — umgesetzt in `src/lib/instagram/graph-client.ts` (OAuth-Code-Exchange, Long-Lived-Token, Token-Refresh, Media-Container, Publish).
    * [x] Konzeption einer Hintergrund-Warteschlange (Queue), damit Webseiten-Ladezeiten nicht von der Instagram-API blockiert werden — umgesetzt als **DB-Spalten-Queue** (`InstagramStatus`-Enum auf `Post`) statt externem Queue-Dienst, verarbeitet durch einen täglichen **Vercel-Cron-Job** (siehe Plan `.claude/plans/phase-3-instagram-execution-plan.md`, Annahme „Queue-Technologie").
* [x] **Meilenstein 3.2: Instagram Integration & Moderations-Erweiterung (Umsetzung)**
    * [x] Einrichten des OAuth-Verfahrens für den Vereins-Instagram-Account im Backend — Admin-Connect-Flow unter `/admin/einstellungen/instagram`, gegated über neue Permission `instagram:connect`.
    * [x] Implementierung der Queue zum sicheren Übermitteln von Bildern und Texten — `src/lib/instagram/queue.ts` inkl. Cover-Bild-Fallback (`@vercel/og` + `@vercel/blob`), Retry-Zähler und täglichem Token-Refresh.
    * [x] Integration einer Checkbox im Blog-Editor: "Auch auf Instagram teilen" inkl. Status-Anzeige (Erfolgreich gepostet / Fehlgeschlagen) — inkl. manuellem "Erneut versuchen"-Button bei `FAILED`.
    * Feature ist vollständig implementiert und getestet, aber ohne echte Meta-App-Zugangsdaten inaktiv — externe Vorbedingungen (Instagram-Business-Account, Meta-App, App-Review, Env-Variablen) siehe [`docs/instagram-setup.md`](./instagram-setup.md).

---

## 🎲 Phase 4: Die Basis-Ludothek & Deinventarisierung (Admin-Sicht)
*Ziel: Digitale Erfassung des Spielebestands, BGG-Import und Lösch-Schutz.*

* **[x] Meilenstein 4.1: Konzeption Ludothek & Archivierungs-Logik**
    * [x] Validierung des `BoardGame`-Prisma-Modells: Wie bilden wir Zustände und Standorte sauber ab?
    * [x] **Konzept Deinventarisierung:** Planung einer Archivierungs-Logik (z.B. neuer Status `DEINVENTARISED` oder Feld `archivedAt`), damit Spiele bei Verkauf/Verlust/Zerstörung nicht hart gelöscht werden müssen (Schutz der `Borrow`-Historie) und ein Grund hinterlegt werden kann.
* **[x] Meilenstein 4.2: Spiele-Erfassung & Deinventarisierung (Umsetzung)**
    * [x] Aktivierung und Migration der `BoardGame`-Tabellen im Prisma-Schema.
    * [x] Erstellung einer Eingabemaske für Admins zur manuellen Anlage sowie zur Deinventarisierung von Spielen (inkl. Angabe des Grundes).
* **[x] Meilenstein 4.3: BoardGameGeek (BGG) API-Sync**
    * [x] Implementierung des API-Importeurs: Nach Eingabe einer BGG-ID werden Spieldaten (Spieleranzahl, Spieldauer, Kategorien, Coverbild) automatisch geladen und gespeichert.

---

## 📱 Phase 5: Spiele-Verwaltung, Mitglieder-Bereich, Scan & Community
*Ziel: Interner Bereich für Mitglieder, physischer Verleih, interne News, Kalender und Spielergesuche.*

* [x] **Meilenstein 5.1: Konzeption Mitglieder-Features & QR-Infrastruktur**
    * [x] Datenbank-Planung für das **Spielergesuche-Modul** (Wer sucht Mitspieler für welches Spiel/wann?) — siehe `CONTEXT.md` und `docs/adr/0001`–`0003`.
    * [x] Konzeption der QR-Code-Generierung für Spiele und der Kamera-Scan-Schnittstelle im Browser — Standort-Modell mit Aufbewahrungseinheiten statt Spiele-QR (siehe ADR 0001); Spiele-QR-Duplikatfall bewusst zurückgestellt (offen, siehe unten).
    * [x] Planung des Datenflusses für interne News und den internen Google-Kalender.
* [x] **Meilenstein 5.2: Mitglieder-Einstieg, Interne News & Kalender (Umsetzung)**
    * [ ] Erweiterung des Google-SSO/Logins für reguläre Vereinsmitglieder (Meeples). Mitglieder-Onboarding (Einladungs-Flow, Meeple entsteht beim ersten Login, Mitgliedschafts-Lebenszyklus) ist umgesetzt; Google SSO selbst bleibt wie in Phase 2 zurückgestellt (offen).
    * [x] Self-Service-Bereich zur sicheren Änderung der eigenen Bankdaten (DSGVO-konforme Verschlüsselung) — AES-256-GCM, Leseweg nur für die Rolle `kassenwart` mit Zugriffsprotokoll (siehe ADR 0003).
    * [x] **Interne Newsroom-Seite:** Ein geschützter News-Feed, der nur für eingeloggte Mitglieder sichtbar ist.
    * [x] **Vereinsinterner Kalender:** Zweiter ICS-Feed (`ICS_FEED_URL_INTERNAL`) statt Google-Calendar-API, zeigt öffentliche und interne Termine zusammen (siehe Plan-Annahme „Kalender-Sync" aus Phase 2).
* [x] **Meilenstein 5.3: Intelligente Spielsuche & Spielergesuche**
    * [x] Bereitstellung der Spiele-Suche für Mitglieder mit Filtern (Dauer, Komplexität, Mechaniken) — zwei Projektionen (öffentlich/intern) einer Komponente, alle Filter über `searchParams`.
    * [x] **Spielergesuche-Modul:** Mitglieder können Gesuche inserieren und andere sich per Klick anmelden.
* [x] **Meilenstein 5.4: Scan-Infrastruktur & Verleih**
    * [x] Entwicklung einer Admin-Funktion zur Generierung und zum Ausdruck von QR-Code-Etiketten — für Aufbewahrungseinheiten (Kartons/Regale) statt einzelner Spiele (siehe ADR 0001).
    * [x] Integration einer Smartphone-Kamera-Scanfunktion im Browser (`@zxing/browser`, EAN-Barcodes und Einheiten-QR-Codes).
    * [x] Implementierung der transaktionssicheren Ausleih- und Rückgabelogik — Aufenthalte (`GameHolding`) statt einer `Borrow`-Historie (siehe ADR 0001).
    * [x] Digitaler Prüfbogen für die Inventur (Zustandserfassung, Mängelmeldung).

Bewusst zurückgestellt bzw. nicht Teil von Phase 5 (siehe `.claude/plans/phase-5-mitglieder-scan-execution-plan.md`):
- Google SSO (Meilenstein 5.2, s. o.).
- Spiele-eigene QR-Codes für den Duplikatfall (mehrere Spiele desselben Titels unterscheidbar auch ohne Standort) — Standort-Kette reicht für Phase 5, ein zusätzlicher Vereins-QR pro Spiel wäre eine spätere Ergänzung.
- Event-Zuordnung von Regalen ("Spiel beim Event") — Phase 6.
- Ersatzteillager-Ansicht für deinventarisierte Spiele — Phase 7.

---

## 📅 Phase 6: Event-Betrieb & Bring & Buy Flohmarkt
*Ziel: IT-Unterstützung für Spieletage, Großveranstaltungen und den internen Flohmarkt.*

* **[x] Meilenstein 6.1: Konzeption Event-Strukturen & Flohmarkt-Datenmodell**
    * [x] Prisma-Datenmodellierung für das Bring & Buy Flohmarkt-Modul (Isolierte Tabellen für Artikel, Preise, Status und Verkäufer-Zuordnung).
    * [x] Ablauf-Planung für den mobilen Gäste-Modus vor Ort auf Großevents.
* **[x] Meilenstein 6.2: Helferplan & Erklärbären (Umsetzung)**
    * [x] Möglichkeit für Mitglieder, sich bei Spielen als "Erklärbär" (inkl. Erfahrungsstufe) einzutragen.
    * [x] Dashboard für Admins zur Erstellung von Event-Schichten (Theke, Kasse, Spieleleihe).
    * [x] Buchungssystem: Mitglieder tragen sich selbstständig in Schichten ein (inkl. Kennzeichnung für "unsichere Zusage").
* **[x] Meilenstein 6.3: Mobiler Public Event-Bereich (Gäste-Modus vor Ort)**
    * [x] Optimierte Ansicht für Event-Besucher: Scannen des EAN-Barcodes zeigt sofort die Spielinfos, verlinkt Erklärvideos (YouTube) und listet anwesende Vereins-Erklärbären auf (EAN statt spiel-eigenem QR-Code, siehe ADR 0005).
    * [x] Filterbare Spieleliste für Event-Gäste ("Welche Absacker für 4 Personen sind gerade im Raum verfügbar?").
* **[x] Meilenstein 6.4: Bring & Buy Flohmarkt-Modul**
    * [x] Formular für Mitglieder, um eigene Flohmarkt-Artikel anzulegen (manuell oder via CSV-Massenimport).
    * [x] Bereitstellung einer zentralen Listen- und Kassenansicht für den Verkaufstag (Wer verkauft was zu welchem Preis?).

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