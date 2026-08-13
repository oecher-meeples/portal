# Ausführungsplan: Rechtliches-Dokumente als PDF verwalten (mit Text-Extraktion)

- **Erstellt/Aktualisiert:** 2026-08-13 00:00
- **Ziel:** Satzung/Datenschutzerklärung/Impressum/Beitragsordnung als PDF-Upload verwalten, deren Text extrahieren und weiterhin als Sections auf `/rechtliches/[slug]` anzeigen — ohne automatische KI-Gliederung.
- **Quelle:** `.claude/plans/legal-docs-pdf-management.md`
- **Git-Base-State:** Branch `feature/downloads-unified-view`, Commit `c35d880`

> Details, Anforderungen und Kontext stehen in der Quelldatei — hier nicht duplizieren.

## Persona

Du bist Senior Full-Stack-Entwickler:in mit Fokus auf Next.js (App Router), Prisma/PostgreSQL
(Neon) und Vercel Blob Storage, vertraut mit der DDD-Layer-Trennung dieses Repos
(`src/lib/<domäne>/` vs. `src/components/{ui,entities,widgets,feature}/`). Du erweiterst
bestehende Muster (Downloads-Feature) konsequent, statt sie neu zu erfinden, und hältst dich
strikt an [CLAUDE.md](../../CLAUDE.md).

## Getroffene Annahmen

- Section-IDs im Editor werden aus dem Heading per `slugify()` (`src/lib/utils/slug.ts`)
  erzeugt; bei Duplikaten innerhalb desselben Dokuments wird `-2`, `-3`, … angehängt
  (gleiche Logik wie `uniqueSlug`, aber ohne DB-Check — rein lokal gegen die bereits im
  Editor vorhandenen Section-IDs).
- Reorder der Sections im Editor per natives HTML5 Drag & Drop, analog zum bestehenden
  Muster in `src/components/feature/downloads/downloads-view.tsx`
  (`draggable`, `onDragStart`/`onDrop`, kein zusätzliches DnD-Package).
- `extractPdfText`/`unpdf` wird in Tests gemockt (`vi.mock("unpdf")` + gemocktes
  `global.fetch` für den Blob-Download), kein echtes PDF-Fixture im Repo — analog zum
  bestehenden `vi.mock`-Muster in `src/lib/downloads/actions.test.ts`.
- `LegalDocument.sections` ist Prisma `Json`; Lese-/Schreibvalidierung der Form
  `LegalSection[]` erfolgt in `saveLegalDocument` per Zod-Schema (Zod ist bereits
  Projektabhängigkeit — falls nicht, `zod` hinzufügen), damit kaputte JSON-Struktur nicht
  unbemerkt in die DB gelangt.
- Migration läuft direkt gegen die echte Neon-Dev-DB (`prisma migrate dev`), wie im Repo
  bereits Praxis (siehe `docs/project-structure.md`-Migrationshinweise).
- Seed-Skript `demo-legal-documents.ts` ist idempotent (Prisma `upsert` auf `slug`), analog
  zu den übrigen `DEMO_*`-Seeds.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt).
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf die Quelldatei.
- Dateien über 400 Zeilen möglichst in kleinere Dateien aufteilen.
- Erstelle eine passende Ordnerstruktur, konsistent mit den bestehenden
  `src/lib/<domäne>/` / `src/components/feature/<feature>/`-Konventionen.
- **Unit-Tests:** Für neue Logik/Funktionen Unit-Tests schreiben. Die Definition of Done
  eines Schritts gilt erst als erfüllt, wenn die zugehörigen Tests grün sind.
  Ausgenommen sind rein mechanische/nicht-testbare Schritte (Config, Doku, Boilerplate,
  reine UI-Komponenten ohne Geschäftslogik — Coverage-Scope ist `src/lib/**` und
  `src/components/**/actions.ts`, siehe CLAUDE.md).
- **Committe nur Dateien, die du selbst geschrieben hast** — andere Dateien im
  Working Directory ignorieren (kein `git add .`, sondern gezieltes `git add <datei>`).
