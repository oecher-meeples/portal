---
status: accepted
---

# Gäste-Scan über EAN statt neuer spiel-eigener QR-Codes

Der öffentliche Gäste-Bereich (Meilenstein 6.3) soll Besuchern beim Scannen eines Spiels sofort Infos, Erklärvideos und anwesende Erklärbären zeigen. Spiel-eigene QR-Codes waren in Phase 5 bewusst zurückgestellt (siehe Roadmap-Rückstand „Spiele-eigene QR-Codes für den Duplikatfall"), weil die Standort-Kette (Spiel → Karton/Regal → Meeple) für den internen Betrieb ausreicht. Für den Gäste-Bereich bleibt es dabei: der Scan läuft über die vorhandene EAN (Produkt-Barcode), nicht über ein neues Etikettensystem. Bei mehreren Spielen desselben Titels zeigt der Gast eine kurze Auswahl — bei genau einem Treffer entfällt sie. Der Alternativweg (jetzt doch spiel-eigene QR-Codes einführen) hätte Etikettendruck und ein neues eindeutiges Feld gebraucht, nur um ein Duplikat-Problem zu lösen, das aktuell selten auftritt.

## Consequences

- Der Gäste-Bereich erbt das Duplikat-Verhalten des internen Scans: mehrere Treffer bei gleicher EAN sind möglich und werden per Auswahlliste aufgelöst, nicht vermieden.
- Führt der Verein später spiel-eigene QR-Codes ein (falls der Duplikatfall aus Phase 5 doch relevant wird), profitiert der Gäste-Scan automatisch mit — diese ADR steht dem nicht im Weg, verschiebt die Einführung nur auf einen konkreten Bedarf.
