# 🎲 Oecher Meeples – Vereinswebseite & Ludotheks-Verwaltung

[![CI](https://github.com/oecher-meeples/portal/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/oecher-meeples/portal/actions/workflows/ci.yml)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL via Neon](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql&logoColor=white)](https://neon.tech)
[![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-Prettier-F7B93E?logo=prettier&logoColor=black)](https://prettier.io)
[![Lizenz: proprietär](https://img.shields.io/badge/Lizenz-propriet%C3%A4r-lightgrey)](./LICENSE)

Willkommen im Repository für das Webportal der **Oecher Meeples**. Die Plattform dient als zentrale Anlaufstelle für Vereinsmitglieder, Spielebegeisterte und Gäste und vereint die Außendarstellung des Vereins mit einer digitalen Verwaltung unserer Spielebibliothek (Ludothek) und des Vereinslebens im internen Bereich.

> **Status:** Aktive Entwicklung. Öffentlicher Bereich, Mitgliederbereich, Ludothek mit Scan-Workflow, Helferplanung, Flohmarkt und Instagram-Anbindung sind implementiert – siehe [`docs/roadmap.md`](./docs/roadmap.md) für den Stand der Meilensteine.

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

| Dokument                                                   | Inhalt                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`docs/Concept.md`](./docs/Concept.md)                     | Konzept, Funktionsübersicht, Rollen, Onboarding-Prozess                  |
| [`docs/schema.md`](./docs/schema.md)                       | Datenmodelle (ER-Diagramme) für Public-, Member- und Event-Bereich       |
| [`docs/flow.md`](./docs/flow.md)                           | Datenfluss-Diagramme zentraler Prozesse                                  |
| [`docs/setup.md`](./docs/setup.md)                         | Architektur- & Technologie-Entscheidungen sowie lokale Setup-Anleitung   |
| [`docs/roadmap.md`](./docs/roadmap.md)                     | Meilensteinbasierter Entwicklungsablauf                                  |
| [`docs/instagram-setup.md`](./docs/instagram-setup.md)     | Checkliste externer Vorbedingungen für die Instagram-Anbindung           |
| [`docs/project-structure.md`](./docs/project-structure.md) | Schichtenarchitektur, Ordner-Semantik und erzwungene Import-Richtung     |
| [`docs/coding-guidelines.md`](./docs/coding-guidelines.md) | Coding-Richtlinien: Sprache, TypeScript, Server Actions, Tailwind, Tests |
| [`docs/design.md`](./docs/design.md)                       | Markenfarben, Farbtokens, Light-/Dark-Mode                               |
| [`docs/adr/`](./docs/adr/)                                 | Architecture Decision Records – fachliche Entscheidungen mit Begründung  |
| [`CLAUDE.md`](./CLAUDE.md)                                 | Kurzfassung der Regeln für KI-Agenten                                    |

---

## 🛠️ Technologie-Stack

| Kategorie         | Entscheidung                     |
| ----------------- | -------------------------------- |
| Framework         | Next.js 16 (App Router)          |
| Sprache           | TypeScript                       |
| Datenbank         | PostgreSQL via Neon              |
| ORM               | Prisma                           |
| Styling           | Tailwind CSS v4                  |
| Komponenten       | shadcn/ui-Stil auf Base UI       |
| Authentifizierung | Neon Auth (`@neondatabase/auth`) |
| Tests             | Vitest + Testing Library         |
| Hosting           | Vercel                           |

Details und Begründungen siehe [`docs/setup.md`](./docs/setup.md), Architektur- und Coding-Regeln in [`docs/project-structure.md`](./docs/project-structure.md) und [`docs/coding-guidelines.md`](./docs/coding-guidelines.md).

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

## 🤝 Mitarbeiten

Vor dem ersten Beitrag: [`docs/project-structure.md`](./docs/project-structure.md) (Schichten & Import-Regeln) und [`docs/coding-guidelines.md`](./docs/coding-guidelines.md) (Konventionen).

```bash
npm run verify   # Typecheck + Lint (inkl. Architekturregeln) + Tests
npm run format   # Prettier, inkl. Tailwind-Klassenreihenfolge
npm run dup      # DRY-Kontrolle (jscpd)
```

`verify` läuft automatisch als `pre-push`-Hook und in der CI. Die Schichten-Import-Richtung
(`ui → entities → widgets → feature → layout`) und das 400-Zeilen-Limit sind per ESLint
erzwungen – ein Verstoß bricht den Build.

---

## 🔗 Lizenz

Proprietär – alle Rechte vorbehalten. Siehe [`LICENSE`](./LICENSE).
