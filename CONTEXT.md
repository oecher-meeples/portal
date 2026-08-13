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

**Spiel** (Titel, `BoardGame`):
Ein Brettspiel-Titel mit seinen BGG-/Produkt-Metadaten — ein Datensatz pro Titel, unabhängig davon, wie viele physische Exemplare der Verein davon besitzt.
_Avoid_: Exemplar (das ist die physische Ebene, siehe unten), Kopie

**Exemplar** (`GameCopy`, seit ADR 0008):
Ein einzelnes physisches Spiel im Vereinsbesitz — Zustand, Inventarstatus und Standort (über `GameHolding`). Ein Titel kann mehrere Exemplare haben, unterscheidbar über Standort und Zustand, nicht über die EAN (die ist Produkt-, nicht Exemplar-Eigenschaft). Löst den Teil von ADR 0001 ab, der eine Titel-/Exemplar-Trennung noch verwarf, solange kein Titel mehr als ein Exemplar hatte.
_Avoid_: Spiel als Synonym für Exemplar (Spiel meint den Titel), Kopie, GameCopy im Fließtext

**EAN**:
Der Hersteller-Barcode auf der Spieleschachtel. Er kennzeichnet das **Produkt** (den Titel), nicht das einzelne Exemplar — mehrere Exemplare desselben Titels tragen dieselbe EAN, ein Scan kann daher mehrere Treffer liefern.
_Avoid_: Barcode als Exemplar-Schlüssel, Inventarnummer

**Erweiterung** (`kind = BOARDGAME_EXPANSION`):
Ein Titel, der ohne ein Basisspiel nicht spielbar ist (bewusst ignorierte Ausnahmen). Ob ein Titel Erweiterung oder eigenständiges Spiel ist, entscheidet allein `BoardGame.kind` — das ist eine dauerhafte Eigenschaft des Titels, keine Ableitung aus der aktuellen `GameCollection`-Zuordnung. Wird ein Titel einem Basisspiel als Erweiterung zugeordnet (gleich von welcher Seite aus, siehe `GameCollection`), springt sein `kind` auf `BOARDGAME_EXPANSION` und bleibt das auch, wenn später alle Basisspiel-Zuordnungen wieder entfernt werden (die Schachtel wird dadurch nicht plötzlich eigenständig spielbar) — ein Rückfall auf `BOARDGAME` ist nur manuell über die Bearbeiten-Maske möglich. Eine Erweiterung kann nicht selbst über eigene Erweiterungen verfügen.
_Avoid_: Sich aus `GameCollection`-Zuordnung ableiten, ob ein Titel eine Erweiterung ist; automatischer Rückfall auf `BOARDGAME` beim Entfernen der letzten Zuordnung

**GameCollection**:
Die Basisspiel↔Erweiterung-Zuordnung, unabhängig von `kind`. Many-to-many: eine Erweiterung kann zu mehreren Basisspielen kompatibel sein, ein Titel kann außerdem als Erweiterung markiert sein, bevor oder ohne dass ihm ein Basisspiel zugeordnet ist. Zuordnen ist von beiden Seiten möglich (Basisspiel fügt Erweiterung hinzu, oder Erweiterung ordnet sich einem Basisspiel zu) — fachlich derselbe Vorgang.
_Avoid_: Als alleiniges Kriterium für „ist Erweiterung" heranziehen; 1:1-Kardinalität annehmen

**BGG-Abgleich** (geplant, noch nicht umgesetzt):
BoardGameGeek gilt als vorrangige Quelle gegenüber manuell gepflegten Werten (z. B. `kind`). Ein künftiger Abgleich soll Diskrepanzen zwischen BGG- und Portal-Daten aufzeigen. Bis dahin ignoriert.

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
_Avoid_: Verfügbarkeit, Status (Status meint die Bestandszugehörigkeit: aktiv oder deinventarisiert), Zustand für den materiellen Zustand eines Exemplars (das ist der **Mängelvermerk**, siehe unten)