- **Blockierende Prozesse:** Du hast die Erlaubnis, Prozesse zu beenden, die für die
  Ausführung eines Schritts benötigte Ressourcen blockieren (z. B. einen Port, eine
  Datei oder einen Lock belegen). Identifiziere den blockierenden Prozess gezielt und
  beende nur diesen, statt den Schritt abzubrechen.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert: < 1 h Arbeit).
- **Bei Fehlschlag eines Schritts:** prüfen, ob die Definition of Done zumindest
  teilweise erfüllt ist. Falls ja, den erreichten Teilstand committen (Commit-Message
  mit Präfix `wip:`); falls nein, nichts committen. In beiden Fällen den Schritt mit
  `[!]` markieren, den Fehler kurz im Schritt selbst notieren (Stichpunkt unter dem
  Schritt) und mit dem nächsten Schritt fortfahren — **nicht abbrechen**. Erst
  nachdem **alle** Schritte durchlaufen wurden (egal ob `[x]` oder `[!]`), alle
  offenen Punkte/Fehlschläge gesammelt auf Deutsch mit dem Nutzer besprechen.
- Markiere jeden erledigten Schritt mit `[x]`, sobald er abgeschlossen und committet ist.
- Vor dem letzten Schritt: `pnpm run verify` muss grün sein (siehe CLAUDE.md).
- Wird die Ordnerstruktur/geteilte Bausteine geändert: `docs/project-structure.md`
  entsprechend anpassen.

## Schritte

- [x] **0. Repository prüfen**
      Kein neues Repo nötig — Git ist bereits initialisiert (Branch
      `feature/downloads-unified-view`, s. o.). Nur `git status` prüfen, dass der
      Working Tree wie erwartet aussieht (die in der Quelldatei genannten unrelated
      Änderungen an `.claude/audits/…` und `.env.example` bleiben unangetastet und werden
      nicht committet).
      _Definition of Done:_ `git status` zeigt einen bekannten Zustand, keine Datei aus
      diesem Feature ist bereits gestaged.
      (kein Commit — reine Prüfung)

- [x] **1. Testframework prüfen**
      Vitest ist bereits eingerichtet (`pnpm run test`, Config in `vitest.config.ts`).
      Kein neues Framework nötig.
      _Definition of Done:_ `pnpm run test` läuft grün auf dem aktuellen Stand.
      (kein Commit — reine Prüfung)

- [x] **2. Prisma-Modell `LegalDocument` + Migration**
      In `prisma/schema.prisma` das Modell `LegalDocument` gemäß Vorgabe ergänzen
      (`id`, `slug @unique`, `title`, `sections Json`, `pdfFileUrl String?`,
      `updatedAt @updatedAt`, `@@map("legal_documents")` analog zu `Download`/
      `@@map("downloads")`). Migration erzeugen und gegen die Neon-Dev-DB ausführen:
      `pnpm prisma migrate dev --name add_legal_document`.
      _Definition of Done:_ Migration liegt unter `prisma/migrations/`, `prisma generate`
      läuft fehlerfrei, `LegalDocument` ist im generierten Client verfügbar.
      `git commit -m "feat: add LegalDocument prisma model and migration"`

- [x] **3. Permission `legal:manage` seeden**
      In `prisma/seed.ts`: `PERMISSIONS`-Array um
      `{ key: "legal:manage", description: "Rechtliches-Dokumente verwalten (PDF hochladen, Sections bearbeiten)" }`
      ergänzen, `ROLES` → `admin` bekommt sie automatisch über
      `PERMISSIONS.map((p) => p.key)`. `pnpm run seed` (bzw. das im Repo definierte
      Seed-Skript) einmal lokal ausführen, um zu prüfen, dass es fehlerfrei durchläuft.
      _Definition of Done:_ Seed läuft fehlerfrei durch, `legal:manage` existiert in der
      DB und ist der Rolle `admin` zugeordnet.
      `git commit -m "feat: seed legal:manage permission"`

