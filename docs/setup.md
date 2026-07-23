# Setup & Technologie-Entscheidungen

> Dokumentiert die im Gemini-Chat (16.06.2026) getroffenen Architektur- und Technologie-Entscheidungen sowie die Anleitung zur lokalen Entwicklung.

---

## Getroffene Entscheidungen (Milestone 0.1)

### Architektur-Struktur

**Fullstack-Monolith** mit Next.js — Frontend, API-Logik (Server Actions / Route Handlers) und SSR in einem einzigen Repository.

Kein getrenntes SPA + Express-Backend. Begründung: weniger Infra-Overhead, einfachere Deployments, nativer TypeScript-Support, PWA-fähig out-of-the-box.

### Tech Stack

| Kategorie       | Entscheidung                  | Begründung                                               |
|-----------------|-------------------------------|----------------------------------------------------------|
| Framework       | **Next.js 15** (App Router)   | Fullstack, SSR/SSG, PWA-fähig, großes Ökosystem          |
| Sprache         | **TypeScript**                | Typsicherheit, IDE-Support, Pflicht bei Prisma           |
| Datenbank       | **PostgreSQL** via Neon       | Serverless, generous Free Tier, Prisma-kompatibel        |
| ORM             | **Prisma**                    | Typsicheres Schema, Migrations, bereits modelliert       |
| Styling         | **Tailwind CSS v4**           | Utility-first, kein CSS-Overhead, schnelles Prototyping  |
| Komponenten     | **shadcn/ui**                 | Copy-paste-Komponenten, vollständig anpassbar, kein Lock-in |
| Authentifizierung | **Auth.js (NextAuth v5)**   | Google SSO + klassischer Login, Next.js-nativ            |
| Package Manager | **pnpm**                      | Schnell, disk-effizient, Workspace-Support               |
| Node.js         | **v22 LTS**                   | Aktuelle LTS-Version, langfristig unterstützt            |

### Hosting & Deployment

| Dienst         | Plattform                    | Hinweis                                     |
|----------------|------------------------------|---------------------------------------------|
| App-Hosting    | **Vercel**                   | Nahtlose Next.js-Integration, CI/CD inklusive |
| Datenbank      | **Neon**                     | Serverless PostgreSQL, Branching für Dev/Prod |
| Assets / Bilder | **Vercel Blob**              | Einfache Integration, alternativ Cloudinary  |

---

## Lokales Setup

### 1. Voraussetzungen installieren

**Node.js v22 LTS** — empfohlen via [nvm](https://github.com/nvm-sh/nvm) (macOS/Linux) oder [fnm](https://github.com/Schniz/fnm) (Windows):

```bash
# Mit fnm (Windows)
winget install Schniz.fnm
fnm install 22
fnm use 22
node --version   # → v22.x.x
```

**pnpm** installieren:

```bash
npm install -g pnpm
pnpm --version   # → 9.x.x oder höher
```

---

### 2. Repository klonen

```bash
git clone https://github.com/oecher-meeples/ludothek.git
cd ludothek
```

---

### 3. Next.js-Projekt initialisieren

> Nur beim erstmaligen Aufsetzen des Projekts. Bereits geklont? Direkt zu Schritt 4.

```bash
pnpm create next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

---

### 4. Abhängigkeiten installieren

```bash
pnpm install
```

---

### 5. shadcn/ui einrichten

```bash
pnpm dlx shadcn@latest init
```

Empfohlene Antworten beim Setup-Wizard:
- Style: **Default**
- Base color: **Neutral**
- CSS variables: **Yes**

---

### 6. Prisma einrichten

```bash
pnpm add prisma @prisma/client
pnpm dlx prisma init --datasource-provider postgresql
```

Das generierte `prisma/schema.prisma` mit dem Inhalt aus `schema.md` befüllen.

---

### 7. Umgebungsvariablen konfigurieren

`.env.local` im Projektroot anlegen (wird nicht ins Git eingecheckt):

```env
# Neon PostgreSQL (Connection String aus dem Neon-Dashboard)
DATABASE_URL="postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/dbname?sslmode=require"

# Auth.js
AUTH_SECRET=""           # openssl rand -base64 32
AUTH_URL="http://localhost:3000"

# Google OAuth (aus der Google Cloud Console)
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
```

**AUTH_SECRET** generieren:

```bash
openssl rand -base64 32
```

---

### 8. Datenbank migrieren

```bash
# Erste Migration erstellen und anwenden
pnpm dlx prisma migrate dev --name init

# Prisma Client generieren
pnpm dlx prisma generate
```

---

### 9. Entwicklungsserver starten

```bash
pnpm dev
# → http://localhost:3000
```

---

## Nützliche Befehle

| Befehl                               | Beschreibung                               |
|--------------------------------------|--------------------------------------------|
| `pnpm dev`                           | Entwicklungsserver starten                 |
| `pnpm build`                         | Produktions-Build erstellen                |
| `pnpm start`                         | Produktions-Build lokal starten            |
| `pnpm lint`                          | ESLint ausführen                           |
| `pnpm dlx prisma studio`             | Prisma Studio öffnen (visueller DB-Browser)|
| `pnpm dlx prisma migrate dev`        | Neue Migration erstellen & anwenden        |
| `pnpm dlx prisma migrate reset`      | Datenbank zurücksetzen (nur lokal!)        |
| `pnpm dlx prisma generate`           | Prisma Client neu generieren               |
| `pnpm dlx prisma db push`            | Schema pushen ohne Migration (Prototyping) |

---

## Referenzen

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Auth.js Docs](https://authjs.dev)
- [Neon Docs](https://neon.tech/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