**Mängelvermerk** (`GameCopy.condition`):
Freitext-Notiz zum materiellen Zustand eines Exemplars (z. B. „Ecke eingedrückt") — unabhängig vom Ausleih-`Zustand`. Wird bei der Vollständigkeitsprüfung gesetzt oder gelöscht.
_Avoid_: Zustand (das ist die Ausleih-Situation, siehe oben), Zustandsnotiz

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

### Marktplatz & Community

**Ersatzteillager-Eintrag**:
Ein Posten loser Teile zu einem Spiel oder — ohne Spielbezug — zum Sammelposten „Allgemeines", mit einem Verwahrer, der die Teile aktuell hat. Entsteht eigenständig oder zusammen mit einer Deinventarisierung (Checkbox „Teile ins Ersatzteillager aufnehmen"). Reine Self-Service-Liste ohne Abhol- oder Verkauft-Status; erledigt = gelöscht.
_Avoid_: Flohmarkt-Artikel (das ist der Event-gebundene Bring-&-Buy-Posten), Ersatzteil-Lagerbestand mit Stückzahl

**Kleinanzeige**:
Ein ganzjähriger, mitgliedergeführter Verkaufsposten im Kleinanzeigen-Marktplatz (`/markt`) — eigener Titel, Preis, Zustand, Beschreibung, optional Bilder. Kontakt läuft über den Direktkontakt-Button (Mail/Telegram) außerhalb des Portals; keine Reservierung, kein Chat, keine Zahlungsabwicklung im Portal.
_Avoid_: Flohmarkt-Artikel (Event-gebunden, mit Freigabe-Workflow), Verkaufsabwicklung

**Community-Kontaktfeld**:
Ein optionales Profilfeld (Telegram, Signal oder Discord), das ein Mitglied im eigenen Profil pflegt und für andere Mitglieder einsehbar macht. Nur `telegramHandle` fließt in den Direktkontakt-Button einer Kleinanzeige ein; Signal/Discord sind reine Profilangaben ohne eigenen Kontakt-Link.
_Avoid_: Kontaktdaten (das meint E-Mail, ist kein neues Feld), Social-Media-Profil

**Privatbesitz-Eintrag**:
Ein Titel, den ein Mitglied privat besitzt und nicht im Vereinsbestand geführt wird — Grundlage der Crowdsourced-Suche in der internen Ludothek. Referenziert seit ADR 0008 denselben Titel-Datensatz (`BoardGame`) wie der Vereinsbestand, sofern die `bggId` übereinstimmt; es entsteht dabei **kein** Exemplar (`GameCopy`) — Privatbesitz kennt keine Exemplare, nur Vereinsbestand hat Standort/Zustand. Aktuell ausschließlich per Seed befüllt (zwei Demo-Mitglieder), da ein echter BGG-Sammlungs-Sync an der aus dieser Umgebung blockierten BoardGameGeek-API scheitert (siehe `.claude/plans/phase-7-marktplatz-community-execution-plan.md`). Erscheint in der internen Ludothek-Suche nur nach explizitem Toggle „Auch Privatbesitz anzeigen" (Default aus) und **nie** in der öffentlichen Projektion.
_Avoid_: Exemplar für Privatbesitz (Privatbesitz hat kein `GameCopy`), BGG-Sammlung (impliziert einen echten Sync, den es hier noch nicht gibt)

### Newsletter

**Entwurf**:
Ein Beitrag mit `status: DRAFT` — sichtbar nur im Redaktionsbereich, nie öffentlich oder intern, löst kein Instagram-Cross-Posting und keinen Newsletter-Versand aus. Erst „Absenden" (Status `PUBLISHED`) macht ihn sichtbar und löst beides ggf. aus.
_Avoid_: unveröffentlichter Beitrag, Vorschau

**Newsletter-Abonnent**:
Ein Eintrag mit E-Mail-Adresse, Kategorien und Bestätigungsstatus — entweder anonym über das öffentliche Formular (braucht Double-Opt-in) oder über den Profil-Toggle eines Meeples (bereits authentifiziert, kein Double-Opt-in nötig). Eine gemeinsame Tabelle für beide Quellen, verknüpft über ein optionales `meepleId`-Feld.
_Avoid_: Newsletter-Kontakt (kein Fremdsystem, reine Portal-Tabelle), Mitglied (ein Abonnent muss kein Meeple sein)

**Newsletter-Kategorie**:
Termine, News, Turniere oder Berichte zu vergangenen Events — das Abonnenten-Interesse, entkoppelt vom `PostType` eines Beitrags (Inhalts-Klassifikation). Ein Beitrag bekommt beim Anlegen eine Default-Kategorie aus seinem Typ, bleibt aber überschreibbar.
_Avoid_: PostType (das ist die Inhalts-Klassifikation, nicht das Abonnenten-Interesse)
