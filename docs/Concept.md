# 🎲 Oecher Meeples Vereinswebseite & Ludotheks-Verwaltung

Willkommen im Repository für das Webportal der **Oecher Meeples**. Diese Plattform dient als zentrale Anlaufstelle für Vereinsmitglieder, Spielebegeisterte und Gäste. Sie vereint die Repräsentation des Vereins nach außen mit einer maßgeschneiderten, digitalen Verwaltung unserer umfangreichen Spielebibliothek (Ludothek) und des Vereinslebens im internen Bereich.

---

## 🌟 Das Konzept

Der Brettspielverein wächst – und damit auch die Anforderungen an Organisation, Materialverwaltung, Eventplanung und Öffentlichkeitsarbeit. Dieses System löst die Kernprobleme unseres Vereinsalltags:

1. **Transparenz nach außen & Support-Zentrale:** Einfacher Zugang zu Terminen, News, Vereinssatzung und rechtlichen Dokumenten für Interessierte, kombiniert mit einer integrierten Spendenmöglichkeit zur Unterstützung unserer Vereinsarbeit.
2. **Die digitale & nachhaltige Ludothek:** Ein transparentes System zur Erfassung, zum Verleih und zur Standortverfolgung unserer Gesellschaftsspiele (egal ob im zentralen Vereinslager oder privat bei einem "Meeple"). Verlässt ein Spiel den Bestand wegen Beschädigung oder Verkauf, wird es konsequent *deinventarisiert* statt gelöscht, um unsere Verleih-Historie zu schützen.
3. **Mitmach-Kultur & lebendige Community:** Ein digitaler Helferplan für Großveranstaltungen, ein geschützter Newsroom für interne Ankündigungen, vereinsinterne Kalender sowie Plattformen zum Wissensaustausch (wer kann welches Spiel erklären?). Zudem stärken spielunabhängige *Spielergesuche* das spontane Zusammenkommen unserer Mitglieder.
4. **Effiziente Social-Media-Pflege:** Beiträge müssen nur noch einmal auf der vereinseigenen Webseite verfasst werden und können über eine automatisierte Warteschlange direkt auf externe Kanäle (wie Instagram) gestreut werden.
5. **Ressourcen-Sharing & Community-Handel:** * *Ersatzteillager:* Unvollständige oder beschädigte Spiele werden nicht weggeworfen, sondern zum "Ausschlachten" freigegeben. Universelle Komponenten fließen in das virtuelle Spiel "Allgemeines", um anderen Spielen im Verein das Leben zu retten.
    * *Der doppelte Flohmarkt:* Ein hochfunktionales *Bring & Buy* System mit Excel-Massenimport zur Abwicklung von Großevents, ergänzt durch einen ganzjährigen, internen *Kleinanzeigen-Marktplatz* für den unkomplizierten C2C-Handel zwischen Mitgliedern.

---

## 🗺️ Funktionsübersicht nach Bereichen

### 🔓 Öffentlicher Bereich (Public Area)
Der öffentliche Bereich richtet sich an die breite Öffentlichkeit, potenzielle Neumitglieder und befreundete Spielerinnen und Spieler.

* **Termine & Blog (Newsroom):** Übersicht anstehender und vergangener Veranstaltungen, Spieleabende und Turniere. Moderatoren können Beiträge verfassen, die automatisch an den Instagram-Kanal des Vereins weitergeleitet werden.
* **Google Calendar Sync:** Automatische, visuelle Synchronisation unseres öffentlichen Vereinskalenders.
* **Support & Spenden:** Eine direkte, strukturierte Möglichkeit für Gäste und Förderer, den Verein finanziell zu unterstützen (z. B. via PayPal-Anbindung).
* **Download-Bereich:** Direkter Zugriff auf Mitgliedsanträge und Formulare.
* **Rechtliches & Formales:** Schneller Zugriff auf Vereinssatzung, Datenschutzverordnung (DSGVO) und das Impressum.

### 🔐 Mitgliederbereich (Members Area)
Der geschützte Bereich steht exklusiv aktiven Vereinsmitgliedern nach einem sicheren Login oder komfortablen **Google Single Sign-On (SSO)** zur Verfügung.

