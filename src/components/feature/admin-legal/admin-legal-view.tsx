"use client";

import { useState } from "react";
import { FileCheck2, FileX2 } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import type { LegalSection } from "@/data/legal";
import { LegalDocumentEditor } from "@/components/feature/admin-legal/legal-document-editor";

export type AdminLegalDocumentRow = {
  slug: string;
  title: string;
  sections: LegalSection[];
  pdfFileUrl: string | null;
};

export function AdminLegalView({
  documents,
}: {
  documents: AdminLegalDocumentRow[];
}) {
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const editing = documents.find((doc) => doc.slug === editingSlug) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Administration"
        title="Rechtliches-Dokumente"
        description="Satzung, Datenschutzerklärung, Impressum und Beitragsordnung: PDF hochladen und Sections pflegen."
      />

      <div className="bg-card flex flex-col divide-y rounded-lg border">
        {documents.map((doc) => (
          <div
            key={doc.slug}
            className="flex items-center justify-between gap-4 p-4"
          >
            <div className="flex items-center gap-3">
              {doc.pdfFileUrl ? (
                <FileCheck2 className="size-5 text-emerald-600" />
              ) : (
                <FileX2 className="text-muted-foreground size-5" />
              )}
              <div>
                <p className="font-medium">{doc.title}</p>
                <p className="text-muted-foreground text-xs">
                  {doc.pdfFileUrl ? "PDF vorhanden" : "Keine PDF hinterlegt"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setEditingSlug(editingSlug === doc.slug ? null : doc.slug)
              }
            >
              {editingSlug === doc.slug ? "Schließen" : "Bearbeiten"}
            </Button>
          </div>
        ))}
      </div>

      {editing && (
        <LegalDocumentEditor
          key={editing.slug}
          doc={editing}
          onSaved={() => setEditingSlug(null)}
        />
      )}
    </div>
  );
}
