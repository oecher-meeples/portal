# 🎲 Oecher Meeples – Vereinswebseite & Ludotheks-Verwaltung

Willkommen im Repository für das Webportal der **Oecher Meeples**. Die Plattform dient als zentrale Anlaufstelle für Vereinsmitglieder, Spielebegeisterte und Gäste und vereint die Außendarstellung des Vereins mit einer digitalen Verwaltung unserer Spielebibliothek (Ludothek) und des Vereinslebens im internen Bereich.

> **Status:** Konzeptions- und Planungsphase. Es existiert noch kein produktiver Code – siehe [`docs/`](./docs) für Konzept, Datenmodell und Setup-Anleitung.

---

## 🌟 Kernideen

- **Transparenz nach außen:** Termine, News, Vereinssatzung, rechtliche Dokumente und eine integrierte Spendenmöglichkeit.
- **Digitale Ludothek:** Erfassung, Verleih und Standortverfolgung der Gesellschaftsspiele – inklusive Deinventarisierung statt Löschung, um die Verleih-Historie zu erhalten.
- **Mitmach-Kultur:** Helferpläne für Events, interner Newsroom, Kalender, Spieleerklärer-Verzeichnis und Spielergesuche ("LFG").
- **Social-Media-Automatisierung:** Beiträge werden einmal verfasst und automatisiert an externe Kanäle (z. B. Instagram) weitergeleitet.
- **Ressourcen-Sharing:** Ersatzteillager für beschädigte Spiele sowie Bring & Buy Flohmarkt und interner Kleinanzeigen-Marktplatz.

Eine ausführliche Beschreibung aller Funktionsbereiche findet sich in [`docs/Concept.md`](./docs/Concept.md).

---

## 📚 Dokumentation

| Dokument | Inhalt |
|---|---|
| [`docs/Concept.md`](./docs/Concept.md) | Konzept, Funktionsübersicht, Rollen, Onboarding-Prozess |
| [`docs/schema.md`](./docs/schema.md) | Datenmodelle (ER-Diagramme) für Public-, Member- und Event-Bereich |
| [`docs/flow.md`](./docs/flow.md) | Datenfluss-Diagramme zentraler Prozesse |
| [`docs/setup.md`](./docs/setup.md) | Architektur- & Technologie-Entscheidungen sowie lokale Setup-Anleitung |
| [`docs/roadmap.md`](./docs/roadmap.md) | Meilensteinbasierter Entwicklungsablauf |

---

## 🛠️ Technologie-Stack (geplant)

| Kategorie | Entscheidung |
|---|---|
| Framework | Next.js 15 (App Router) |
| Sprache | TypeScript |
| Datenbank | PostgreSQL via Neon |
| ORM | Prisma |
| Styling | Tailwind CSS v4 |
| Komponenten | shadcn/ui |
| Authentifizierung | Auth.js (NextAuth v5) mit Google SSO |
| Hosting | Vercel |

Details und Begründungen siehe [`docs/setup.md`](./docs/setup.md).

---

## 👥 Rollen

1. **Gäste / Besucher** – lesender Zugriff auf den öffentlichen Bereich
2. **Mitglieder (Meeples)** – Zugriff auf Mitgliederbereich, Ludothek, Spielergesuche, Ersatzteillager, Kleinanzeigen, Helferplan
3. **Moderatoren / Content-Ersteller** – Blog- und Termin-Erstellung, Instagram-Weiterleitung
4. **Spiele-Moderatoren / Admins** – Bestandsverwaltung, Schichtplanung, Deinventarisierung, Flohmarkt-Steuerung

---

## 🚀 Lokales Setup

Eine Schritt-für-Schritt-Anleitung zum Aufsetzen der lokalen Entwicklungsumgebung befindet sich in [`docs/setup.md`](./docs/setup.md).

---

## 🔗 Lizenz

Noch nicht festgelegt.
