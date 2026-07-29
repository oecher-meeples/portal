---
status: accepted
---

# Bankdaten verschlüsselt, mit protokolliertem Leseweg

Mitglieder pflegen ihre IBAN selbst, der Beitragseinzug läuft über SEPA. Deshalb: **IBANs werden app-seitig mit AES-256-GCM verschlüsselt gespeichert, entschlüsselt ausschließlich für das eigene Profil und für die Rolle `kassenwart`, und jeder Lesezugriff wird protokolliert.**

## Considered Options

- **Speichern ohne Leseweg** (nur das Mitglied selbst sieht die eigene IBAN, Admins nie): geringste Angriffsfläche, aber die Daten hätten keinen Verwendungszweck — personenbezogene Daten mit vollem Haftungsrisiko und ohne Nutzen sind datenschutzrechtlich schlechter, als sie nicht zu speichern. **Wenn der Leseweg später entfällt, müssen die Felder ganz weg, nicht nur der Zugriff.**
- **Bankdaten gar nicht speichern** (Änderungen laufen über den Papierweg): kein Krypto-Modul, kein Schlüssel-Backup, kein Log — hätte aber den Roadmap-Punkt „Self-Service zur Änderung der eigenen Bankdaten" gestrichen statt umgesetzt.
- **`bank:read` an die Admin-Rolle hängen:** weniger Rollenverwaltung, aber jeder Admin, der nur Spiele einpflegt, könnte alle IBANs lesen.
- **SEPA-XML (`pain.008`) im Portal erzeugen:** größter Nutzen für den Kassenwart, aber Mandatsreferenzen, Gläubiger-ID, Fälligkeiten und Formatvalidierung sind ein eigenes Projekt mit echtem Geldfluss als Fehlerfolge. Bewusst nicht umgesetzt; der Leseweg endet beim CSV-Export für die bestehende Banking-Software.

## Consequences

- Permission `bank:read` liegt in einer **eigenen Rolle** `kassenwart`, getrennt von `games:manage` und `members:manage`. Admins können sich die Rolle selbst zuweisen; die Zuweisung ist in der Mitgliederverwaltung sichtbar, damit es nachvollziehbar bleibt.
- In allen Listen und Formularen erscheint nur `**** 1234`. `ibanLast4` liegt bewusst **unverschlüsselt** vor, damit Anzeige und Zuordnung ohne Entschlüsselung funktionieren — das ist kein Versehen. Der Klartext verlässt den Server nur bei einer expliziten Aktion.
- Zugriffe werden 24 Monate protokolliert (Zeitpunkt, Zugreifer, betroffenes Mitglied); das Aufräumen übernimmt der bestehende tägliche Cron.
- **Betriebsrisiko:** Geht `MEMBER_DATA_ENCRYPTION_KEY` verloren, sind alle IBANs unwiederbringlich weg. Der Schlüssel braucht ein Backup außerhalb von Vercel. Ohne Schlüssel bleiben nur die letzten vier Stellen lesbar.
