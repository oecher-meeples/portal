# Oecher Meeples Vereinsportal

Vereinsportal eines Brettspielvereins: öffentliche Außendarstellung, interner Mitgliederbereich und die physische Verwaltung der Vereins-Ludothek (Spielebestand, Aufbewahrung, Verleih).

## Language

### Personen

**Meeple**:
Ein Vereinsmitglied mit Portal-Account — 1:1 zum Login-Konto, entsteht beim ersten Login. Ein Vereinsmitglied ohne Portal-Account ist im Portal nicht abbildbar. Einzige Ausnahme ist der anonymisierte Meeple: er hat kein Konto mehr und existiert nur noch, damit die Historie lesbar bleibt.
_Avoid_: User, Mitgliedsprofil, Member (im Code), Nutzer

**Kündigung**:
Der Vermerk, dass ein Meeple austritt. Die Mitgliedschaft läuft bis zum Jahreswechsel unverändert weiter — er darf weiter ausleihen. Ab Dezember wird auf noch bei ihm liegende Spiele hingewiesen.
_Avoid_: Austritt (der Austritt ist erst die Wirkung), Deaktivierung

**Ausgetreten**:
Der Zustand nach dem Jahreswechsel einer Kündigung. Der Zugang beschränkt sich auf das Abwickeln: eigenes Profil, eigene Bestände, Rückgabe und Weitergabe, Kalender und Mitgliederverzeichnis. Ludothek, interne News und Spielergesuche sind gesperrt; annehmen darf er nichts mehr.
_Avoid_: Inaktiv, gesperrt, ehemalig

**Anonymisierung**:
Das Löschen des Login-Kontos samt Namen und Kontaktdaten, sobald ein ausgetretener Meeple keine Vereinsspiele mehr bei sich hat. Der Meeple bleibt als namenloser Rest bestehen, damit Aufenthalte und Gesuche weiter lesbar sind.
_Avoid_: Kontolöschung, DSGVO-Löschung, Pseudonymisierung

**Kassenwart**:
Rolle mit dem alleinigen Recht, gespeicherte Bankdaten zu entschlüsseln. Jeder solche Zugriff wird protokolliert.
_Avoid_: Schatzmeister, Finanzadmin

### Ludothek

**Spiel**:
Ein einzelnes physisches Brettspiel im Vereinsbesitz, zusammen mit seinen Titel-Metadaten. Aktuell besitzt der Verein von jedem Titel genau ein Spiel; mehrere Spiele desselben Titels sind erlaubt und dann nur über ihren Standort unterscheidbar.
_Avoid_: Exemplar, Titel, GameCopy, Kopie

**EAN**:
Der Hersteller-Barcode auf der Spieleschachtel. Er kennzeichnet das **Produkt**, nicht das einzelne Spiel — mehrere Spiele desselben Titels tragen dieselbe EAN, ein Scan kann daher mehrere Treffer liefern.
_Avoid_: Barcode als Exemplar-Schlüssel, Inventarnummer

**Aufbewahrungseinheit**:
Ein mit QR-Code etikettiertes physisches Behältnis für Spiele — entweder ein **Karton** (`OM-BOX-0001`, wandert als Ganzes) oder ein **Regal** (`OM-SHELF-C4`, vereinseigen, wird bei Events aufgebaut). Eine Einheit kann in einer anderen stehen (Karton im Regal) und steht am Ende der Kette bei einem Meeple.
_Avoid_: Lager, Ort, Location, Box vs. Shelf als getrennte Konzepte

**Aufenthalt**:
Wo ein Spiel in einem Zeitraum war. Ziel ist entweder eine Aufbewahrungseinheit oder ein Meeple; ein Spiel hat **immer genau einen** offenen Aufenthalt. Ausleihe, Rückgabe, Weitergabe und Umlagern sind derselbe Vorgang — einen Aufenthalt schließen und den nächsten öffnen. Welcher Vorgang ihn geöffnet hat, wird am Aufenthalt festgehalten und entscheidet, ob er als Ausleihe zählt.
_Avoid_: Standort als Feld, Borrow-Datensatz, Verleihvorgang

