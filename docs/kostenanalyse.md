# Kostenanalyse — Oecher Meeples Portal als Abschlussarbeit „Plan, Prototyp, Produktion"

Stand: 2026-07-31. Vorgabe: max. 2 €/Monat bzw. 24 €/Jahr, abgesehen von der Domain. Shop-Anforderung laut Mentor entfallen; Newsletter (CRM) wird ergänzt.

## Aktuell verbaute Services (Ist-Stand)

| Service | Zweck im Projekt | Kostenmodell | Kosten im Prototyp-Maßstab |
| --- | --- | --- | --- |
| **Vercel (Hobby)** | Hosting, Server Actions, 1× Cron (`/api/cron/instagram-queue`, täglich 05:00) | Free: 100 GB Fast Data Transfer, 1 Mio. Funktionsaufrufe, 6.000 Build-Minuten/Monat | **0 €** |
| **Vercel Blob** | Bild-Upload für News-Artikel | Free: 1 GB Storage, 10 GB Transfer/Monat | **0 €**, aber engster Free-Tier-Wert im Stack (siehe Risiken) |
| **Neon Postgres** | Primäre Datenbank (Prisma, 20 Models) | Free: 0,5 GB Storage, 100 CU-Std./Monat, bis 100 Projekte | **0 €** |
| **Neon Auth** (Better Auth, managed) | Login/Registrierung, Sessions | Im Neon-Free-Tier enthalten, bis 60.000 MAU | **0 €** |
| **Meta Graph API** (Instagram) | Cross-Posting News → Instagram | Kostenlose Developer-API | **0 €** |
| **Google Calendar** | Öffentlicher/interner ICS-Feed | Kostenlos, kein API-Key nötig (`node-ical`-Parser gegen `.ics`-Link) | **0 €** |

Summe Ist-Stand: **0 €/Monat**.

## Neu: Newsletter (CRM-Anforderung)

Zwei Bausteine, die getrennt zu betrachten sind: **Abonnenten-Verwaltung** (wer bekommt den Newsletter) und **Versand** (E-Mails tatsächlich zustellen).

### Empfehlung: eigene Abonnenten-Tabelle + Resend (transaktional)

- Abonnenten-Verwaltung **selbst bauen**: eine `NewsletterSubscriber`-Tabelle in der bestehenden Neon-DB (E-Mail, Opt-in-Status, Datum) — kein neues System, keine neuen Kosten, passt ins bestehende Permission-Modell (Admin sieht Abonnenten-Zahl im Dashboard, `Aufgabenstellung.md` verlangt genau das).
- Versand über **Resend**, Free-Tier: 3.000 E-Mails/Monat, 100/Tag. Reicht bei realistischer Vereinsgröße (z. B. 150 Abonnenten × mehrere Newsletter/Monat) deutlich.
- **Wichtig**: Resends *Broadcast/Audiences*-Produkt (fertige Marketing-Oberfläche mit Listenverwaltung) ist **kostenpflichtig ab 40 $/Monat** — das würde das Budget sprengen. Genutzt wird deshalb nur die reine Transactional-Send-API (`resend.emails.send`), die Listen-Logik bleibt in eigener Hand. Fachlich deckt sich das gut mit dem bestehenden CMS/Admin-Muster (Server Action, wie beim News-CRUD).

Kosten: **0 €/Monat** (innerhalb 3.000 Mails/Monat).

### Alternative: Mailchimp (im Aufgabentext explizit genannt)

- Free-Plan seit 2026: **250 Kontakte, 500 Sends/Monat**, keine Automationen mehr im Free-Tier.
- Für einen Verein mit wachsendem Mitglieder-/Interessentenkreis ist das Kontingent knapp; bei Überschreitung beginnt Mailchimp ab ca. 13 $/Monat.
- Vorteil: fertige Anmeldeformulare, DSGVO-Double-Opt-in eingebaut — spart Implementierungsaufwand, kostet aber Abhängigkeit von einem zweiten System außerhalb der eigenen DB (Abonnenten-Zahl im Admin-Dashboard müsste dann per Mailchimp-API abgefragt werden statt aus eigener DB).

