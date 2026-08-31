# Mitgliederkonzept: Vereinsmitgliedschaft, Meeple, Einladungen

> Ersetzt die bisherige 1:1-Verschmelzung von Vereinsmitgliedschaft und Meeple-Profil ([ADR 0013](adr/0013-vereinsmitglied-getrennt-von-meeple.md), löst [ADR 0002](adr/0002-meeple-eins-zu-eins-zum-login.md) ab). Vokabular siehe `CONTEXT.md`.

## 1. Datenmodell

Drei getrennte Bereiche mit unterschiedlichen Eigentümern und Zugriffsrechten:

1. **Vereinsmitgliedschaft** — administrative Verwaltung durch den Vorstand.
2. **Meeple-Profil** — Selbstdarstellung und Interaktion, vom Mitglied selbst gepflegt.
3. **Benutzerkonto (Neon Auth)** — reiner Login, unverändert gegenüber heute.

### 1.1 Vereinsmitglied

Eigene DB-Tabelle, eigenes Akkordeon unter `/admin/mitglieder`. Enthält die Daten, die für eine aktive Mitgliedschaft zwingend nötig sind und **nicht gelöscht werden dürfen, solange die Person Mitglied ist**: Mitgliedsnummer, Name, Vorname, Geburtsdatum, Geburtsort, Straße, PLZ, Wohnort, Telefon, E-Mail (eindeutig, `@unique` — auch Grundlage für Login-Zuordnung), Beitrag, IBAN. Die genaue Pflichtfeld-Liste ist beim Vorstand angefragt und steht noch aus; oben genannte Felder sind der Arbeitsstand nach Mitgliedsantrag.

**Bis die Vorstandsantwort da ist, sind Name, Vorname, Geburtsdatum, Geburtsort, Straße, PLZ, Wohnort und Telefon `nullable`.** Nur Mitgliedsnummer und E-Mail sind von Anfang an Pflicht (technische Notwendigkeit, kein Vorstandsentscheid). Fehlende Werte werden **nicht** mit Platzhaltern befüllt (kein Fake-Geburtsdatum) — der Vorstand trägt sie über die neue Admin-UI nach; eine Beitragsart-Ableitung ohne Geburtsdatum bleibt bis dahin schlicht unbestimmt.

