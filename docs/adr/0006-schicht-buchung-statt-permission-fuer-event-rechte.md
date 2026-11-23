---
status: accepted
generalized-by: 0012
---

# Schicht-Buchung statt Permission für zeitgebundene Event-Rechte

> Die Kopplung an einen festen Rollennamen (`KASSE`) ist mit [ADR-0012](0012-helferrolle-generalisiert-schicht-buchung-rechte.md) generalisiert worden — jede Rolle kann jetzt optional eine Permission hinterlegen. Die Grundentscheidung dieses ADRs (Rechte über Schicht-Zeitraum statt dauerhafter Permission) bleibt unverändert gültig.

Wer die Flohmarkt-Kasse bedienen oder Flohmarkt-Artikel freigeben darf, wird nicht über eine eigene Permission im bestehenden RBAC-System vergeben (siehe `Permission`/`Role`-Modelle), sondern ergibt sich daraus, ob das Mitglied sich in die Flohmarkt-Schicht des jeweiligen Events eingetragen hat. Das weicht vom sonstigen Muster des Projekts ab, in dem Rechte durchgängig über Permissions laufen (Phase 2 Auth-Modell). Grund: die Berechtigung ist von Natur aus zeitgebunden und event-spezifisch — sie soll mit dem Ende des Verkaufstags automatisch wieder wegfallen, ohne dass ein Admin sie manuell wieder entziehen muss. Eine dauerhafte Permission hätte genau diese Befristung nicht abgebildet und würde nach jedem Event manuelles Aufräumen erfordern.

## Considered Options

- **Eigene Permission je Schicht-Typ, vom Admin vergeben:** konsistent mit dem restlichen RBAC-Modell, aber ohne automatischen Ablauf — Admins müssten Rechte nach jedem Event wieder entziehen, sonst behält ein Mitglied dauerhaft Kassenzugriff.

## Consequences

- Zugriff auf Flohmarkt-Kasse/-Freigabe muss zur Laufzeit über „ist dieses Meeple aktuell in der Flohmarkt-Schicht dieses Events eingetragen" geprüft werden, nicht über einen Permission-Check allein — die Prüfung braucht zusätzlich den Event- und Zeitbezug.
- Das Muster ist auf andere Schicht-Typen übertragbar, falls künftig weitere Schichten eigene Rechte freischalten sollen (z. B. Ausleihe-Schicht → Zugriff auf Verleih-Funktionen vor Ort).
