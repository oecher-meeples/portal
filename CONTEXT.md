# Oecher Meeples Vereinsportal

Vereinsportal eines Brettspielvereins: öffentliche Außendarstellung, interner Mitgliederbereich und die physische Verwaltung der Vereins-Ludothek (Spielebestand, Aufbewahrung, Verleih).

## Language

> **Hinweis:** Der Personen-Abschnitt unten spiegelt den Zielzustand aus [ADR 0013](adr/0013-vereinsmitglied-getrennt-von-meeple.md) und `docs/mitglieder-konzept.md` (Split in `Vereinsmitglied`- und `Meeple`-Tabelle, löst [ADR 0002](adr/0002-meeple-eins-zu-eins-zum-login.md) ab). Der Split ist inzwischen größtenteils umgesetzt (#328 ff., PR #337) — dieser Branch korrigiert die dabei aufgefallenen Abweichungen zwischen Konzept und Implementierung (siehe die zugehörigen GitHub-Issues, u. a. #353/#358).

### Personen

**Meeple**:
Das Selbstdarstellungs- und Interaktionsprofil im Portal, 1:1 zum Login-Konto (`neonAuthUserId`). Seit dem Vereinsmitglied/Meeple-Split (ADR 0013, #328) nicht mehr zwingend 1:1 zur Vereinsmitgliedschaft: referenziert optional ein `Vereinsmitglied` — ein Meeple kann ohne Vereinsmitglied existieren (**Systemkonto**, **Anonymes Konto**), ein Vereinsmitglied kann ohne Meeple existieren (noch kein Login). Datenmodell: `Meeple`.
_Avoid_: User, Mitgliedsprofil, Nutzer, Meeple = Vereinsmitgliedschaft

**Vereinsmitglied** (`Member` im Code):
Der administrative Datensatz zur Mitgliedschaft im Verein — Mitgliedsnummer, Name, Geburtsdatum, Adresse, Kontaktdaten fürs Vereinsregister, Beitrag, Bankdaten, Kündigung/Austrittsdatum — gepflegt vom Vorstand (IBAN exklusiv vom Kassenwart). Seit ADR 0013 (#328) getrennt vom Portal-Account (`Meeple`), verknüpft über `Member.meepleId` (optional, 1:1), unabhängig davon, ob die Person je ein Portal-Konto hatte. Nur Mitgliedsnummer und E-Mail sind Pflichtfelder; Name, Geburtsdatum, Geburtsort, Adresse und Telefon bleiben `nullable`, bis der Vorstand die genaue Pflichtfeld-Liste bestätigt und sie einträgt — kein Platzhalter-Backfill.
_Avoid_: Meeple als Synonym (das ist der Portal-Account), Member im Fließtext (nur als Modellname im Code), Pflichtfelder erzwingen, ohne dass echte Daten vorliegen

**Beitragsart-Kategorien** (Anzeige, nicht Datenmodell):
**Meeple** (Einzel-/Selbstgewählter Beitrag, Alter > 18), **JungMeeple** (Jugendbeitrag, 13–18), **MiniMeeple** (Kinderbeitrag, < 13) — reine Anzeige-Labels für die Infocard-Aufteilung unter `/admin/mitglieder`, abgeleitet aus `Vereinsmitglied.birthDate`. Nicht mit dem Kern-Begriff **Meeple** (dem Portal-Profil) verwechseln — hier ist "Meeple" nur die Erwachsenen-Kategorie unter drei altersbasierten Labels.
_Avoid_: Als eigene DB-Entität oder Rolle missverstehen

**Systemkonto**:
Ein `Meeple` ohne `Vereinsmitglied`-Referenz, aber mit Login — für Sammel-/Funktionskonten (z. B. Kassenzugang Flohmarkt). Angelegt von `admin:access` in einem Schritt: Login per `createLoginAccount()` (self-hosted better-auth, ADR 0015), `Meeple` mit vorgegebenem Displaynamen, danach ein Passwort-Reset-Link an die angegebene E-Mail — kein Invite-Mechanismus (der ließe für die kurze Zeit bis zur Einlösung einen Zwischenzustand entstehen, der von einem Anonymen Konto nicht unterscheidbar wäre).
_Avoid_: Verwechslung mit Anonymem Konto (das hat kein Login mehr), Systemkonto per Einladung anlegen

**Anonymes Konto**:
Ein `Meeple` ohne `Vereinsmitglied`-Referenz und ohne Login — Einbahnstraßen-Zustand, dient nur der lesbaren Historie (Aufenthalte, Gesuche). Kein Zurück zu einem Login möglich. Erscheint deshalb in keinem Auswahl-Picker mehr (Filter auf `anonymizedAt: null`).
Ein Sonderfall trägt keinen echten anonymisierten Namen, sondern ist ein einziges, dauerhaftes **Sammelkonto "Anonymer Meeple"** — Platzhalter-Ziel für ungeklärte externe Interaktionspartner in der Ludothek (siehe **Verantwortliche:r**), nicht aus einer echten Anonymisierung entstanden (kein `anonymizedAt`). Trägt bewusst denselben generischen Displaynamen wie echte anonymisierte Alt-Meeples (zusätzliche Anonymität, kein Namenskonflikt, da beide ohnehin aus jedem Picker gefiltert sind) — nur mit `games:manage` ist ein **echter** anonymisierter Alt-Meeple per 6-Hex-Suffix unterscheidbar (aus der Meeple-ID abgeleitet, kein Jahresbezug/Zähler, z. B. "Anonymer Meeple #a3f9c2", #364); das Sammelkonto selbst bekommt nie einen Suffix. **Bekannte Abweichung:** aktuell (fälschlich) als echte `Member`-Zeile modelliert statt als reines `Meeple`-Konstrukt, siehe #341.
_Avoid_: Reaktivierung, Wiederherstellung, das Sammelkonto mit einem konkreten anonymisierten Alt-Mitglied verwechseln

**Vereinsmitgliedschafts-Zustand** (abgeleitet, nicht persistiert):
Aus `meepleId`/`resignedAt`/`membershipEndsAt` abgeleitet: **Unregistriert** (kein `meepleId`, kein `resignedAt`) → **Registriert** (`meepleId` vorhanden, kein `resignedAt`) → bei gesetztem `resignedAt` entscheidet nur noch das Datum: **Gekündigt** (`membershipEndsAt` in der Zukunft) vs. **Ausgetreten** (`membershipEndsAt` in der Vergangenheit) — `meepleId` spielt für diese beiden keine Rolle mehr.
_Avoid_: Zustand als gespeichertes Feld, Gekündigt/Ausgetreten an `meepleId` festmachen

**Kündigung**:
Der Vermerk, dass ein Vereinsmitglied austritt (`resignedAt`). Kündigungsfrist 4 Wochen (siehe #258): wirkt zum nächsten 31.12., außer das wären weniger als 4 Wochen ab Eingang — dann erst zum übernächsten 31.12. Die Mitgliedschaft läuft bis `membershipEndsAt` unverändert weiter — es darf weiter ausleihen. In den letzten 31 Tagen wird auf noch offene Ausleihen hingewiesen.
_Avoid_: Austritt (der Austritt ist erst die Wirkung), Deaktivierung, reine Stichtagsregel ohne 4-Wochen-Mindestvorlauf

**Ausgetreten**:
Der Zustand nach Ablauf von `membershipEndsAt`. Der Zugang beschränkt sich auf das Abwickeln: eigenes Profil, eigene Bestände, Kalender und Mitgliederverzeichnis. Ludothek, interne News, Spielergesuche und der Scanner (`/scan`) sind gesperrt. **Vier-Augen-Prinzip (#537):** Ein ausgetretenes Mitglied löst nie selbst eine Buchung aus — auch keine Rückgabe in eine Aufbewahrungseinheit — und ist nie Empfänger oder Ziel einer Buchung. Seine Spiele kommen nur zurück, wenn eine **andere** Person sie scannt (Scanner-Modus „Erhalten" oder „Übergeben" an eine Einheit) oder der Spielewart sie umbucht; so kann ein Ausgetretener keine Behauptungen über den Verbleib aufstellen. Abwicklungshinweis an die Person: „Lass deine Spiele von der Person scannen, die sie übernimmt, oder gib sie beim Spielewart ab." Login bleibt bis zur Anonymisierung möglich. Technisch eine echte `Role` (Fachbegriff: **Systemrolle**, `Role.isSystemRole`) mit eigenem Rechte-Satz, die nur mit `admin:access` manuell zuweisbar ist — regulär pflegt ein Cron-Job am 2.1. 02:00 die `UserRole`-Zeile für alle betroffenen Vereinsmitglieder in einem Rutsch, da Vertragslaufzeiten fest an den Jahreswechsel gebunden sind. **Bekannte Abweichung:** aktuell ohne `admin:access`-Schutz über das normale Rollen-Dropdown zuweisbar, siehe #353.
_Avoid_: Inaktiv, gesperrt, ehemalig, Login-Verlust gleichzeitig mit Austritt annehmen, unbeschränkte manuelle Rollenzuweisung, Selbstbedienungs-Rückgabe durch Ausgetretene

**Anonymisierung** (3 Stufen, löst die bisherige Sanft/Hart-Unterscheidung ab):

1. **DSGVO-Löschung optionaler Daten**: alle optionalen Meeple-Daten (Kontakt, Spiele, LFG, Marktplatz) werden gelöscht, `displayName` generisch überschrieben; Login bleibt aktiv. Auslösbar vom Meeple selbst oder von Vorstand/Datenschutzbeauftragtem.
2. **Kontodeaktivierung**: zusätzlich wird das Login-Konto deaktiviert/gelöscht, `Meeple` und `Vereinsmitglied` werden getrennt (keine Verbindung mehr herstellbar). Ausgelöst durch Selbst-Löschung des Kontos, oder automatisch durch denselben Cron am 2.1. 02:00 (siehe **Ausgetreten**) für alle Ausgetretenen ohne offene Ausleihen. Wer zu dem Zeitpunkt noch offene Ausleihen hat, erscheint stattdessen als Warn-Infocard im Admin-Dashboard für Vorstand/Spielewart — die lösen das Problem (Spiele eintreiben) und starten Stufe 2 danach manuell, kein fortlaufender Hintergrund-Check bei jeder Rückgabe.
3. **Löschung des Vereinsmitglieds**: 12 Monate nach `membershipEndsAt` **und** keine Spiele mehr ausgeliehen (beide Bedingungen), wird der `Vereinsmitglied`-Datensatz selbst gelöscht (nicht nur überschrieben) — die 12-Monats-Uhr beginnt exakt mit `membershipEndsAt`, nicht mit einer vorzeitigen Selbst-Kontolöschung. Der anonymisierte `Meeple`-Rest bleibt für die Historie bestehen.

Da Mitgliedschaften immer zum Jahreswechsel enden, fallen "gerade ausgetreten" (Stufe 2) und "vor 12 Monaten ausgetreten" (Stufe 3) beide auf denselben 31.12. — **ein einziger jährlicher Cron** (2.1., 02:00, siehe **Ausgetreten**) prüft beide Stufen in einem Rutsch. Fälle mit noch offenen Ausleihen werden nicht automatisch verarbeitet, sondern als Warn-Infocard im Admin-Dashboard **und** einer einzigen gesammelten Mail (beide Stufen zusammen, ein Abschnitt je Stufe) an Vorstand/Spielewart gemeldet; die lösen das Problem und starten die jeweilige Stufe danach manuell.
_Avoid_: Kontolöschung, DSGVO-Löschung und Anonymisierung synonym für nur eine Stufe verwenden, Pseudonymisierung, 12-Monats-Frist ab Kontolöschung statt ab `membershipEndsAt` zählen, eine Mail pro betroffenem Mitglied statt gesammelt

**Bankverbindungs-Änderungsantrag** (neu):
IBAN wird nie direkt vom Meeple überschrieben — nur beantragt. Ein neuer Antrag ersetzt automatisch einen noch offenen. Freigabe ausschließlich durch den Kassenwart; erst danach wird die aktive IBAN ersetzt. Für aktive Vereinsmitglieder ist ein Löschen der Bankdaten nicht möglich (nur Ändern) — auch für gekündigte/ausgetretene gibt es **keine eigene Löschaktion**: Aufbewahrungspflicht von 12 Monaten nach `membershipEndsAt`, danach nur bei fehlenden offenen Ausleihen. Der komplette `Vereinsmitglied`-Datensatz (inkl. IBAN) wird erst unter genau diesen Bedingungen über Anonymisierungs-Stufe 3 gelöscht (siehe **Anonymisierung** oben), nicht früher und nicht separat. Der Kassenwart kann eine reguläre Änderung auch ablehnen (Pflichtgrund) — löst automatisch eine Mail mit dem Grund ans Meeple aus. **Bekannte Abweichung:** aktuell existiert zusätzlich ein Self-Service-„Bankdaten löschen"-Button, der die IBAN vorzeitig und ohne Freigabe löscht — soll entfallen, siehe #358.
_Avoid_: Direktes Überschreiben der IBAN durchs Profilformular, Ablehnen ohne Benachrichtigung des Meeples, IBAN separat von der Vereinsmitglied-Löschung behandeln

**E-Mail-Änderung** (eine Adresse pro Person, #614):
`Vereinsmitglied.email` und Login-E-Mail (`AuthUser.email`) sind dieselbe Adresse. Das Meeple ändert sie im eigenen Profil (Karte „E-Mail-Adresse") als Änderungsantrag wie die IBAN (inkl. Ablehnen mit Mail): Bestätigungslink an die neue Adresse verifiziert die Erreichbarkeit, die bisherige Adresse bekommt zeitgleich eine Warnung, danach gibt der Vorstand frei. Erst mit der Freigabe werden beide Adressen ersetzt, und die neue Adresse bekommt eine Mail, dass die alte ungültig ist. Eine direkte Änderung durch den Vorstand (`/admin/mitglieder`) zieht die Login-E-Mail ebenfalls mit. Eine eigene Profil-Kontakt-E-Mail (`Meeple.email`) gibt es nicht mehr.
_Avoid_: Vereinsmitglied-E-Mail ohne Vorstandsfreigabe direkt ändern lassen, Login-E-Mail getrennt von der Vereinsmitglied-E-Mail ändern (die alte Adresse bliebe am Login hängen und wäre für eine neue Registrierung blockiert)

**Kassenwart**:
Rolle mit dem alleinigen Recht, gespeicherte Bankdaten zu entschlüsseln **und** Bankverbindungs-Änderungsanträge freizugeben. Jeder Entschlüsselungs-Zugriff wird protokolliert.
_Avoid_: Schatzmeister, Finanzadmin

**Mitgliederimport** (#611):
Einmaliges bzw. wiederholbares Einlesen des Vereinsverwaltungs-Exports (CSV) unter `/admin/mitglieder/import`. Legt nur neue Vereinsmitglieder an (vorhandene Mitgliedsnummer → übersprungen, nie aktualisiert), ohne Einladungen. Ein importiertes Mitglied hat kein Beitrittsdatum (`joinedAt = null`, „unbekannt").
_Avoid_: Seed für echte Mitgliederdaten, Import als Abgleich/Update des Bestands

**Gruppe (gleiche E-Mail)**:
Zeilen des Mitgliederimports, die dieselbe E-Mail-Adresse teilen (getrimmt, case-insensitiv) — typischerweise eine Familie unter der Adresse der Eltern. Genau ein:e Erziehungsberechtigte:r behält die Adresse, Kinder werden ohne E-Mail mit allen Erziehungsberechtigten verknüpft. Gehört die Adresse schon einem bestehenden Mitglied, ist dieses der **Anker**.
_Avoid_: Gruppe über gleichen Nachnamen, Familie als Datenmodell (es gibt nur `MemberGuardian`)

**Familie (Import)**:
Arbeitsbegriff nur der Import-Vorschau: eine Gruppe plus die Zeilen, die der Admin per „Einer anderen Familie zuweisen" hinzugefügt hat (auch um eine einzelne Zeile oder ein bestehendes Mitglied herum). Wird beim Anlegen zu `MemberGuardian`-Verknüpfungen — Kind × alle Erziehungsberechtigten der Familie — und nirgends gespeichert.
_Avoid_: Familie als persistiertes Datenmodell

**Einladung** (überarbeitet):
Immer einmalig einlösbar und E-Mail-gebunden (Doppel-Schlüssel: `email` + `token`, `email` ist eindeutig) — der ungebundene, mehrfach einlösbare Invite-Typ entfällt ersatzlos (Vorstandsentscheidung). Nur noch **eine** Spielart: die **Mitgliedseinladung**, aus einem `Vereinsmitglied` heraus erstellt, legt bei Einlösung automatisch ein neues `Meeple` an und verknüpft es. Systemkonten laufen **nicht** mehr über Einladungen (siehe **Systemkonto** unten). Ändert sich die E-Mail eines Vereinsmitglieds, während eine Einladung offen ist, verfällt sie nicht automatisch — ein Popup fragt, ob sie widerrufen und neu erstellt werden soll.
Die Gültigkeitsdauer ist eine globale Einstellung (`/admin/einstellungen`, sichtbar nur mit `invites:manage`, Default 7 Tage) — kein individuelles Überschreiben pro Einladung mehr.
_Avoid_: Ungebundene/mehrfach einlösbare Einladung, automatisches Kaskadieren der E-Mail-Änderung auf offene Einladungen, individuelle Gültigkeitsdauer pro Einladung, Systemkonto-Einladung (gibt es nicht mehr)

### Ludothek

**Spiel** (Titel, `BoardGame`):
Ein Brettspiel-Titel mit seinen BGG-/Produkt-Metadaten — ein Datensatz pro Titel, unabhängig davon, wie viele physische Exemplare der Verein davon besitzt.
_Avoid_: Exemplar (das ist die physische Ebene, siehe unten), Kopie

**Exemplar** (`GameCopy`, seit ADR 0008):
Ein einzelnes physisches Spiel im Vereinsbesitz — Zustand, Inventarstatus und Standort (über `GameHolding`). Ein Titel kann mehrere Exemplare haben, unterscheidbar über Standort und Zustand, nicht über die EAN (die ist Produkt-, nicht Exemplar-Eigenschaft). Löst den Teil von ADR 0001 ab, der eine Titel-/Exemplar-Trennung noch verwarf, solange kein Titel mehr als ein Exemplar hatte.
_Avoid_: Spiel als Synonym für Exemplar (Spiel meint den Titel), Kopie, GameCopy im Fließtext

**Wert / Erhalten am** (`GameCopy.valueCents`, `GameCopy.acquiredOn`, #615):
Was ein Exemplar wert ist (in Cent) und wann der Verein es erhalten hat — beides optional, `null` heißt unbekannt. Nur die Ludothek-Verwaltung (`games:manage`) sieht und pflegt sie. Der **Bestandswert** ist die Summe der bekannten Werte aller nicht deinventarisierten Exemplare; ein deinventarisiertes Exemplar behält seinen Wert, zählt aber nicht mehr mit. „Erhalten am" ist unabhängig vom Erfassungsdatum im Portal (`createdAt`).
_Avoid_: Preis (das ist der Marktplatz), Euro-Beträge als Gleitkommazahl speichern

**EAN**:
Der Hersteller-Barcode auf der Spieleschachtel. Er kennzeichnet das **Produkt** (den Titel, je Edition eine EAN), nicht das einzelne Exemplar. Ein Titel kann mehrere EANs haben, aber jede EAN gehört global eindeutig zu genau einem Titel (ADR 0016); ein Scan findet den Titel über jede seiner EANs und kann mehrere Exemplare liefern.
_Avoid_: Barcode als Exemplar-Schlüssel, Inventarnummer

**Erweiterung** (`kind = BOARDGAME_EXPANSION`):
Ein Titel, der ohne ein Basisspiel nicht spielbar ist (bewusst ignorierte Ausnahmen). Ob ein Titel Erweiterung oder eigenständiges Spiel ist, entscheidet allein `BoardGame.kind` — das ist eine dauerhafte Eigenschaft des Titels, keine Ableitung aus der aktuellen `GameCollection`-Zuordnung. Wird ein Titel einem Basisspiel als Erweiterung zugeordnet (gleich von welcher Seite aus, siehe `GameCollection`), springt sein `kind` auf `BOARDGAME_EXPANSION` und bleibt das auch, wenn später alle Basisspiel-Zuordnungen wieder entfernt werden (die Schachtel wird dadurch nicht plötzlich eigenständig spielbar) — ein Rückfall auf `BOARDGAME` ist nur manuell über die Bearbeiten-Maske möglich. Eine Erweiterung kann nicht selbst über eigene Erweiterungen verfügen.
_Avoid_: Sich aus `GameCollection`-Zuordnung ableiten, ob ein Titel eine Erweiterung ist; automatischer Rückfall auf `BOARDGAME` beim Entfernen der letzten Zuordnung

**GameCollection**:
Die Basisspiel↔Erweiterung-Zuordnung, unabhängig von `kind`. Many-to-many: eine Erweiterung kann zu mehreren Basisspielen kompatibel sein, ein Titel kann außerdem als Erweiterung markiert sein, bevor oder ohne dass ihm ein Basisspiel zugeordnet ist. Zuordnen ist von beiden Seiten möglich (Basisspiel fügt Erweiterung hinzu, oder Erweiterung ordnet sich einem Basisspiel zu) — fachlich derselbe Vorgang.
_Avoid_: Als alleiniges Kriterium für „ist Erweiterung" heranziehen; 1:1-Kardinalität annehmen

**BGG-Abgleich** (geplant, siehe #189):
Eine Diff-Ansicht, die die aktuellen BGG-Daten eines Titels neben die eigenen stellt. BGG ist dabei **kein automatischer Sieger bei Abweichungen** — nur Vorschlag, feldweise und manuell durch den Admin zu übernehmen. Deckt sich mit dem Prinzip bei **Erweiterung** (siehe unten): eine manuelle Korrektur ist immer maßgeblich, eine BGG-Ableitung nie automatisch bindend.
_Avoid_: BGG als vorrangige/automatisch gewinnende Quelle

**Tag** (Mechanik / Kategorie):
Eine BGG-Mechanik (z. B. „Worker Placement“) oder BGG-Kategorie (z. B. „Party Game“) als eigener Datensatz mit BGG-ID, über alle Titel hinweg geteilt. Der BGG-Name bleibt unverändert; angezeigt, gefiltert und im Editor ausgewählt wird der pflegbare deutsche **Anzeigename** („Arbeitereinsatz“), ohne ihn der BGG-Name. Regeln, die auf einen Tag reagieren (z. B. Regal-Kategorien), prüfen den BGG-Namen, nie den Anzeigenamen.
_Avoid_: Mechaniken/Kategorien als freie Strings am Titel; den Anzeigenamen als Schlüssel verwenden

**Aufbewahrungseinheit**:
Ein mit QR-Code etikettiertes physisches Behältnis für Spiele — entweder ein **Karton** (`OM-BOX-0001`, wandert als Ganzes) oder ein **Regal** (`OM-SHELF-C4`, vereinseigen, wird bei Events aufgebaut). Eine Einheit kann in einer anderen stehen (Karton im Regal) und steht am Ende der Kette bei einem Meeple.
_Avoid_: Lager, Ort, Location, Box vs. Shelf als getrennte Konzepte

**Aufenthalt**:
Wo ein Spiel in einem Zeitraum war. Ziel ist entweder eine Aufbewahrungseinheit oder ein **Vereinsmitglied** (nicht mehr direkt ein Meeple, seit `docs/mitglieder-konzept.md` — ein Vereinsmitglied kann auch ohne Meeple ein Spiel halten); ein Spiel hat **immer genau einen** offenen Aufenthalt. Ausleihe, Rückgabe, Weitergabe und Umlagern sind derselbe Vorgang — einen Aufenthalt schließen und den nächsten öffnen. Welcher Vorgang ihn geöffnet hat, wird am Aufenthalt festgehalten und entscheidet, ob er als Ausleihe zählt.
_Avoid_: Standort als Feld, Borrow-Datensatz, Verleihvorgang, Aufenthaltsziel als Meeple annehmen

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
Das Vereinsmitglied, das ein Spiel direkt bei sich hat, weil es ausgeliehen wurde.
_Avoid_: Leiher, Halter, Mieter

**Verantwortliche:r**:
Oberbegriff für die Person, bei der ein Spiel gerade liegt — Ausleiher bei direkter Ausleihe, sonst der Verwahrer der Einheit über die Kette Spiel → Karton → Regal → Vereinsmitglied. Wird abgeleitet, nie gespeichert, und kann fehlen (Einheit ohne Verwahrer). Hat das haltende Vereinsmitglied ein `Meeple`, gilt das Spiel für andere Meeples als **ausgeliehen, verfügbar** (Kontakt über das Meeple-Profil sichtbar); hat es keins, als **ausgeliehen, nicht verfügbar** (kein Kontakt für andere Meeples — nur der Spielewart sieht die Vereinsmitglied-Adresse/-Telefonnummer, berechtigtes Interesse des Vereins an seinem Eigentum).
Für Vereinsmitglieder **ohne Portal-Zugang** gibt es vier Wege, wie ein Aufenthalt bei ihnen entsteht/endet: Spielewart gibt direkt an sie aus ("An extern ausgeben"), ein Meeple meldet eine Weitergabe an sie per Freitext-Name (landet vorübergehend beim Sammelkonto **Anonymer Meeple**, siehe dort, bis der Spielewart zuordnet), oder sie geben ein Spiel an einen Meeple/Spielewart zurück (einseitige Bestätigung "erhalten", kein Handshake nötig).
_Avoid_: Besitzer, Eigentümer

**Vollständigkeitsprüfung**:
Die Kontrolle, ob ein Spiel noch alle Teile hat. Ist sie fällig, trägt das Spiel ein Flag. Jede Kontrolle — **Vollständig bestätigen** oder **Mangel melden** (Unvollständig spielbar, Beschädigt, Nicht spielbar) — wird mit Zeitpunkt, kontrollierender Person und Notiz protokolliert (Kontroll-Historie, #599), setzt das Flag zurück und bestimmt den Status: **nur „Nicht spielbar" führt in Wartung**, jedes andere Ergebnis zurück in den Bestand. Der Status folgt immer der neuesten Kontrolle; ein „Mangel beheben" gibt es nicht — aus der Wartung kommt ein Spiel nur durch eine neue Kontrolle. Ein deinventarisiertes Spiel darf kontrolliert werden, bleibt aber deinventarisiert. Prüfbedürftige Spiele bleiben ausleihbar. **Jede Ausleihe** (vereinsintern, Event-Ausgabe, an extern) setzt das Flag automatisch (#563), eine Weitergabe ändert es nicht. Es bleibt gesetzt, bis der Prüfbogen ausgefüllt ist. Im Scanner (nur Spielewart, `games:manage`): **Kontrolle anfordern** setzt das Flag für ein gescanntes Spiel oder nach Rückfrage für alle Spiele direkt in einer gescannten Einheit (Unterkisten nicht). **Kontrollieren** (früher „Prüfbogen") öffnet für ein gescanntes Spiel den Prüfbogen, auch ohne gesetztes Flag (mit Hinweis). Eine gescannte Einheit listet ihre markierten Spiele auf.
_Avoid_: Inventur (Inventur meint den Durchgang durch viele Spiele), Zustandsprüfung

**Deinventarisierung**:
Ein Spiel scheidet aus dem Bestand aus (Verkauf, Verlust, Zerstörung), ohne gelöscht zu werden — mit Grund und Datum. Es behält seinen Standort, verschwindet aber standardmäßig aus allen Listen.
_Avoid_: Löschen, Archivieren, Aussortieren

**Zustand**:
Die abgeleitete Ausleih-Situation eines Spiels: **frei** (liegt in einer Einheit, unkompliziert abzuholen), **ausgeliehen** (liegt bei einem Vereinsmitglied, Abholung ggf. aufwendiger — Unterfall **verfügbar** wenn das Mitglied ein Meeple hat, sonst **nicht verfügbar**, siehe **Verantwortliche:r**), **Wartung** (letzte Vollständigkeitsprüfung „Nicht spielbar"), **nicht erfasst** (liegt in „Unsortiert"). Ausleihbar sind Spiele in allen Zuständen — auch solche, für die eine Prüfung aussteht.
_Avoid_: Verfügbarkeit, Status (Status meint die Bestandszugehörigkeit: aktiv oder deinventarisiert), Zustand für den materiellen Zustand eines Exemplars (das ist der **Mängelvermerk**, siehe unten)

**Regelheft-Sprache(n)** (`GameCopy.ruleBookLanguages`, geplant, siehe #188):
Die Sprache(n), in denen das Regelheft eines Exemplars beiliegt. **Kein Einzelwert** — viele Schachteln legen DE- und EN-Regelheft gemeinsam bei, ein Exemplar kann also mehrere Sprachen gleichzeitig haben. Enum-Werte `DE`/`EN`/`OTHER`, mehrfach zuweisbar. Unabhängig von **Sprachabhängigkeit** (siehe unten) — das eine ist "welche Sprache liegt bei", das andere "wie sehr braucht man überhaupt Text".
_Avoid_: Einzelne Sprache pro Exemplar annehmen, freier ISO-Code-String (Enum reicht für den tatsächlichen Bestand)

**Sprachabhängigkeit** (`BoardGame.languageDependence`, geplant, siehe #188):
Wie unspielbar ein Titel ohne Sprachkenntnisse ist — 5 Stufen, identisch zu BGGs `language_dependence`-Poll (von „kein notwendiger Text" bis „unspielbar in anderer Sprache"). Titel-Ebene, nicht Exemplar-Ebene (Sprachabhängigkeit ist eine Eigenschaft des Spiels, nicht der Ausgabe). Wird beim BGG-Import als Vorschlag aus dem meistgewählten Poll-Level übernommen, nie automatisch bindend (siehe **BGG-Abgleich**).
_Avoid_: Boolean "sprachneutral" (zu grob, siehe Diskussion in #188), Verwechslung mit Regelheft-Sprache(n)

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

**Scanner** (`/scan`):
Die Scan-Seite mit Modi (`?modus=`). **Einzel-Scan** (Standard): ein Spiel oder eine Einheit scannen und den passenden Vorgang wählen. **Erhalten** (`?modus=erhalten`): beliebig viele Spiele nacheinander scannen, jedes landet sofort bestätigt bei mir. Das System wählt die Buchung selbst: aus einer Einheit → Ausleihe, von einer anderen Person (auch vom Sammelkonto) → Weitergabe, mir zum Einlagern zurückgegeben → als Ausleihe übernommen, offene Übergabe an mich → bestätigt, liegt schon bestätigt bei mir → nur Hinweis. **Übergeben** (`?modus=uebergeben`, optional `&ziel=<Einheit>`): erst das Ziel festlegen (Einheiten-Etikett, persönlicher Meeple-QR oder manuelle Wahl), dann beliebig viele Spiele scannen. Ziel Einheit → Rückgabe bzw. Umlagern in die Einheit. Ziel Person → Weitergabe oder, per Umschalter, Rückgabe an die Person; per QR gescannt → sofort bestätigt, manuell gewählt → unbestätigt. Ein ausgetretenes Mitglied oder man selbst ist kein gültiges Ziel. Alternativ: Name der externen Person eintragen und „An Anonymen Meeple weitergeben" einschalten (nur mit Namen möglich) → Weitergabe aufs Sammelkonto mit dem Namen als Notiz, sofort bestätigt; der Spielewart bucht später um. Liegt ein Spiel schon beim Ziel → nur Hinweis. Ein neues Ziel während der Serie wird erst nach Rückfrage übernommen; dort lässt sich auch eine Einheit in die Ziel-Einheit einlagern (löst die frühere Einlagern-Serie ab). Ein Fehlscan wird nicht rückgängig gemacht, sondern auf der Exemplar-Seite per normaler Gegenbuchung korrigiert.
_Avoid_: Sammel-Ausleihe, Batch-Scan, Rückgängig

**Sammel-Umlagern**:
Variante des Umlagerns für den Event-Abbau: die Ziel-Einheit wird einmal gescannt, danach werden mehrere Spiele nacheinander gescannt und alle auf dieses eine Ziel gebucht, bis eine neue Ziel-Einheit gescannt wird. Bleibt fachlich ein gewöhnliches Umlagern je Spiel, nur die Scan-Reihenfolge ist umgekehrt.
_Avoid_: Batch-Umlagern, Serien-Scan als eigener Vorgang

### Event-Betrieb

**Event**:
Ein Spieletag oder eine Großveranstaltung mit Datum und Ort, von einem Admin angelegt. Eigenständig vom öffentlichen/internen ICS-Kalender-Feed — der Feed bleibt Ankündigung, das Event ist die Grundlage für Schichten, Erklärbären und Flohmarkt-Artikel. Hat eine Sichtbarkeit (`visibility`): **Entwurf** nur für `events:manage`, **Intern** zusätzlich für eingeloggte Meeples, **Öffentlich** für alle — inkl. Gäste-Bereich (`/events/[slug]/gast`) und der öffentlichen Termine-Seite (`/news`), wo Events (nicht Entwurf; Intern nur für Meeples) neben den ICS-Feed-Terminen als **nicht anklickbare Platzhalter** erscheinen, bis der erklärende Beitrag existiert (#678). Default beim Anlegen ist Entwurf.

**Helfersichtbarkeit** (`helperPhase`, #676, pro Event, kumulativ): **Planungsphase** (Default) → **Helfer gesucht** (Verfügbarkeit melden, Helferplan-Nav, Dashboard-Hinweis — auch bei einem Entwurf-Event, damit ein Admin schon vor der Freigabe rekrutieren kann) → **Bestätigung angefragt** (Zuweisungen sichtbar, Bestätigen/Ablehnen). Zurückschalten blendet nur aus, `confirmedAt` bleibt. Ändern sich Beginn oder Ende einer Buchung, wird `confirmedAt` zurückgesetzt (#683); eine Buchung außerhalb der gemeldeten Verfügbarkeit bleibt bestehen und wird im Schichtplan rot markiert (#684, nicht blockierend). Die Schalter "Schichten anfragen" und die Stammdaten-Combobox schreiben dasselbe Feld über `setEventHelperPhase`.
_Avoid_: Termin (das ist die Kalender-Ankündigung), Veranstaltung als Kalendereintrag

**Regal-Zuordnung**:
Die Angabe, welche Regale bei einem Event aufgebaut sind. Rein informativ — sie verändert keinen Aufenthalt, sondern grenzt nur ein, welche Spiele der Gäste-Bereich als „im Raum" anzeigt.
_Avoid_: Event-Standort, Event als Aufbewahrungseinheit

**Erklärbär**:
Ein Meeple mit einem dauerhaften Profil aus Spielen (Bezug auf echte `BoardGame`-Einträge) und je Spiel einer Erfahrungsstufe. Getrennt davon meldet er sich pro Event einfach als anwesend an; erst die Kombination aus Profil und Event-Anwesenheit ergibt „heute hier erklärbar".
_Avoid_: Schicht, Spielelehrer, Erklärbär als reine Event-Anmeldung ohne Profil

**Erklärer gesucht**:
Ein globales Flag am Spiel (`BoardGame.explainerWanted`), das `events:manage` setzt, wenn für dieses Spiel Erklärbären fehlen. Gilt unabhängig von Events und davon, ob schon jemand das Spiel erklärt (auch mit Erklärern möglich). Erklärbären sehen die gesuchten Spiele auf `/erklaerbaeren` (Filter „Gesucht“) und als Info-Card im Dashboard, die nur gesuchte Spiele ohne eigenes Niveau zählt. Es gibt bewusst keine gezielte Benachrichtigung. Den Eintrag des eigenen Niveaus zu entfernen lässt das Flag unberührt.
_Avoid_: Erklärer-Bedarf pro Event, Erinnerung/Push an Erklärbären

**Schicht**:
Der Bedarf an einer bestimmten Helferrolle (z. B. Küche, Ausleihe, Flohmarkt) an einem Tag eines Events: Anzahl paralleler Stellen plus admin-definierter Ziel-Zeitraum, den diese Stellen lückenlos abdecken sollen (unabhängig vom Event-Start/-Ende, wegen Auf-/Abbau außerhalb der eigentlichen Veranstaltungszeit). Mitglieder melden pro Tag Verfügbarkeit + gewünschte Rollen; Admins weisen im Schichtplan-Editor jeder Zusage einen eigenen, individuell verschiebbaren Zeitblock zu (`ShiftBooking`). Wer gerade in einem solchen Zeitblock steckt, erhält für dessen Dauer die Rechte, die seine Rolle hinterlegt hat (z. B. Flohmarkt-Kasse), unabhängig von einer sonst vergebenen Permission — siehe [ADR-0012](adr/0012-helferrolle-generalisiert-schicht-buchung-rechte.md).
_Avoid_: Erklärbär als Schicht, festes Schicht-Typ-Enum, ein geteiltes Zeitfenster für alle Zuweisungen einer Rolle

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

**Want to Play** (`GameWantToPlay`):
Ein Titel, den ein Meeple spielen möchte — eine einzige Quelle für „Das möchte ich spielen" auf dem Profil und „Meeple möchten das spielen" auf der Spieledetailseite. Entsteht manuell („Ich will das auch spielen") oder per BGG-Import, wenn der Meeple `importWantToPlay` eingeschaltet hat (Opt-in, Default aus). Der Import nimmt **alle** Want-to-Play-Titel der BGG-Liste, auch ohne Besitz, und fügt nur hinzu — er entfernt nie etwas. Jeder Eintrag ist für eingeloggte Meeple sichtbar, ohne weitere Freigabe. Getrennt vom Besitz-Import (`PrivateGameCollectionEntry`), der die Sammlung bei jedem Lauf überschreibt. Nach Anonymisierung Stufe 1 gelöscht.
_Avoid_: Wunschliste/„wishlist"/„want to buy" von BGG (werden ignoriert), `wantToPlay`-Flag am Privatbesitz-Eintrag (entfernt)

**Katalogtitel / Stub** (`BoardGame` ohne Beschreibung und Spielerzahl):
Ein Titel, der nur aus einem Want-to-Play-Import stammt: Titel, Bild, Jahr und Durchschnittsbewertung, sonst nichts (`isCatalogStub()`, Heuristik — das Bild zählt nicht). Liegt im selben Katalog wie jeder andere Titel, damit eine Detailseite nur eine Quelle hat. Hat weder Vereins- noch Privatexemplar, taucht daher in keiner Ludothek-Übersicht, Auswahl oder Statistik des Bestands auf (`IN_INVENTORY_WHERE`); nur eingeloggte Meeple sehen eine abgespeckte Katalogseite, solange der Titel Want-to-Play-Einträge hat. Vollständige BGG-Daten bekommt der Titel, sobald eine Person oder der Verein ihn besitzt (`findOrCreateBoardGameTitle()` wertet den Stub dann auf). Die Duplikat-Warnung beim Anlegen eines Vereinsspiels zählt einen Stub nicht als echtes Duplikat.
_Avoid_: eigene Tabelle für Want-to-Play-Titel (bewusst nicht: zwei Quellen für Detailseiten)

**Privatbesitz-Eintrag** (`PrivateGameCollectionEntry`):
Ein Titel, den ein Mitglied privat besitzt und nicht im Vereinsbestand geführt wird — Grundlage der Crowdsourced-Suche in der internen Ludothek, sowie für Spielergesuche und informelles privates Ausleihen zwischen Mitgliedern **außerhalb** jeder Vereins-Nachverfolgung (kein `GameHolding`, keine Statistik). Referenziert seit ADR 0008 denselben Titel-Datensatz (`BoardGame`) wie der Vereinsbestand, sofern die `bggId` übereinstimmt; es entsteht dabei **kein** Exemplar (`GameCopy`) — Privatbesitz kennt keine Exemplare, nur Vereinsbestand hat Standort/Zustand. Entsteht **ausschließlich** durch echten Sync mit dem eigenen BGG-Konto des Mitglieds (`syncedAt`, Pflichtfeld) — kein manueller Eintrag ohne BGG-Konto. Aktuell ausschließlich per Seed befüllt (zwei Demo-Mitglieder); der echte Sync war an der aus dieser Umgebung zuvor blockierten BoardGameGeek-API gescheitert (siehe `.claude/plans/phase-7-marktplatz-community-execution-plan.md`) — der Blocker ist mit dem BGG-Bearer-Token (#12) inzwischen behoben, der echte Sync selbst aber noch nicht umgesetzt. Erscheint in der internen Ludothek-Suche nur nach explizitem Toggle „Auch Privatbesitz anzeigen" (Default aus) und **nie** in der öffentlichen Projektion.
_Avoid_: Exemplar für Privatbesitz (Privatbesitz hat kein `GameCopy`), manueller Eintrag ohne BGG-Sync (bewusst nicht vorgesehen)

**Private Event-Ausleihe** (`PrivateEventLoan`, #122):
Ein Mitglied gibt einen Titel aus der eigenen `PrivateGameCollectionEntry` explizit für ein bestimmtes Event zur Ausleihe frei — die Event-Anmeldung (z. B. als Erklärbär) allein reicht dafür nicht. Bewusst kein `GameCopy`-Klon: kein Standort, keine `GameHolding`-Kette, keine Zustandsverwaltung — nur drei Zustände (angeboten/ausgeliehen/zurückgegeben). Ausgabe/Rückgabe läuft über dieselbe Ausleihe-Schicht-Berechtigung wie beim Vereinsbestand (`/ausleihe`, siehe #121). Haftungsfragen bei Verlust/Schaden sind bewusst nicht Teil dieses Modells, siehe #277.
_Avoid_: `GameHolding` (das ist Vereinsbestand-Nachverfolgung mit Standort), `PrivateGameCollectionEntry` (das ist der Besitz-Eintrag selbst, nicht die Event-Freigabe)

### Newsletter

**Entwurf**:
Ein Beitrag mit `status: DRAFT` — sichtbar nur im Redaktionsbereich, nie öffentlich oder intern, löst kein Instagram-Cross-Posting und keinen Newsletter-Versand aus. Erst „Absenden" (Status `PUBLISHED`) macht ihn sichtbar und löst beides ggf. aus.
_Avoid_: unveröffentlichter Beitrag, Vorschau

**Beitragsbild**:
Ein per Upload im Beitrags-Editor eingebettetes Bild (`PostImage`), im Body als `![Alt](/api/blog-images/<id>)` referenziert. Es ist genau so sichtbar wie sein Beitrag (intern nur mit `news:internal:view`, Entwurf nur für Redaktion) und wird mit dem Beitrag gelöscht. Im Newsletter als Anhang eingebettet, auf Instagram Teil eines Karussells (Cover zuerst, max. 10). Nicht das **Cover-Bild** (`Post.coverImageUrl`).
_Avoid_: Anhang, Blog-Foto

**Newsletter-Abonnent**:
Ein Eintrag mit E-Mail-Adresse, Kategorien und Bestätigungsstatus — entweder anonym über das öffentliche Formular (braucht Double-Opt-in) oder über den Profil-Toggle eines Meeples (bereits authentifiziert, kein Double-Opt-in nötig). Eine gemeinsame Tabelle für beide Quellen, verknüpft über ein optionales `meepleId`-Feld.
_Avoid_: Newsletter-Kontakt (kein Fremdsystem, reine Portal-Tabelle), Mitglied (ein Abonnent muss kein Meeple sein)

**Newsletter-Kategorie**:
Termine, News, Turniere oder Berichte zu vergangenen Events — das Abonnenten-Interesse, entkoppelt vom `PostType` eines Beitrags (Inhalts-Klassifikation). Ein Beitrag bekommt beim Anlegen eine Default-Kategorie aus seinem Typ, bleibt aber überschreibbar.
_Avoid_: PostType (das ist die Inhalts-Klassifikation, nicht das Abonnenten-Interesse)
