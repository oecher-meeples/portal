---
status: accepted
---

# Gäste-Scan über EAN statt neuer spiel-eigener QR-Codes

Der öffentliche Gäste-Bereich (Meilenstein 6.3) soll Besuchern beim Scannen eines Spiels sofort Infos, Erklärvideos und anwesende Erklärbären zeigen. Spiel-eigene QR-Codes waren in Phase 5 bewusst zurückgestellt (siehe Roadmap-Rückstand „Spiele-eigene QR-Codes für den Duplikatfall"), weil die Standort-Kette (Spiel → Karton/Regal → Meeple) für den internen Betrieb ausreicht. Für den Gäste-Bereich bleibt es dabei: der Scan läuft über die vorhandene EAN (Produkt-Barcode), nicht über ein neues Etikettensystem. Bei mehreren Spielen desselben Titels zeigt der Gast eine kurze Auswahl — bei genau einem Treffer entfällt sie. Der Alternativweg (jetzt doch spiel-eigene QR-Codes einführen) hätte Etikettendruck und ein neues eindeutiges Feld gebraucht, nur um ein Duplikat-Problem zu lösen, das aktuell selten auftritt.

## Consequences

- Der Gäste-Bereich erbt das Duplikat-Verhalten des internen Scans: mehrere Treffer bei gleicher EAN sind möglich und werden per Auswahlliste aufgelöst, nicht vermieden.
- Führt der Verein später spiel-eigene QR-Codes ein (falls der Duplikatfall aus Phase 5 doch relevant wird), profitiert der Gäste-Scan automatisch mit — diese ADR steht dem nicht im Weg, verschiebt die Einführung nur auf einen konkreten Bedarf.

## Nachtrag 2026-08-03: Namensumfang für Erklärbären im Gäste-Bereich (Security-Finding F10)

`getGuestGameDetail` ist bewusst unauthentifiziert und gibt `attendingExplainers` mit vollem `displayName` zurück. Ein Sicherheits-Audit hat zu Recht angemerkt, dass `eventId` dabei ursprünglich nicht geprüft wurde — ein Aufrufer konnte über beliebige Event-IDs Klarnamen und Anwesenheit von Mitgliedern auslesen, auch für Events, die längst vorbei oder noch nicht begonnen hatten.

**Behoben:** `getGuestGameDetail` prüft jetzt über `isEventCurrentlyRunning()`, ob das Event tatsächlich gerade läuft (`startsAt` ist erreicht, `endsAt` ist offen oder noch nicht erreicht), und gibt sonst `null` zurück, bevor irgendeine Mitgliedsdatenabfrage läuft.

**Bewusste Abwägung zum Namensumfang:** `displayName` bleibt unverändert voll sichtbar, statt auf den Vornamen zu kürzen. Begründung: der Zweck der Funktion ist, dass ein Gast einen anwesenden Erklärbären im Raum ansprechen kann — ein gekürzter Name wäre dafür nicht hilfreicher als der volle. Mit der Event-Prüfung oben ist die Offenlegung jetzt auf Meeples begrenzt, die tatsächlich gerade bei einem laufenden Event anwesend sind — vergleichbar mit dem, was ein Gast vor Ort ohnehin sehen würde. `lookupGuestGame` bekommt keine analoge Prüfung, weil die Funktion gar kein `eventId` entgegennimmt (EAN-Lookup ohne Event-Bezug) und keine Personendaten zurückgibt; die unauth. Enumerierbarkeit des Bestands bleibt ein bekanntes, geringes Restrisiko dieser ADR.