**Empfehlung bleibt Resend + eigene Tabelle** — 0 €, kein Zweitsystem, Abonnentenzahl bleibt eine normale DB-Query.

## Domain

Einzige laut Aufgabenstellung erlaubte Dauerkosten (außerhalb des 2-€-Limits).

- Marktpreis .de: ca. 8–15 €/Jahr; .com: ca. 10–15 €/Jahr — passt in sich bereits ins 24-€-Jahresbudget, selbst wenn man sie mitzählen würde.
- **GitHub Student Developer Pack** (im Aufgabentext als Recherche-Stichwort genannt): enthält u. a. ein kostenloses Namecheap-`.me`-Domain-Jahr. Lohnt sich nur, wenn ohnehin Studierendenstatus vorliegt und `.me` als Domain-Endung akzeptabel ist — danach greift der reguläre Renewal-Preis.

## Gesamtrechnung

| Position | €/Monat |
| --- | --- |
| Hosting, DB, Auth, Blob, Instagram, Kalender | 0 |
| Newsletter (Resend, eigene Abonnenten-Tabelle) | 0 |
| Domain (separat vom Limit) | ~0,70–1,25 (≈8–15 €/Jahr) |
| **Gesamt gegen das 2-€-Limit** | **0 €** |

Das Projekt bleibt bei der empfohlenen Newsletter-Umsetzung komfortabel innerhalb der Vorgabe — es gibt sogar Puffer, falls einzelne Free-Tiers künftig schrumpfen (wie bei Mailchimp 2026 bereits geschehen).

## Risiken / worauf zu achten ist

1. **Vercel Blob (1 GB Free-Tier)** ist der knappste Wert im ganzen Stack. Bei häufigem Bild-Upload für News-Artikel ohne Kompression ist das Limit am ehesten erreichbar. Sollte bei Produktivbetrieb beobachtet werden (Vercel-Dashboard zeigt Verbrauch); Gegenmaßnahme: Bildkompression vor Upload, oder Umstieg auf ein günstigeres Objekt-Storage bei Bedarf.
2. **Vercel Hobby ist laut ToS nur für nicht-kommerzielle Nutzung.** Ein Vereinsportal ohne Verkaufsfunktion (Shop entfällt ja) ist unkritisch; falls später doch Zahlungen/Mitgliedsbeiträge über die Seite abgewickelt würden, wäre ein Wechsel auf Pro (20 $/Monat) nötig — das würde das 2-€-Budget sprengen. Für die Abschlussarbeit in der aktuellen Spezifikation (kein Zahlungsverkehr) unkritisch.
3. **Free-Tiers verändern sich** (Mailchimp hat sein Kontingent 2023–2026 in mehreren Schritten reduziert). Die Kostenanalyse ist eine Momentaufnahme, kein Dauerversprechen — bei der Abgabe/Reflexion lohnt ein Hinweis, dass „Zero-Cost" eine Wette auf die Großzügigkeit fremder Free-Tiers ist, nicht auf eigene Kontrolle.
4. **Neon Free (0,5 GB Storage, 100 CU-Std.)** ist für einen Prototyp/kleinen Verein ausreichend, aber die knappste DB-Kennzahl neben Blob — bei starkem Mitgliederwachstum oder vielen Bildern/News im Volltext beobachten.

## Sources

- [Vercel free tier limits in 2026](https://www.promptstoproduct.com/vercel-free-tier-limits)
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations)
- [Vercel Pricing 2026 (Blob-Werte)](https://schematichq.com/blog/vercel-pricing)
- [Neon Pricing 2026: CU-Hours, Storage & Real Costs](https://swyftstack.com/blog/neon-pricing-explained)
- [Neon Free Tier 2026: Limits, Pricing & What Changed](https://agentdeals.dev/vendor/neon)
- [Navigating Mailchimp's New Free Limits](https://www.beehiiv.com/blog/navigating-mailchimp-s-new-free-limits-essential-updates-for-newsletter-owners)
- [Resend New Free Tier](https://resend.com/blog/new-free-tier)
- [Resend Pricing 2026: Free 3K, Pro $20, Scale $90](https://automationatlas.io/answers/resend-pricing-explained-2026/)