- [x] **4. Datenmigration: `LEGAL_CONTENT` als Seed-Daten**
      `prisma/seed-data/demo-legal-documents.ts` anlegen: Array `DEMO_LEGAL_DOCUMENTS`
      mit den vier Einträgen aus `LEGAL_DOCS`/`LEGAL_CONTENT`
      (`{ slug, title, sections, pdfFileUrl: null }`) — Inhalte 1:1 aus
      `src/data/legal.ts` übernehmen. In `prisma/seed.ts` importieren und per
      `prisma.legalDocument.upsert({ where: { slug }, create: …, update: … })` je
      Eintrag einspielen (idempotent, analog zum bestehenden `DEMO_DOWNLOADS`-Pattern,
      aber mit `upsert` statt reinem `create`, da `slug` eindeutig ist). Kurzer Unit-Test
      `prisma/seed-data/demo-legal-documents.test.ts` (analog zu
      `demo-downloads.test.ts`), der prüft, dass alle vier festen Slugs vorhanden sind
      und jede `sections`-Liste nicht leer ist.
      _Definition of Done:_ Test grün, `pnpm run seed` legt/aktualisiert die vier
      `LegalDocument`-Zeilen ohne Duplikate bei wiederholtem Lauf an.
      `git commit -m "feat: seed legal documents from static LEGAL_CONTENT"`

- [x] **5. PDF-Text-Extraktion (`unpdf`)**
      `unpdf` per `pnpm add unpdf` installieren. `src/lib/legal/pdf-extract.ts` anlegen:
      `extractPdfText(fileUrl: string): Promise<string>` — lädt die Blob-URL per `fetch`,
      übergibt den Buffer an `unpdf`s `extractText`, gibt den zusammengefügten Rohtext
      zurück (kein Heading-/Paragraph-Parsing). Bei Fetch-Fehler oder leerem Text einen
      sprechenden Error werfen. Test `src/lib/legal/pdf-extract.test.ts`: `unpdf` und
      `global.fetch` mocken (siehe Annahmen), prüft Erfolgsfall + Fehlerfall
      (Fetch schlägt fehl → Error).
      _Definition of Done:_ Test grün, Funktion typisiert exportiert.
      `git commit -m "feat: add pdf text extraction via unpdf"`

- [x] **6. Queries `src/lib/legal/legal.ts`**
      `getLegalDocument(slug: string)` (liest per `prisma.legalDocument.findUnique`,
      `null` bei unbekanntem Slug) und `listAllLegalDocumentsForAdmin()` (alle vier,
      sortiert nach fester Slug-Reihenfolge oder `title`) implementieren. Test
      `src/lib/legal/legal.test.ts` (Prisma gemockt wie in `downloads.test.ts`): korrektes
      Dokument je Slug, `null` bei unbekanntem Slug, Admin-Liste enthält alle Einträge.
      _Definition of Done:_ Beide Funktionen typisiert exportiert, Tests grün.
      `git commit -m "feat: add legal document queries"`

- [x] **7. Server Actions `src/lib/legal/actions.ts`**
      `getLegalUploadToken(pathname)` (analog `getDownloadUploadToken`, eigener Prefix
      `"legal"`, `allowedContentTypes: ["application/pdf"]`), `extractLegalPdfText(fileUrl)`
      (Permission-Check + Aufruf von `extractPdfText`, gibt Rohtext zurück, kein DB-Write),
      `saveLegalDocument(slug, title, sections, pdfFileUrl?)` (Permission-Check,
      Zod-Validierung der `sections`-Form, `prisma.legalDocument.upsert`, bei
      PDF-Ersatz `deleteBlobs([alte fileUrl])` wie in `replaceDownloadFile`,
      `revalidatePath("/rechtliches/[slug]")` + `revalidatePath("/admin/legal")`).
      Test `src/lib/legal/actions.test.ts` (Mocks analog `downloads/actions.test.ts`):
      Permission-Check greift bei fehlender Berechtigung, `deleteBlobs` wird bei
      PDF-Ersatz aufgerufen, invalide `sections`-Form wird abgelehnt.
      _Definition of Done:_ Alle drei Actions typisiert exportiert, Tests grün.
      `git commit -m "feat: add legal document server actions"`

