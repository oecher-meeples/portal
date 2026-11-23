---
status: accepted
---

# `ShiftType` wird zu einer generischen, vom Admin anlegbaren `HelperRole`; ADR-0006 generalisiert

`ShiftType` war bisher ein festes Enum (`THEKE | KASSE | LEIHE`); `CONTEXT.md` hielt „freie Schicht-Namen" bewusst für vermeidenswert. Die Event-Helferplanung (Epic „Event Helferplanung") erlaubt Admins aber, für jedes Event eigene Helferrollen zu definieren (z. B. „Küche", „Abbau"), die kein vorab bekanntes Enum abdecken kann, ohne bei jeder neuen Rolle eine Migration zu brauchen. Damit generalisiert dieser ADR gleichzeitig ADR-0006: dessen Prognose („Das Muster ist auf andere Schicht-Typen übertragbar") wird jetzt eingelöst, indem *jede* Rolle optional eine Permission hinterlegen kann, statt Kasse als Hardcode-Sonderfall im Code zu behalten.

## Considered Options

- **Enum um weitere feste Werte erweitern (`KUECHE`, `ABBAU`, …):** verworfen — jede neue Rolle bräuchte eine Schema-Migration; die Anforderung „Admin definiert Rollen pro Event selbst" wäre damit nicht erfüllbar.
- **`HelperRole` als globales, wiederverwendbares Stammdaten-Model (Name, optionale `grantsPermissionKey`), von Admins anlegbar:** bevorzugt. Rollen werden einmal angelegt und stehen danach bei jedem Event zur Auswahl — verhindert Tippfehler-Duplikate («Küche» vs. «küche») und erhält die Wiederverwendbarkeit, die das feste Enum bisher lieferte.
- **Rollen frei pro Event eintippbar, kein globaler Katalog:** verworfen — keine Wiederverwendung, keine stabile Basis für die generalisierte Rechtevergabe, Reporting über Events hinweg nicht möglich.
- **Rechte-Generalisierung auf später verschieben, Kasse bleibt Hardcode-Sonderfall:** verworfen — würde ADR-0006 nicht wirklich einlösen und die dort schon benannte technische Schuld unnötig fortschreiben, während ohnehin am selben Modell gearbeitet wird.

## Consequences

- `ShiftType`-Enum entfällt; `Shift.type` wird zu `Shift.roleId` (Fremdschlüssel auf `HelperRole`). Bestehende Werte (`THEKE`, `KASSE`, `LEIHE`) werden als Daten-Migration in globale `HelperRole`-Einträge überführt.
- `HelperRole` bekommt ein optionales `grantsPermissionKey: string?`. Ist es gesetzt, gilt die referenzierte Permission automatisch für die Dauer des individuellen Zuweisungs-Zeitblocks (`ShiftBooking.startsAt`–`endsAt`), analog zum bisherigen `hasFleaMarketRights`-Mechanismus in `src/lib/events/shift-rights.ts` — die Funktion wird generisch (`hasRoleGrantedPermission(meepleId, permissionKey, at)`) statt hart an `KASSE` gekoppelt.
- Die bestehende Kasse-Rolle wird bei der Migration mit `grantsPermissionKey` auf die heutige Flohmarkt-Kasse-Permission gesetzt — funktionales Verhalten bleibt für Bestandsdaten unverändert.
- `CONTEXT.md` Glossareintrag „Schicht" wird angepasst: „festem Typ" → „konfigurierbarer Rolle", `_Avoid_: freie Schicht-Namen` entfällt (siehe Glossar-Update im selben Zug).
- Dieser ADR generalisiert ADR-0006, ersetzt ihn aber nicht — die dortige Grundentscheidung („Rechte über Schicht-Zeitraum statt dauerhafter Permission") bleibt gültig, nur die Kopplung an einen festen Rollennamen fällt weg.
