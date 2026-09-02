---
status: accepted
---

# Vereinsmitglied getrennt von Meeple

`Meeple` ist nicht länger 1:1 die Vereinsmitgliedschaft ([ADR 0002](0002-meeple-eins-zu-eins-zum-login.md), damit superseded). Eine neue `Vereinsmitglied`-Tabelle trägt die administrativen Stammdaten (Mitgliedsnummer, Name, Geburtsdatum, Adresse, Beitrag, IBAN) und existiert unabhängig von einem Portal-Konto; `Meeple` bleibt das Selbstdarstellungs- und Login-Profil. Beide referenzieren sich nur noch optional gegenseitig. Grund: der Vorstand muss Mitglieder verwalten können, die nie ein Portal-Konto hatten oder deren Konto längst weg ist (DSGVO-Anonymisierung, Art. 17), ohne dass die Mitgliedschaft selbst — und damit z. B. ausstehende Beiträge oder verliehene Vereinsspiele — aus dem Blick gerät. Details siehe `docs/mitglieder-konzept.md`.

## Considered Options

- **Bei der 1:1-Verschmelzung bleiben, nur mehr Felder ergänzen**: vermeidet eine zweite Tabelle, verletzt aber die in ADR 0002 selbst schon erkannte Grenze — sobald Mitglieder ohne Konto (unregistriert, ausgetreten+anonymisiert, Systemkonten) real vorkommen müssen, braucht es zwingend ein zweites Personenmodell. Verworfen, weil genau dieser Fall jetzt eintritt.
- **Getrennte Tabellen, aber verpflichtende 1:1-Beziehung** (jedes Vereinsmitglied hat zwingend ein Meeple und umgekehrt): hätte die Datentrennung, aber nicht die eigentlich gewünschte Entkopplung gebracht — Systemkonten, unregistrierte Mitglieder und anonymisierte Alt-Mitglieder brauchen gerade die *fehlende* Referenz auf der jeweils anderen Seite. Verworfen zugunsten beidseitig optionaler Referenzen.

## Consequences

- Ein `Vereinsmitglied` kann ohne `Meeple` existieren (unregistriert, oder nach harter Anonymisierung/Kontodeaktivierung) — Spiel-Aufenthalte referenzieren deshalb `Vereinsmitglied`, nicht mehr `Meeple` (siehe **Aufenthalt**, **Verantwortliche:r** in `CONTEXT.md`). Fehlt dem haltenden Mitglied ein `Meeple`, gilt das Spiel für andere Meeples als „nicht verfügbar" — nur der Spielewart sieht die Vereinsmitglied-Kontaktdaten.
- Ein `Meeple` kann ohne `Vereinsmitglied` existieren — als Systemkonto (mit Login, von `admin:access` angelegt) oder als anonymes Konto (ohne Login, reiner Historien-Rest, Einbahnstraße).
- Einladungen sind ab sofort ausnahmslos gebunden (E-Mail + Token als Doppelschlüssel) und referenzieren entweder ein `Vereinsmitglied` (Mitgliedseinladung) oder gar keins (Systemkonto-Einladung) — der bisherige ungebundene, mehrfach einlösbare Invite-Typ entfällt ersatzlos.
- Die dreistufige Anonymisierung (DSGVO-Optionaldaten löschen → Konto trennen/deaktivieren → `Vereinsmitglied` nach 12 Monaten löschen) ersetzt die bisherige einstufige Anonymisierung aus ADR 0002/`CONTEXT.md`.
- Migration ist kein reines Schema-Detail: alle heutigen `Meeple`-Zeilen brauchen eine begleitende `Vereinsmitglied`-Zeile, bevor der Split live geht.
- Die neuen Stammdatenfelder (Vorname/Nachname, Geburtsdatum, Geburtsort, Straße/PLZ/Wohnort, Telefon) starten **nullable**, weil der Vorstand die genaue Pflichtfeld-Liste noch nicht bestätigt hat (siehe `docs/mitglieder-konzept.md` Abschnitt 1.1). Eine Migrations-Platzhalter-Befüllung (Fake-Geburtsdatum o. ä.) wurde bewusst verworfen — der Vorstand pflegt fehlende Werte über die neue Admin-UI nach, eine Beitragsart-Ableitung ohne Geburtsdatum bleibt einfach unbestimmt statt falsch.
- Systemkonten entstehen nicht mehr über den Invite-Mechanismus: `admin:access` legt `Meeple` und Neon-Auth-User in einem Schritt an (`auth.admin.createUser()`, offizielle Admin-API von `@neondatabase/auth`/better-auth) und löst direkt einen Passwort-Reset-Link aus. Das vermeidet einen Zwischenzustand, der von einem anonymisierten Konto nicht unterscheidbar wäre (beide hätten sonst `vereinsmitgliedId: null` und `neonAuthUserId: null`).
- Ein dediziertes Sammelkonto **"Anonymer Meeple"** (ein einziges, dauerhaftes Konto) übernimmt Spiel-Aufenthalte für ungeklärte externe Interaktionspartner (siehe Abschnitt 5, Spiel-Ausleihe) — bewusst getrennt von den vielen echten anonymisierten Alt-Meeples, auch wenn beide denselben generischen Anzeige-Namen "Anonymer Meeple" tragen (gewollte zusätzliche Anonymität, kein Namenskonflikt).
- Die Ausgetreten-Rolle (siehe **Ausgetreten** in `CONTEXT.md`) braucht als Vorarbeit einen granularen Permission-Katalog für reguläre Meeple-Funktionen und Mehrfachrollen-Unterstützung — beides existiert heute nicht (`UserRole` ist zwar schon strukturell many-to-many, `setMeepleRole` erzwingt aber weiterhin genau eine Rolle). Deckt sich mit dem bereits offenen #264 und wird als eigenes, dieser Migration vorgeschaltetes Issue behandelt.
- `membershipEndsAt` berücksichtigt zusätzlich eine 4-Wochen-Mindestfrist vor dem Jahreswechsel (siehe #258): eine Kündigung in den letzten 4 Wochen des Jahres wirkt erst zum übernächsten statt zum nächsten 31.12. Ändert nur die Berechnung, nicht das Zustandsmodell — `membershipEndsAt` fällt weiterhin immer auf einen 31.12.
