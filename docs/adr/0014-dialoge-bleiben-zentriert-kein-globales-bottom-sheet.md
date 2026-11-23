---
status: accepted
---

# Dialoge bleiben zentriert — kein globales Bottom-Sheet unter sm

`ui/dialog.tsx` (`Dialog`/`DialogContent`) wird **nicht** pauschal auf Bottom-Sheet-Darstellung unter `sm` umgestellt, obwohl das für Daumen-Bedienbarkeit auf schmalen Displays naheliegend wirkt. Grund: `ui/dialog.tsx` wird an über 20 Stellen verwendet (Formulare, Bulk-Scan, Tabellen, einfache Bestätigungen), ein globaler Default-Wechsel hätte also einen hohen Blast-Radius auf einen Schlag — und trifft vor allem mehrfeldrige Formulare hart, wo die virtuelle Tastatur ein Bottom-Sheet technisch stärker beeinträchtigt als einen zentrierten Dialog (s. Consequences). Bottom-Sheets bleiben ein bewusst **pro Stelle** gewähltes Muster (`ui/bottom-sheet.tsx`, bereits genutzt in `mobile-nav.tsx` und `news-calendar.tsx`), keine App-weite Voreinstellung.

## Considered Options

- **Globaler Schalter in `ui/dialog.tsx`** (`DialogContent` rendert unter `sm` automatisch als Bottom-Sheet): geringster Implementierungsaufwand, aber nicht isoliert testbar — betrifft alle 20+ Verwendungsstellen gleichzeitig, inklusive breiter/datenlastiger Dialoge (Bulk-Scan, T-Shirt-Größen-Tabelle) und mehrfeldriger Formulare, für die das Muster nicht passt. Verworfen wegen des unkontrollierbaren Blast-Radius und der Tastatur-Problematik (s. u.).
- **Pro-Dialog-Opt-in über `ui/bottom-sheet.tsx`** (aktuell gewählt): jede Stelle entscheidet einzeln, ob sie sich für Bottom-Sheet eignet (kurze, eingabefreie Inhalte wie Kalender, Nav-Menüs, Picker, einfache Bestätigungen) oder zentriert bleibt (Formulare, Tabellen). Mehr Entscheidungsaufwand pro Stelle, aber kein pauschales Risiko.
- **Gar nichts ändern, `ui/bottom-sheet.tsx` nicht weiterverfolgen**: verworfen — für die bereits umgesetzten Fälle (MobileNav, News-Kalender) ist Bottom-Sheet nachweislich die bessere UX, nur eben nicht als Automatismus für jeden Dialog.

## Consequences

- Mobile Browser handhaben die virtuelle Tastatur uneinheitlich: iOS Safari schrumpft die *Layout*-Viewport-Höhe beim Öffnen der Tastatur i. d. R. **nicht** — ein Element mit `bottom: 0` bleibt an seiner Position, die dann hinter der Tastatur liegt. Android Chrome verhält sich meist kooperativer, aber uneinheitlich je nach Hersteller-Browser. Ein Bottom-Sheet mit Eingabefeld nahe am unteren Rand (z. B. Submit-Button) kann dadurch auf iOS komplett verdeckt werden, ohne dass der native "scrolle Feld in Sicht"-Mechanismus greift, der bei zentrierten Dialogen zuverlässiger funktioniert.
- Eine robuste Lösung existiert (`window.visualViewport`-Resize-Listener, der das Sheet aktiv nachführt — analog dem, was Libraries wie Vaul dafür einbauen), ist aber zusätzlicher Implementierungs- und Wartungsaufwand, den `@base-ui/react/dialog` nicht automatisch mitbringt. Wird nicht vorgezogen gebaut, sondern erst wenn eine konkrete Bottom-Sheet-Stelle tatsächlich eine Texteingabe braucht.
- Faustregel für neue Dialoge: **kein Texteingabefeld + kurzer Inhalt** → Kandidat für `ui/bottom-sheet.tsx`. **Mehrfeldriges Formular oder breiter/tabellarischer Inhalt** → bleibt `ui/dialog.tsx` (zentriert), unabhängig von der Displaybreite.
- `ui/dialog.tsx` selbst bleibt unverändert — kein neuer Prop, kein Breakpoint-Zweig darin.
