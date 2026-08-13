# Aufgabe: Rechtliches-Dokumente als PDF verwalten (mit Text-Extraktion)

## Ziel

Der Vorstand pflegt Satzung/Datenschutzerklärung/Impressum/Beitragsordnung als
PDF. Diese PDF soll als Datei-Download angeboten werden — **und** ihr
Textinhalt soll weiterhin in der bestehenden Section-Darstellung
(`/rechtliches/[slug]`, Inhaltsverzeichnis + Überschriften) erscheinen, ohne
dass jemand die Sections händisch als TS-Code pflegt.

Entscheidung (mit dem Nutzer abgestimmt): **keine automatische KI-Gliederung**
der PDF in Heading/Paragraphs. Es wird nur der reine Text aus der PDF
extrahiert; der Vorstand/Admin baut die Sections im Admin-Formular selbst
zusammen (Copy-Paste aus dem extrahierten Text in Heading-/Paragraph-Felder).

## Ist-Zustand (bereits recherchiert, nicht erneut erforschen)

- `LEGAL_CONTENT: Record<string, LegalSection[]>` in
  [src/data/legal.ts](../../src/data/legal.ts) ist statischer TS-Code.
  `LegalSection = { id, heading, paragraphs: string[], links?: {label,href}[] }`.
- `LEGAL_DOCS: LegalDoc[]` (`{slug, title}`) in
  [src/data/downloads.ts](../../src/data/downloads.ts) — nur Titel/Slug-Liste,
  bleibt als Konzept bestehen, wandert aber inhaltlich in die DB (siehe unten).
- Darstellung: [src/app/rechtliches/[slug]/page.tsx](../../src/app/rechtliches/[slug]/page.tsx)
  liest `LEGAL_DOCS` + `LEGAL_CONTENT[slug]`, rendert über
  [legal-doc-view.tsx](../../src/components/feature/rechtliches/legal-doc-view.tsx).
  Diese Darstellung bleibt **inhaltlich unverändert** — sie soll nur aus der
  DB statt aus dem statischen Objekt lesen.
- Das vorherige Feature "Downloads-Verwaltung für Admins"
  (`downloads-admin-management-task.md`) ist bereits umgesetzt: Prisma-Modell
  `Download` (`title`, `fileUrl`, `fileType`, `fileSizeBytes`, `status
  DownloadStatus`), Permission `downloads:manage`, Blob-Upload-Flow
  (`useBlobUpload` + `getDownloadUploadToken` in
  `src/lib/downloads/actions.ts`, `normaliseBlobPath`,
  `generateClientTokenFromReadWriteToken`), Admin-Route `/admin/downloads`
  mit `AdminDownloadsView` + `DownloadUploadForm`. Dieses Feature bleibt
  unverändert — `Download`/`downloads:manage` ist für generische Anhänge
  (Mitgliedsantrag, SEPA-Mandat, …), **nicht** für die vier Rechtliches-Docs.
  Das neue `LegalDocument`-Modell hier ist bewusst getrennt, weil es
  zusätzlich strukturierte `sections` braucht und pro Slug eindeutig ist
  (kein Liste-mit-Status wie bei generischen Downloads).
- Kein PDF-Parsing-Paket ist aktuell installiert.

## Vorgegebene technische Entscheidungen

1. **Neues Prisma-Modell** `LegalDocument`:
   - `id String @id @default(cuid())`
   - `slug String @unique` (`satzung`, `datenschutz`, `impressum`,
     `beitragsordnung` — feste Werte wie bisher in `LEGAL_DOCS`)
   - `title String`
   - `sections Json` (Form von `LegalSection[]`, siehe oben — Typ bleibt in
     `src/data/legal.ts` als Type-Export erhalten, nur das `LEGAL_CONTENT`-
     Objekt entfällt)
   - `pdfFileUrl String?` (Vercel-Blob-URL der zuletzt hochgeladenen PDF;
     optional, weil nicht jedes Dokument sofort eine PDF haben muss)
   - `updatedAt DateTime @updatedAt`
   - Migration gegen die Neon-Dev-DB (`prisma migrate dev`).

2. **Neue Permission** `legal:manage` in `prisma/seed.ts`
   (`PERMISSIONS`-Array ergänzen, Rolle `admin`), Beschreibung z. B.
   "Rechtliches-Dokumente verwalten (PDF hochladen, Sections bearbeiten)".

3. **PDF-Text-Extraktion**: Paket `unpdf` (serverless-/edge-freundlich, keine
   nativen Abhängigkeiten, passt zu Vercel) hinzufügen. Neue Funktion
   `extractPdfText(fileUrl: string): Promise<string>` in
   `src/lib/legal/pdf-extract.ts` — lädt die Blob-URL, extrahiert reinen Text
   (keine Gliederungslogik, keine Heuristik für Überschriften).

