"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LegalSection } from "@/data/legal";
import {
  LegalDocumentEditor,
  type LegalDocumentRow,
} from "@/components/feature/rechtliches/legal-document-editor";
import { LegalDocView } from "@/components/feature/rechtliches/legal-doc-view";

/** Edit page for a single Rechtliches document. Two tabs share one draft:
 * "Vorschau" renders the exact same `LegalDocView` the public page uses,
 * fed with the live, unsaved edits instead of what's stored — so it always
 * matches what publishing would look like. */
export function LegalDocEditView({ doc }: { doc: LegalDocumentRow }) {
  const router = useRouter();
  const [draft, setDraft] = useState<{
    title: string;
    sections: LegalSection[];
    pdfFileUrl?: string;
  }>({
    title: doc.title,
    sections: doc.sections,
    pdfFileUrl: doc.pdfFileUrl ?? undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="Rechtliches" title={`${doc.title} bearbeiten`} />
      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Bearbeiten</TabsTrigger>
          <TabsTrigger value="preview">Vorschau</TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <LegalDocumentEditor
            doc={doc}
            onDraftChange={setDraft}
            onSaved={() => router.push(`/rechtliches/${doc.slug}`)}
          />
        </TabsContent>
        <TabsContent value="preview">
          <LegalDocView
            doc={{ slug: doc.slug, title: draft.title }}
            sections={draft.sections}
            pdfFileUrl={draft.pdfFileUrl}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