- [x] **8. Öffentliche Detailseite auf DB umstellen**
      `src/app/rechtliches/[slug]/page.tsx`: `getLegalDocument(slug)` statt
      `LEGAL_DOCS`/`LEGAL_CONTENT`, `generateStaticParams` weiterhin über die vier festen
      Slugs (aus `LEGAL_DOCS`, das als reine Slug/Titel-Liste bestehen bleibt).
      `legal-doc-view.tsx` bekommt optionales Prop `pdfFileUrl?: string` und zeigt bei
      vorhandenem Wert einen "PDF herunterladen"-Button neben dem Titel (gleiches
      `<Button><a href download></a></Button>`-Muster wie in `downloads-view.tsx`).
      `src/data/legal.ts` auf den reinen `LegalSection`-Typ reduzieren (`LEGAL_CONTENT`
      entfernen).
      _Definition of Done:_ `/rechtliches/[slug]` rendert für alle vier Slugs identisch
      zum bisherigen Stand (manuelle Prüfung per `pnpm run dev`), `pnpm run typecheck`
      grün (kein verwaister Import von `LEGAL_CONTENT`).
      `git commit -m "feat: read legal document sections from database"`

- [x] **9. Admin-UI `/admin/legal`**
      `src/components/feature/admin-legal/admin-legal-view.tsx` (Liste der vier Slugs,
      Titel, PDF-Status vorhanden/fehlt, Link zum Editor) und
      `legal-document-editor.tsx` (PDF-Upload über `useBlobUpload` +
      `getLegalUploadToken`, danach `extractLegalPdfText`-Aufruf und Anzeige des
      Rohtexts read-only zum Copy-Paste; darunter Sections-Editor mit
      Hinzufügen/Entfernen/Drag-&-Drop-Reorder, `TextField` für Heading,
      Mehrzeilen-Textarea für Paragraphs, Speichern-Button ruft `saveLegalDocument`
      über `useAction()`). Route `src/app/admin/legal/page.tsx` mit
      `requireAdmin()`-Guard (bzw. Permission-Check `legal:manage`, falls im Repo üblich
      — an bestehendem `/admin/downloads`-Muster orientieren). Eintrag in
      `src/lib/utils/nav-config.ts` unter `"Administration"` (`minTier: "admin"`,
      Icon z. B. `Scale` aus `lucide-react`).
      _Definition of Done:_ Route lädt für Admin, ist für Nicht-Admins gesperrt (manuell
      geprüft), Speichern schreibt sichtbar in die DB (manuell geprüft per
      `pnpm run dev`). UI-Komponenten sind vom Coverage-Scope ausgenommen, daher kein
      Pflicht-Unit-Test für diesen Schritt.
      `git commit -m "feat: add admin UI for legal document management"`

- [x] **10. Verify & Aufräumen**
      `pnpm run verify` (format:check + typecheck + lint + test) ausführen und alle
      Findings beheben. Prüfen, ob `docs/project-structure.md` durch das neue
      `src/lib/legal/`- und `src/components/feature/admin-legal/`-Verzeichnis ergänzt
      werden muss, ggf. anpassen. Prüfen, ob `src/data/downloads.ts` (`LEGAL_DOCS`)
      noch korrekt referenziert wird (bleibt laut Vorgabe unverändert).
      _Definition of Done:_ `pnpm run verify` komplett grün.
      `git commit -m "chore: update project structure docs for legal document management"`

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Sonnet 5)
- **Reasoning/Thinking:** an, mittlerer Effort — die Schritte folgen zwar einem klaren
  bestehenden Muster (Downloads-Feature), enthalten aber mehrere nicht-triviale
  Kopplungspunkte (Blob-Upload+Delete-Reihenfolge bei PDF-Ersatz, Zod-Validierung von
  `Json`-Feldern, Migration von statischem TS-Objekt zu DB-Zeilen ohne Datenverlust), die
  sorgfältiges Nachdenken statt reines Abtippen brauchen.
- **Begründung:** Der Plan ist Standard-CRUD-plus-Datei-Upload in einem bereits etablierten
  Next.js/Prisma-Stack mit einem klaren Vorbild (`downloads`-Feature) — kein Fall für
  Opus, aber auch nicht rein mechanisch genug für Haiku (Zod-Schema-Design,
  Drag-&-Drop-Reorder-State, Fehlerpfade beim PDF-Ersatz erfordern Kontextverständnis).