**Unsortiert**:
Die Aufbewahrungseinheit für Spiele, deren physischer Standort noch nie erfasst wurde. Behauptet keinen echten Ort und hat keinen Verwahrer; ihr Inhalt ist die Arbeitsliste der Ersterfassung.
_Avoid_: Standort unbekannt, Eingangslager, null

**Ortsangabe**:
Freitext, wo eine Aufbewahrungseinheit gerade physisch steht (z. B. „Keller links"). Wird nur benutzt, wo keine übergeordnete Einheit existiert. Spiele haben **keinen** Stammplatz — sie werden dorthin gestellt, wo Platz ist.
_Avoid_: Stammplatz, Sollplatz, Heimatregal

**Verwahrer**:
Der Meeple, bei dem eine Aufbewahrungseinheit steht. Spiele in seinen Einheiten sind nicht ausgeliehen und dort unkompliziert abzuholen.
_Avoid_: Besitzer, Eigentümer, Lagerist

**Ausleiher**:
Der Meeple, der ein Spiel direkt bei sich hat, weil er es ausgeliehen bekommen hat.
_Avoid_: Leiher, Halter, Mieter

**Verantwortliche:r**:
Oberbegriff für die Person, bei der ein Spiel gerade liegt — Ausleiher bei direkter Ausleihe, sonst der Verwahrer der Einheit über die Kette Spiel → Karton → Regal → Meeple. Wird abgeleitet, nie gespeichert, und kann fehlen (Einheit ohne Verwahrer).
_Avoid_: Besitzer, Eigentümer

**Vollständigkeitsprüfung**:
Die Kontrolle, ob ein Spiel noch alle Teile hat. Ist sie fällig, trägt das Spiel ein Flag; fällt sie negativ aus, geht das Spiel in den Zustand Wartung. Prüfbedürftige Spiele bleiben ausleihbar.
_Avoid_: Inventur (Inventur meint den Durchgang durch viele Spiele), Zustandsprüfung

**Deinventarisierung**:
Ein Spiel scheidet aus dem Bestand aus (Verkauf, Verlust, Zerstörung), ohne gelöscht zu werden — mit Grund und Datum. Es behält seinen Standort, verschwindet aber standardmäßig aus allen Listen.
_Avoid_: Löschen, Archivieren, Aussortieren

**Zustand**:
Die abgeleitete Ausleih-Situation eines Spiels: **frei** (liegt in einer Einheit, unkompliziert abzuholen), **ausgeliehen** (liegt bei einer Person, Abholung ggf. aufwendiger), **Wartung** (bei der Vollständigkeitsprüfung durchgefallen), **nicht erfasst** (liegt in „Unsortiert"). Ausleihbar sind Spiele in allen Zuständen — auch solche, für die eine Prüfung aussteht.
_Avoid_: Verfügbarkeit, Status (Status meint die Bestandszugehörigkeit: aktiv oder deinventarisiert)

**Einlagerung**:
Eine Aufbewahrungseinheit steht bei einem Meeple. Die enthaltenen Spiele sind dadurch **nicht** ausgeliehen und bleiben ausleihbar — die Einheit bleibt Standort, das Mitglied ist nur Verwahrer. Der Verein hat kein Vereinsheim, deshalb ist das der Normalfall und nicht die Ausnahme.
_Avoid_: Ausleihe eines Kartons, Karton-Verleih, Besitz

**Ausleihe**:
Ein Spiel ist bei einem Meeple statt an einem Karton-Standort. Jede Entnahme aus einem Karton ist eine Ausleihe — auch durch den Meeple, bei dem der Karton eingelagert ist. Es gibt keine Leihfrist.
_Avoid_: Verleih, Borrow als Vorgang, Reservierung

**Weitergabe**:
Ein Spiel wechselt direkt von einem Meeple zum nächsten. Beginnt eine neue Ausleihe auf den Namen des Empfängers.
_Avoid_: Übergabe, Transfer, Tausch (Tausch meint Eigentumswechsel und ist kein Vorgang dieses Portals)

**Rückgabe**:
Ein Spiel verlässt die Ausleihe — entweder direkt in eine Aufbewahrungseinheit oder an einen Meeple, der es einlagern soll. Begründet **keine** neue Ausleihe: wer ein Spiel zur Rückgabe annimmt, hat es nicht ausgeliehen. Abgeschlossen ist eine Rückgabe erst, wenn das Spiel in einer Einheit liegt.
_Avoid_: Return, Einbuchen

**Umlagern**:
Der Standort eines Spiels oder einer Aufbewahrungseinheit wird geändert, ohne dass jemand ausleiht oder zurückgibt. Erzeugt keine Etappe auf den Namen der Person, die umlagert.
_Avoid_: Verschieben, Move, Standortkorrektur

**Unbestätigter Standort**:
Ein Standort, den die abgebende Person eingetragen hat und die empfangende noch nicht. Blockiert nichts und wird mit Herkunftshinweis („eingetragen von \<Person\>") angezeigt. Eine Weitergabe bestätigt der Empfänger per Klick; eine Rückgabe bestätigt er, indem er das Spiel in eine Einheit einlagert.
_Avoid_: Pending, vorläufig, unsicher

**Sammel-Umlagern**:
Variante des Umlagerns für den Event-Abbau: die Ziel-Einheit wird einmal gescannt, danach werden mehrere Spiele nacheinander gescannt und alle auf dieses eine Ziel gebucht, bis eine neue Ziel-Einheit gescannt wird. Bleibt fachlich ein gewöhnliches Umlagern je Spiel, nur die Scan-Reihenfolge ist umgekehrt.
_Avoid_: Batch-Umlagern, Serien-Scan als eigener Vorgang

### Event-Betrieb

**Event**:
Ein Spieletag oder eine Großveranstaltung mit Datum und Ort, von einem Admin angelegt. Eigenständig und losgelöst vom öffentlichen/internen ICS-Kalender-Feed — der Feed bleibt Ankündigung, das Event ist die Grundlage für Schichten, Erklärbären und Flohmarkt-Artikel.
_Avoid_: Termin (das ist die Kalender-Ankündigung), Veranstaltung als Kalendereintrag

**Regal-Zuordnung**:
Die Angabe, welche Regale bei einem Event aufgebaut sind. Rein informativ — sie verändert keinen Aufenthalt, sondern grenzt nur ein, welche Spiele der Gäste-Bereich als „im Raum" anzeigt.
_Avoid_: Event-Standort, Event als Aufbewahrungseinheit

**Erklärbär**:
Ein Meeple mit einem dauerhaften Profil aus Spielen (Bezug auf echte `BoardGame`-Einträge) und je Spiel einer Erfahrungsstufe. Getrennt davon meldet er sich pro Event einfach als anwesend an; erst die Kombination aus Profil und Event-Anwesenheit ergibt „heute hier erklärbar".
_Avoid_: Schicht, Spielelehrer, Erklärbär als reine Event-Anmeldung ohne Profil

**Schicht**:
Ein Zeitfenster mit festem Typ (Küche, Ausleihe, Flohmarkt) und fester Kapazität innerhalb eines Events, in das sich Mitglieder selbst eintragen — optional mit Kennzeichnung „unsichere Zusage". Wer eine Schicht besetzt, erhält für deren Dauer die zugehörigen Rechte (z. B. Flohmarkt-Kasse), unabhängig von einer sonst vergebenen Permission.
_Avoid_: Erklärbär als Schicht, freie Schicht-Namen

**Flohmarkt-Artikel**:
Ein Gegenstand, den ein Mitglied für den Bring-&-Buy-Verkaufstag eines Events anmeldet (einzeln oder per Excel-Import), mit Preis und Status. Muss von einem Admin oder einem Mitglied in der Flohmarkt-Schicht dieses Events freigegeben werden, bevor er im öffentlichen Gäste-Bereich erscheint. Führt keine Provisions- oder Auszahlungsbuchhaltung — das läuft außerhalb des Portals.
_Avoid_: Kleinanzeige (das ist der ganzjährige Phase-7-Flohmarkt), Verkaufsabwicklung, Auszahlung

**Gäste-Bereich**:
Die öffentliche, unauthentifizierte Ansicht für Event-Besucher vor Ort: Spielesuche über den bestehenden EAN-Scan (Auswahlliste nur bei mehreren Exemplaren desselben Titels), anwesende Erklärbären, Flohmarkt-Artikelliste. Jederzeit erreichbar, kein Zeitfenster-Gating.
_Avoid_: Event-Login, Spiele-QR-Code (bewusst nicht eingeführt, EAN reicht)