Nur vom Vorstand änderbar (IBAN exklusiv vom Kassenwart, siehe [3.2](#32-bankverbindung)) — Ausnahme die E-Mail-Adresse, die das Meeple selbst per Änderungsantrag anstoßen kann (siehe [3.3](#33-e-mail-änderungen)).

**Beitrag**: Kein Betrag wird im Portal verwaltet — das Portal zeigt nur die Beitrags*art*, das eigentliche Geld läuft vollständig über den Kassenwart. Die Art ergibt sich aus dem Geburtsdatum:

| Beitragsart | Anzeige-Kategorie | Bedingung | Betrag |
| --- | --- | --- | --- |
| Ermäßigter Kinderbeitrag | MiniMeeple | Alter < 13 | 0 € |
| Ermäßigter Jugendbeitrag | JungMeeple | Alter 13–18 | 12 € |
| Einzelbeitrag | Meeple | Alter > 18 | 36 € |
| Selbstgewählt | Meeple | `selbstgewaehlterBeitrag` gesetzt | frei (> 36 €) |

Ist `selbstgewaehlterBeitrag` (`Decimal?`) gesetzt, gilt dieser Wert unabhängig vom Alter; sonst entscheidet ausschließlich das Geburtsdatum. Ist `birthDate` (noch) nicht erfasst und kein `selbstgewaehlterBeitrag` gesetzt, bleibt die Beitragsart **unbestimmt** (kein Rateversuch, keine Anzeige einer Kategorie).

Die Anzeige-Kategorien **Meeple** (Einzel-/Selbstgewählter Beitrag), **JungMeeple** (Jugendbeitrag) und **MiniMeeple** (Kinderbeitrag) sind reine Darstellungslabels für die Infocard-Aufteilung (siehe [6.1](#61-adminmitglieder)) — keine eigenen Datenmodell-Entitäten, nicht mit dem Kern-Begriff "Meeple" (dem Portal-Profil) verwechseln.

Optional referenziert ein Vereinsmitglied ein `Meeple` (`meepleId`, nullable) — nie umgekehrt verpflichtend.

**Vereinsmitgliedschafts-Zustand** wird abgeleitet, nie gespeichert:

| Zustand | `meepleId` | `resignedAt` | `membershipEndsAt` | `Meeple.anonymizedAt` |
| --- | --- | --- | --- | --- |
| Unregistriert | nicht gesetzt | nicht gesetzt | – | – |
| Registriert | gesetzt | nicht gesetzt | – | – |
| Gekündigt | *(egal)* | gesetzt | in der Zukunft | – |
| Ausgetreten | *(egal)* | gesetzt | in der Vergangenheit | – |
| Anonymisiert | *(egal)* | *(egal)* | *(egal)* | gesetzt |

Sobald `resignedAt` gesetzt ist, entscheidet nur noch das Datum zwischen Gekündigt und Ausgetreten — `meepleId` spielt dann keine Rolle mehr. `anonymizedAt` sticht alle anderen Felder: sobald gesetzt, ist der Zustand immer Anonymisiert, unabhängig davon, was `resignedAt`/`membershipEndsAt` sagen.

**Warum Anonymisiert ein eigener, fünfter Zustand bleibt** statt in "Unregistriert" aufzugehen (Stufe-2-Anonymisierung trennt `Vereinsmitglied.meepleId`, siehe [4](#4-datenschutz-anonymisierung-loeschung)): erstens für Statistiken (Unregistriert = "braucht noch eine Einladung", Anonymisiert = "war mal Mitglied, jetzt Historie" — fachlich verschiedene Dinge, die dieselbe Zahl verfälschen würden). Zweitens bleibt `Vereinsmitglied.email` bis zur Stufe-3-Löschung (12 Monate nach `membershipEndsAt`) erhalten, auch wenn das Meeple-Profil bereits anonymisiert/getrennt ist — Kontaktaufnahme (z. B. für Feedback) bleibt darüber möglich, obwohl kein Portal-Profil mehr existiert.

### 1.2 Meeple

Registrierte Vereinsmitglieder referenzieren zwingend genau ein Meeple. Meeple bleibt das interne Profil für optionale Selbstdarstellungs- und Interaktionsdaten (Kontaktmöglichkeiten, Spielesammlung, LFG, Marktplatz) — alles darin darf das Meeple selbst bearbeiten und löschen.

Die IBAN wandert vollständig von Meeple zu Vereinsmitglied (siehe [3.2](#32-bankverbindung)).

**Ausnahmen von der Vereinsmitglied-Referenz** — bewusst zugelassen:

- **Systemkonto**: Meeple ohne Vereinsmitglied-Referenz, aber mit Login. Für Sammel-/Funktionskonten (z. B. Kassenzugang Flohmarkt). Angelegt von `admin:access` über einen Button "Systemkonto anlegen" oberhalb der Meeple-Tabelle — legt `Meeple` **und** den Neon-Auth-User in einem Schritt an, kein Einladungs-Umweg (Details in [2.2](#22-systemkonto-anlegen)).
- **Anonymes Konto**: Meeple ohne Vereinsmitglied-Referenz *und* ohne Login. Entsteht ausschließlich durch harte Anonymisierung (Stufe 2/3, siehe [4](#4-anonymisierung-3-stufen)) und dient nur der lesbaren Historie (Aufenthalte, Gesuche). Einbahnstraße — ein anonymes Konto bekommt nie wieder ein Login. Erscheint deshalb in keiner Auswahlliste/keinem Formular mehr, in dem ein Meeple ausgewählt werden kann (Filter auf `anonymizedAt: null`).
  Ein einziges, dauerhaftes **Sammelkonto "Anonymer Meeple"** ist ein Sonderfall davon: kein Login, keine Vereinsmitglied-Referenz, aber bewusst als **Platzhalter für ungeklärte externe Interaktionspartner** angelegt (nicht aus einer echten Anonymisierung entstanden, kein `anonymizedAt`). Trägt denselben generischen Displaynamen wie echte anonymisierte Alt-Meeples — das ist gewollt (zusätzliche Anonymität für ausgeschiedene Mitglieder): für jeden außer `games:manage` sind beide identisch "Anonymer Meeple", nicht unterscheidbar (#364), und beide ohnehin aus jeder Auswahlliste ausgeblendet. Nur `games:manage` sieht bei einem **echten** anonymisierten Alt-Meeple zusätzlich einen 6-stelligen Hex-Suffix, aus dessen Meeple-ID abgeleitet (kein Jahresbezug, kein Zähler — bewusst keine Nummerierung, siehe Kollisionsanalyse im Issue), z. B. "Anonymer Meeple #a3f9c2" — für die Klärung ungeklärter Ludothek-Übergaben (siehe [5](#5-spiel-ausleihe)). Das Sammelkonto selbst bekommt nie einen Suffix, unabhängig vom Betrachter.

### 1.3 Benutzerkonto (Neon Auth)

Unverändert. Login bleibt an Meeple gekoppelt. Wichtig für den Rest dieses Dokuments: Neon Auth führt eine eigene `email`-Spalte, unabhängig von `Meeple.email` — ein Meeple ohne eigenes `email`-Feld kann trotzdem ein funktionierendes Login haben.

## 2. Einladungen & Kontoerstellung

Einladungen werden nicht mehr manuell/ungebunden erstellt (der bisherige, mehrfach einlösbare Invite ohne E-Mail-Bindung entfällt ersatzlos — auf ausdrücklichen Vorstandswunsch). Jede verbleibende Einladung ist E-Mail-gebunden und genau einmal einlösbar; E-Mail + Token bilden zusammen den Schlüssel beim Einlösen. Systemkonten laufen seit der Korrektur unten **gar nicht mehr** über den Invite-Mechanismus — nur Mitgliedseinladungen tun das noch.

### 2.1 Mitgliedseinladung

Wird aus einem `Vereinsmitglied`-Datensatz heraus erstellt ("Einladung erstellen/verlängern"-Button in der Vereinsmitglieder-Tabelle, erfordert `invites:manage`). Die Einladung übernimmt die E-Mail des Vereinsmitglieds als Versandziel. Bei Einlösung entsteht automatisch ein neues, leeres `Meeple` (Displayname vorbefüllt aus Vor-/Nachname), das sofort mit dem Vereinsmitglied verknüpft wird — analog zum bisherigen Verhalten ("Meeple entsteht beim ersten Login").

### 2.2 Systemkonto anlegen

**Kein Invite-Mechanismus** — das Systemkonto ist beim Anlegen bereits vollständig fertig, die Einladung würde nur eine unnötige Zwischenstufe schaffen (in der ein Meeple ohne Vereinsmitglied und ohne Login strukturell nicht von einem Anonymen Konto unterscheidbar wäre).

Button oberhalb der Meeple-Tabelle, erfordert `admin:access`. Popup fragt E-Mail-Adresse **und** Displayname ab. Der Server-Vorgang legt in einem Schritt an:

1. den Neon-Auth-User über `auth.admin.createUser({ email, name })` (offizielle Admin-API von `@neondatabase/auth`/better-auth — kein Raw-SQL wie im Seed-Script),
2. das `Meeple` mit dem vorgegebenen Displaynamen, sofort verknüpft mit dem neuen `neonAuthUserId`, ohne Vereinsmitglied-Referenz,
3. einen Passwort-Reset-Link an die angegebene E-Mail (`auth.requestPasswordReset()`, baut auf dem "Passwort vergessen"-Flow auf, siehe #324) — der Link dient ausschließlich dazu, ein erstes Passwort zu setzen, nicht der Kontoerstellung selbst.

### 2.3 E-Mail-Änderung bei offener Einladung

Betrifft nur Mitgliedseinladungen ([2.1](#21-mitgliedseinladung)) — Systemkonten haben seit [2.2](#22-systemkonto-anlegen) keine Einladung mehr. Ändert der Vorstand die E-Mail-Adresse eines Vereinsmitglieds, während eine Einladung für dieses Mitglied noch offen ist, wird die Einladung **nicht** automatisch angepasst (kein Kaskadieren — der Doppelschlüssel E-Mail+Token soll sich nicht unbemerkt verschieben). Stattdessen erscheint ein Popup: *"Es existiert eine offene Einladung. Diese widerrufen und neu erstellen?"*

### 2.4 Gültigkeitsdauer

Statt einer pro Einladung wählbaren Gültigkeitsdauer gibt es eine globale Einstellung auf `/admin/einstellungen` ("Gültigkeitsdauer für Einladungen", Default 7 Tage, sichtbar nur mit `invites:manage`). Sie gilt für **alle** (verbleibenden, d. h. Mitglieds-) Einladungen ohne Override-Möglichkeit beim Erstellen.

## 3. Weitere Prozesse

### 3.1 Account löschen

Ein Meeple kann unabhängig vom Vereinsmitgliedschaftsstatus jederzeit sein Benutzerkonto löschen — das ist Anonymisierungsstufe 2 (siehe [4](#4-anonymisierung-3-stufen)), ausgelöst durch das Meeple selbst statt durch den Jahreswechsel-Cron. Der Vereinsmitglied-Datensatz bleibt davon unberührt. Ausgeliehene Spiele verlieren dadurch ihre Kontaktmöglichkeit und gelten fortan als "nicht verfügbar" (siehe [5](#5-spiel-ausleihe)).

### 3.2 Bankverbindung

IBAN wird nie direkt vom Meeple überschrieben, sondern nur als Änderungsantrag eingereicht. Ein neuer Antrag ersetzt automatisch einen noch offenen (immer nur der zuletzt eingereichte zählt). Freigabe ist ausschließlich Sache des Kassenwarts — erst mit Freigabe wird die aktive IBAN des Vereinsmitglieds ersetzt. Für aktive Vereinsmitglieder ist ein Löschen der Bankdaten ohne Ersatzwert nicht möglich, nur ein Ändern.

Der Kassenwart kann einen Antrag auch **ablehnen** (Pflichtgrund als Freitext) — das löst automatisch eine Mail mit dem Ablehnungsgrund an das Meeple aus, statt den Antrag stillschweigend liegen zu lassen.

### 3.3 E-Mail-Änderungen

Ein Meeple hat bis zu drei verschiedene E-Mail-Adressen, jede änderbar, aber mit unterschiedlichem Ablauf:

- **Login-E-Mail** (Neon Auth, siehe [1.3](#13-benutzerkonto-neon-auth)) und **Profil-Kontakt-E-Mail** (`Meeple.email`, siehe [1.2](#12-meeple)): direkt vom Meeple änderbar, keine Freigabe nötig. Die Änderung greift erst nach Klick auf einen Bestätigungslink, der an die **neue** Adresse geschickt wird (Verifizierung, dass diese Adresse wirklich der Person gehört und erreichbar ist).
- **Vereinsmitglied-E-Mail** (`Vereinsmitglied.email`, siehe [1.1](#11-vereinsmitglied)): läuft wie die IBAN als **Änderungsantrag** (siehe [3.2](#32-bankverbindung)) — der Bestätigungslink verifiziert nur, dass die neue Adresse erreichbar ist, ersetzt aber nicht die Freigabe durch den Vorstand. Erst wenn beides vorliegt (Link geklickt **und** Vorstand freigegeben), wird die aktive `Vereinsmitglied.email` ersetzt. Ein neuer Antrag ersetzt automatisch einen noch offenen, analog zur IBAN — inklusive **Ablehnen** mit Pflichtgrund und automatischer Mail an das Meeple.

### 3.4 Kündigen

Verträge laufen immer bis zum Ende des Kalenderjahres, Kündigungsfrist 4 Wochen (siehe #258, löst den bisherigen Widerspruch zur reinen Stichtagsregel auf). `membershipEndsAt` wird so berechnet: Kündigung geht ein → wirkt zum nächsten 31.12., **außer** das wären weniger als 4 Wochen ab Kündigungseingang — dann wirkt sie erst zum übernächsten 31.12. Die Mitgliedschaft läuft bis dahin unverändert weiter, das Portal bleibt regulär nutzbar; erst mit Erreichen von `membershipEndsAt` gilt die Kündigung als vollzogen.

In den letzten 31 Tagen der Mitgliedschaft erscheint im Dashboard eine Warnung mit der Aufforderung, ausgeliehene Spiele rechtzeitig zurückzugeben (inkl. Kontaktmöglichkeiten für die Rückgabe).

Nach Ablauf der Mitgliedschaft (`membershipEndsAt` erreicht) gilt die Person als **Ausgetreten**: Login bleibt möglich, Zugriff beschränkt sich aber aufs Abwickeln — eigenes Profil, eigene Bestände, Rückgabe und Weitergabe, Kalender, Mitgliederverzeichnis. Ludothek, interne News und Spielergesuche sind gesperrt, annehmen darf die Person nichts mehr.

Technisch ist "Ausgetreten" eine echte `Role` mit eigenem Rechte-Satz, aber nie manuell zuweisbar. Da alle Mitgliedschaften zum selben festen Datum enden, genügt ein einziger jährlicher Cron-Job (2.1., 02:00), der die Rolle für alle betroffenen Vereinsmitglieder in einem Rutsch setzt.

**Voraussetzung, die noch fehlt:** Ein echter, granularer Rechte-Satz für "Ausgetreten" braucht zuerst einen Permission-Katalog für reguläre Meeple-Funktionen (z. B. `ludothek:view`, `news:internal:view`, `lfg:participate`), gebunden an die bestehende Standardrolle "Meeple" — heute ist "eingeloggter Meeple ohne Sonderrolle" weitgehend ein impliziter Zustand ohne granulare Rechte. Zusätzlich braucht es Mehrfachrollen pro Meeple (strukturell in `UserRole` schon möglich, `setMeepleRole` erzwingt aber noch genau eine Rolle) — deckt sich mit dem bereits offenen #264. Beides ist ein eigenes, dieser Migration vorgeschaltetes Arbeitspaket.

## 4. Anonymisierung (3 Stufen)

DSGVO Art. 17 wird in drei aufeinander aufbauenden Stufen umgesetzt — jede vorherige ist Voraussetzung der nächsten:

**Stufe 1 — DSGVO-Löschung optionaler Daten.** Alle optionalen Meeple-Daten (Kontaktmöglichkeiten, importierte Spiele, LFG, Marktplatzangebote etc.) werden gelöscht, der Displayname wird generisch überschrieben. Login bleibt aktiv, das Konto bleibt voll funktionsfähig. Auslösbar vom Meeple selbst oder von Vorstand/Datenschutzbeauftragtem (Recht `members:manage`). Der Vereinsmitglied-Datensatz bleibt während aktiver Mitgliedschaft komplett unberührt.

**Stufe 2 — Kontodeaktivierung und Trennung.** Zusätzlich zu Stufe 1 wird das Login-Konto deaktiviert/gelöscht und die Verbindung zwischen Vereinsmitglied und Meeple endgültig getrennt (keine Wiederherstellung möglich). Zwei Auslöser:

- **Selbst-Kontolöschung** (jederzeit, unabhängig vom Mitgliedschaftsstatus, siehe [3.1](#31-account-löschen)).
- **Automatisch durch den Jahreswechsel-Cron** (2.1., 02:00) für alle zu diesem Zeitpunkt bereits Ausgetretenen ohne offene Ausleihen.

Wer zum Cron-Zeitpunkt Ausgetreten ist, aber noch offene Ausleihen hat, wird **nicht** automatisch verarbeitet — kein fortlaufender Hintergrund-Check bei jeder Rückgabe. Stattdessen erscheint eine Warn-Infocard im Admin-Dashboard für alle Meeples mit `members:manage` oder `games:manage`; die klären den Verbleib der Spiele und starten Stufe 2 danach manuell.

**Stufe 3 — Löschung des Vereinsmitglieds.** 12 Monate nach `membershipEndsAt` **und** keine offenen Ausleihen mehr (beide Bedingungen), wird der `Vereinsmitglied`-Datensatz selbst **gelöscht**, nicht überschrieben — der anonymisierte Meeple-Rest bleibt für die Historie bestehen. Da Mitgliedschaften immer zum Jahreswechsel enden, fällt "12 Monate nach `membershipEndsAt`" ebenfalls immer auf einen 31.12. — derselbe jährliche Cron prüft deshalb Stufe 2 und Stufe 3 in einem Rutsch (Stufe 2 für die diesjährig, Stufe 3 für die vorjährig Ausgetretenen). Auch hier gilt bei offenen Ausleihen: keine automatische Löschung, sondern Warn-Infocard plus manueller Start durch alle Meeples mit `members:manage` oder `games:manage`.

**Sammel-Mail statt Einzelmails.** Fälle mit offenen Ausleihen (Stufe 2 und Stufe 3 zusammen) werden nicht einzeln, sondern in **einer** gemeinsamen Mail an alle Meeples mit `members:manage` oder `games:manage` gemeldet — ein Abschnitt je Stufe, ein Mailversand pro Cron-Lauf.

## 5. Spiel-Ausleihe

Der Verein hat ein berechtigtes Interesse daran, sein Eigentum (die Spiele) wiederzufinden — eine Standortverfolgung ist dafür DSGVO-konform. Eine dauerhafte Historie realer Identitäten würde diese Verhältnismäßigkeit aber überschreiten (Art. 5, Datenminimierung).

Deshalb referenziert ein Spiel-Aufenthalt (`GameHolding`) künftig ein **Vereinsmitglied**, nicht mehr direkt ein Meeple — ein Vereinsmitglied kann also auch ohne eigenes Meeple ein Spiel halten. Daraus ergeben sich zwei Sichten auf dieselbe Ausleihe:

- **Hält ein Meeple** das Spiel (das haltende Vereinsmitglied hat eine Meeple-Referenz): Kontaktmöglichkeiten stehen anderen Meeples offen, das Spiel gilt als **"Ausgeliehen, verfügbar"**.
- **Hält ein Vereinsmitglied ohne Meeple** das Spiel: keine Kontaktmöglichkeiten für andere Meeples, das Spiel gilt als **"Ausgeliehen, nicht verfügbar"**.

In beiden Fällen sieht ausschließlich der **Spielewart** die privaten Kontaktdaten und Adresse des haltenden Vereinsmitglieds, um sich im Zweifel direkt nach dem Verbleib des Spiels zu erkundigen.

### 5.1 Interaktion mit Vereinsmitgliedern ohne Portal-Zugang

Zwei Probleme kommen zusammen: (1) ein Vereinsmitglied ohne Meeple hat keinen Portal-Zugang und kann keine Ausleih-Aktion selbst auslösen, (2) ein Meeple darf die `Vereinsmitglied`-Tabelle aus DSGVO-Gründen nicht durchsuchen (Klarnamen/Adressen aller Mitglieder wären sonst für jeden einsehbar). Vier Szenarien, je mit eigenem Weg:

- **(a) Vereinsmitglied holt Spiel beim Spielewart ab.** Ein Meeple mit `games:manage` bekommt die Zusatzfunktion "An extern ausgeben" — führt den regulären Ausleihe-Vorgang durch, wählt das Ziel aber aus der `Vereinsmitglied`-Tabelle statt der `Meeple`-Tabelle.
- **(b) Vereinsmitglied holt Spiel bei einem Meeple ab.** Der abgebende Meeple kann die Zielperson nicht selbst in der Vereinsmitglied-Tabelle nachschlagen. Stattdessen: Aktion "An extern weitergegeben" mit einem **Freitextfeld** für den Namen. Das schließt sofort den eigenen Aufenthalt und öffnet einen neuen auf dem Sammelkonto **"Anonymer Meeple"** (siehe [1.2](#12-meeple)) — der vorherige Halter bleibt über die Aufenthalt-Historie nachvollziehbar. Der Spielewart sieht die Anfrage (Freitext-Name + wer abgegeben hat) und ordnet sie bei Gelegenheit einem echten `Vereinsmitglied` zu, indem er den Aufenthalt manuell umbucht. Solange das nicht passiert ist, ist nichts falsch zugeordnet (nur ungeklärt) — es gibt deshalb bewusst **keinen** Ablehnen-/Zurückweisen-Pfad, der Spielewart kann sich beliebig Zeit lassen.
- **(c) Vereinsmitglied gibt Spiel an einen Meeple zurück/weiter.** Keine Historie auf der externen Seite nötig — der empfangende Meeple bestätigt einfach "Ich habe das Spiel erhalten", das schließt den Aufenthalt beim Vereinsmitglied und öffnet einen neuen auf dem Meeple. Kein zweiseitiger Bestätigungs-Handshake wie zwischen zwei Meeples (die externe Seite hat ja keinen Zugang, der bestätigen könnte).
- **(d) Vereinsmitglied gibt Spiel an den Spielewart zurück.** Analog zu (c), nur direkt in eine Aufbewahrungseinheit statt an einen Meeple — regulärer Rückgabe-Vorgang mit `games:manage`.

Aus (b) folgt: Alle **echten** anonymisierten Alt-Meeples werden aus jedem Auswahl-Picker gefiltert (siehe [1.2](#12-meeple)), damit sie nicht versehentlich als Ziel für "extern weitergegeben" oder sonst eine Aktion erscheinen. Nur das eine dauerhafte Sammelkonto "Anonymer Meeple" ist als Übergangsziel vorgesehen, nie als wählbares Formular-Ziel für Nutzer:innen.

## 6. Darstellung

Alle Tabellen unten haben ein Suchfeld und fallweise passende Filter.

### 6.1 `/admin/mitglieder`

Geschützt durch `members:manage`. Kopfbereich mit Infocards (jede verlinkt in die passenden Akkordeons, öffnet sie bei Bedarf und setzt ggf. Filter), darunter mehrere Akkordeons. Akkordeon-Header zeigen ein Badge in Akzentfarbe mit der Anzahl der Datensätze.

Die Infocard "Aktive Mitglieder" gliedert zusätzlich nach Beitragsart-Kategorie ([1.1](#11-vereinsmitglied)): **Meeple** (Einzel-/Selbstgewählter Beitrag), **JungMeeple** (Jugendbeitrag), **MiniMeeple** (Kinderbeitrag) — jeweils mit eigener Zahl, Klick filtert die Vereinsmitglieder-Tabelle auf diese Kategorie.

**Rollen** (default zu): unverändert, zusätzlich ein neues Recht zur Bearbeitung der Rollen selbst.

**Einladungen** (default zu, sichtbar nur mit `invites:manage`): Ansicht zum Verlängern/Widerrufen bleibt erhalten. Die separate Ansicht "Neues Mitglied einladen" entfällt ersatzlos — Einladen passiert jetzt ausschließlich aus der Vereinsmitglieder-Tabelle heraus.

**Vereinsmitglieder** (default auf): Mitgliedsnummer, voller Name, Beitrittsdatum, Austrittsdatum, Zustand, **Beitragsart**, Link zum Meeple-Profil *oder* Einladen/Verlängern-Button (erfordert `invites:manage`), Button "Kündigung vermerken"/"Kündigung widerrufen", Button "Anonymisieren".

**Meeple-Tabelle** (default zu): Displayname, Rollen (Badges), Status (Aktives Mitglied, Gekündigt, Anonymisiert), Beigetreten am, Button "Kündigung vermerken". Oberhalb: "Systemkonto anlegen"-Button (`admin:access`, siehe [2.2](#22-systemkonto-anlegen)).

### 6.2 `/admin/einstellungen`

Neue Einstellung "Gültigkeitsdauer für Einladungen" (siehe [2.4](#24-gültigkeitsdauer)), sichtbar nur mit `invites:manage`.

## 7. Querverweise

**Kontaktmöglichkeiten** beziehen sich immer nur auf ein Meeple. Ein Meeple ohne eingetragene Kontaktmöglichkeiten ist nicht kontaktierbar — im Dashboard erscheint dazu eine Warnung, die als wiederverwendbare Komponente auch in den Dialogen für LFG, Marktplatzangebot und Ersatzteilspende erscheinen muss, sobald dieses Meeple dort etwas anlegt.

**Eingeschränkter Zugriff**: Die Ausgetreten-Rolle (siehe [3.4](#34-kündigen)) braucht durchgängige Permission-Gates — praktisch jedes Element im Portal muss ein Recht tragen, das einem regulären Meeple zugewiesen ist, damit die Ausgetreten-Rolle gezielt weniger davon bekommen kann.

## 8. Verwandte, bereits offene Issues

- **#258** — Kündigungsfrist-Regel, aufgelöst durch [3.4](#34-kündigen) (Stichtag + 4-Wochen-Mindestvorlauf)
- **#264** — Mehrfachrollen-Konzept, Voraussetzung für den Rechte-Katalog hinter der Ausgetreten-Rolle ([3.4](#34-kündigen))
- **#324** — "Passwort vergessen"-Flow, Voraussetzung für die Systemkonto-Erstellung ([2.2](#22-systemkonto-anlegen))