* **Interner Newsroom & Kalender:** Ein exklusiver Feed für interne Vereinsmitteilungen und ein separater, interner Kalender für vereinsinterne Termine (z. B. Jahreshauptversammlungen oder Helfertreffen).
* **Mein Profil:** Self-Service-Bereich zur sicheren, DSGVO-konformen Verwaltung der eigenen Bankdaten sowie Verknüpfung mit externen Plattformen (*Board Game Arena* und *BoardGameGeek*).
* **Spielergesuche ("LFG"):** Das vereinsinterne Schwarze Brett für Spielrunden. Mitglieder können Gesuche inserieren ("Suche 3 Leute für Arche Nova am Freitag") und Mitspieler können sich per Klick anmelden.
* **Die Ludothek & Smartphone-Scan (Das Herzstück):**
    * *Spiele finden & leihen:* Durchstöbern des Vereinsbestands mit intelligenten Filtern. Leihen und Rückgaben erfolgen transaktionssicher im System.
    * *Standort-Tausch:* Nachvollziehbarkeit, ob ein Spiel im Vereinslager liegt oder bei welchem "Meeple" es sich privat befindet.
    * *QR- & Barcode-Scanner:* Einbindung der Smartphone-Kamera direkt im Browser, um Vereins-QR-Etiketten oder EAN-Barcodes auf Events und bei der *Inventur* blitzschnell zu scannen.
    * *Erklärbär-Verzeichnis:* Wer ein Spiel neu lernen möchte, findet gezielt den passenden "Erklärbären" im Verein.
* **Event-Organisation & Helferbetrieb:** Ein digitaler Schichtplan für Großveranstaltungen (Einlass, Theke, Spieleausleihe) mit flexiblen Zusage-Status für die Helfer.
* **Ersatzteillager & Kleinanzeigen:** Zugriff auf das Ausschlacht-Lager für Spielekomponenten und den fortlaufenden, mitgliederinternen Brettspiel-Marktplatz (Bilder, Text, Preis, Direktkontakt).

---

## 👥 Rollen im System

Um den administrativen Aufwand gering zu halten, unterscheidet das System konzeptuell zwischen verschiedenen Rollen:

1. **Gäste / Besucher:** Haben rein lesenden Zugriff auf den öffentlichen Bereich.
2. **Mitglieder (Meeples):** Haben Zugriff auf den geschützten Bereich, Spielergesuche, die interne Spielesuche, das Ersatzteillager, die Kleinanzeigen und den Helferplan.
3. **Moderatoren / Content-Ersteller:** Besitzen das Recht, Beiträge und Termine im Blog-System zu erstellen und steuern die automatisierte Weiterleitung an Instagram.
4. **Spiele-Moderatoren / Admins:** Verwalten den Gesamtbestand, koordinieren die Schichtpläne, generieren QR-Etiketten, wickeln Deinventarisierungen ab und steuern den Bring & Buy Flohmarkt.

---
GI
## 🔐 Registrierungs- & Onboarding-Prozess

Die Plattform nutzt ein geschlossenes Registrierungssystem, um sicherzustellen, dass nur echte Vereinsmitglieder Konten erstellen.

* Erstellung: Ein Administrator legt ein neues Vereinsmitglied (Meeple) im Admin-Bereich an.

* Einladung: Das System generiert automatisch eine Invitation mit einem temporär gültigen, einzigartigen Token und sendet einen Einladungslink per E-Mail.

* Registrierung: Der Empfänger folgt dem Link, verifiziert sich und erstellt sein Webseiten-Konto (User). Der Account ist ab Sekunde eins fest mit den Vereinsdaten verknüpft.

* Austritt: Tritt ein Vereinsmitglied aus, wird das Benutzerkonto gelöscht und die Meeple Daten verbleiben Annonym in der Historie.

## 🛠️ Technologie-Fahrplan

Dieses Projekt wird nach einem agilen, konzeptfokussierten MVP-Prinzip entwickelt. Wir bauen zuerst visuelle Prototypen, bevor wir die Datenstrukturen in Code gießen. Vor jeder funktionalen Phase ist eine explizite Planungs- und Konzeptionsphase geschaltet.

Der detaillierte, meilensteinbasierte Entwicklungsablauf (von Phase 0 bis Phase 7) ist in unserer **[ROADMAP.md](./ROADMAP.md)** dokumentiert.