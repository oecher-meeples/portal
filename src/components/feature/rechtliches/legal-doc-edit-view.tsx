"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LegalDocumentEditor,
  toEditable,
  toSections,
  type EditableSection,
  type LegalDocumentRow,
} from "@/components/feature/rechtliches/legal-document-editor";
import { LegalDocView } from "@/components/feature/rechtliches/legal-doc-view";

/** Edit page for a single Rechtliches document. Two tabs share one draft —
 * title/sections/pdfFileUrl live here, not inside `LegalDocumentEditor`,
 * because the Tabs component unmounts the inactive panel: state owned by
 * the editor itself would reset to `doc` every time you switch back from
 * "Vorschau". "Vorschau" renders the exact same `LegalDocView` the public
 * page uses, fed with this live, unsaved draft instead of what's stored —
 * so it always matches what publishing would look like. */
export function LegalDocEditView({ doc }: { doc: LegalDocumentRow }) {
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [pdfFileUrl, setPdfFileUrl] = useState(doc.pdfFileUrl ?? undefined);
  const [sections, setSections] = useState<EditableSection[]>(
    toEditable(doc.sections),
  );
  const [extractedText, setExtractedText] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="Rechtliches" title={`${doc.title} bearbeiten`} />
      <Tabs defaultValue="edit">
        <div className="bg-background sticky top-16 z-20 border-b py-3">
          <TabsList>
            <TabsTrigger value="edit">Bearbeiten</TabsTrigger>
            <TabsTrigger value="preview">Vorschau</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="edit">
          <LegalDocumentEditor
            doc={doc}
            title={title}
            onTitleChange={setTitle}
            sections={sections}
            onSectionsChange={setSections}
            pdfFileUrl={pdfFileUrl}
            onPdfFileUrlChange={setPdfFileUrl}
            extractedText={extractedText}
            onExtractedTextChange={setExtractedText}
            onSaved={() => router.push(`/rechtliches/${doc.slug}`)}
          />
        </TabsContent>
        <TabsContent value="preview">
          <LegalDocView
            doc={{ slug: doc.slug, title }}
            sections={toSections(sections)}
            pdfFileUrl={pdfFileUrl}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
