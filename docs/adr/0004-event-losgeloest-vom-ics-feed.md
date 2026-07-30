---
status: accepted
---

# Event-Modell losgelöst vom ICS-Kalender-Feed

Phase 6 braucht ein Ziel, an dem Schichten, Erklärbären-Anwesenheit, Regal-Zuordnung und Flohmarkt-Artikel hängen können. Naheliegend wäre gewesen, das an bestehende Kalendereinträge zu koppeln — der Verein hat bereits einen öffentlichen und einen internen ICS-Feed (siehe Phase-2- und Phase-5-Pläne). Stattdessen bekommt `Event` eine eigene Tabelle: ein Admin legt es im Portal mit Datum und Ort an, ganz ohne Bezug zum Feed. Der ICS-Feed bleibt reine Ankündigung nach außen; das Event ist die interne Betriebsgrundlage. Eine Kopplung hätte bedeutet, Struktur aus einem externen, nur lesbar synchronisierten Format (Titel/Datum als Freitext) herausparsen zu müssen — genau die Art Integrationstiefe, die dieses Projekt in Phase 2 und 5 bereits bewusst vermieden hat (Google-Calendar-API zugunsten des einfachen ICS-Feeds verworfen).

## Consequences

- Ein Event ohne passenden Kalendereintrag (oder umgekehrt) ist möglich; Admins pflegen beides unabhängig voneinander.
- Spätere Verknüpfung (z. B. ein optionales Freitextfeld oder ein Link zum Kalendereintrag) ist jederzeit ergänzbar, ohne das Event-Modell selbst zu ändern.