4. **Upload-Flow** (analog zu Downloads, aber eigener Pfad-Prefix `legal` und
   eigene Server Action, da eigene Permission):
   - `getLegalUploadToken(pathname)` in `src/lib/legal/actions.ts` —
     `generateClientTokenFromReadWriteToken`, `allowedContentTypes:
     ["application/pdf"]`, `normaliseBlobPath(pathname, "legal")`.
   - `extractLegalPdfText(fileUrl: string)` Server Action — ruft
     `extractPdfText` auf, gibt den Rohtext ans Admin-Formular zurück (nur
     zum Anzeigen/Copy-Paste, kein automatisches Befüllen von Sections).
   - `saveLegalDocument(slug, title, sections, pdfFileUrl?)` Server Action —
     upsert auf `LegalDocument`, `hasPermission(user.id, "legal:manage")`.
     Bei Ersetzen einer alten PDF: `deleteBlobs([alte fileUrl])` wie im
     Downloads-Feature, um keine verwaisten Blobs zurückzulassen.

5. **Queries** in `src/lib/legal/legal.ts`:
   - `getLegalDocument(slug: string)` — für die öffentliche Detailseite.
   - `listAllLegalDocumentsForAdmin()` — für die Admin-Übersicht.

6. **Admin-UI** `src/components/feature/admin-legal/`:
   - `admin-legal-view.tsx` — Liste der vier Slugs mit Titel, PDF-Status
     (vorhanden/fehlt), Link zum Editor.
   - `legal-document-editor.tsx` — pro Slug: PDF-Upload (zeigt danach den
     extrahierten Rohtext read-only zum Abschreiben/Copy-Paste), darunter ein
     Sections-Editor: Liste von `{heading, paragraphs}`-Blöcken mit
     Hinzufügen/Entfernen/Neu-Sortieren, `TextField` für Heading,
     Mehrzeilen-Textarea für Paragraphs (ein Absatz pro Zeile), Speichern-
     Button ruft `saveLegalDocument`.
   - Neue Route `src/app/admin/legal/page.tsx` (`requireAdmin()`-Guard),
     Eintrag in `nav-config.ts` (`minTier: "admin"`), analog zu
     `/admin/downloads`.

7. **Öffentliche Seite umstellen**:
   - `src/app/rechtliches/[slug]/page.tsx`: `getLegalDocument(slug)` statt
     `LEGAL_DOCS`/`LEGAL_CONTENT`. `generateStaticParams` weiterhin über die
     vier festen Slugs (kein dynamisches Anlegen neuer Slugs im Scope dieser
     Aufgabe).
   - `legal-doc-view.tsx` bekommt optional `pdfFileUrl` und zeigt — analog
     zum bestehenden `<Button><a href download></a></Button>`-Muster in
     `downloads-view.tsx` — einen "PDF herunterladen"-Button neben dem Titel,
     wenn eine PDF hinterlegt ist.
   - `downloads-view.tsx`/`src/app/downloads/page.tsx`: Rechtliches-Spalte
     liest weiterhin nur `slug`+`title` (aus `LEGAL_DOCS`, unverändert, reine
     Navigations-Liste) — keine Änderung nötig, da Detailseite ja jetzt aus
     der DB kommt.

8. **Datenmigration Bestandsinhalte**: Die vier aktuellen Einträge aus
   `LEGAL_CONTENT` werden per Seed (`prisma/seed-data/demo-legal-documents.ts`
   + Eintrag in `prisma/seed.ts`) als `LegalDocument`-Zeilen mit
   `pdfFileUrl: null` angelegt, damit nach der Migration kein Inhalt
   verschwindet. `src/data/legal.ts` wird danach auf den reinen
   `LegalSection`-Typ reduziert (kein `LEGAL_CONTENT`-Objekt mehr).

9. **Tests**: `src/lib/legal/legal.test.ts` (Query gibt korrektes Dokument je
   Slug zurück, `null` bei unbekanntem Slug), `src/lib/legal/actions.test.ts`
   (Permission-Check greift, `deleteBlobs` wird bei PDF-Ersatz aufgerufen) —
   analog zu `src/lib/downloads/downloads.test.ts` /
   `src/components/feature/admin-news/actions.test.ts`.

## Abgrenzung (explizit außerhalb des Scopes)

- Keine automatische KI-Gliederung des PDF-Texts in Sections — bewusste
  Entscheidung, da Satzung/Datenschutzerklärung bindende Texte sind und eine
  automatisch geratene Absatz-/Überschriften-Grenze ein Risiko für falschen
  Wortlaut auf der öffentlichen Seite wäre.
- Kein dynamisches Anlegen neuer Rechtliches-Slugs über die Admin-UI — die
  vier Slugs bleiben fest (wie bisher in `LEGAL_DOCS`).
- Keine Versionierung/Historie der PDFs (keine "alte Version einsehen") — ein
  `LegalDocument` hat genau eine aktuelle PDF plus einen aktuellen
  Section-Stand.
- Keine Änderungen am generischen `Download`-Feature (`/admin/downloads`,
  `downloads:manage`) — bleibt komplett getrennt.
