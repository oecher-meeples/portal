"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField, TextAreaField } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/components/ui/use-action";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import { slugify } from "@/lib/utils/slug";
import {
  getLegalUploadToken,
  extractLegalPdfText,
  saveLegalDocument,
} from "@/lib/legal/actions";
import type { AdminLegalDocumentRow } from "@/components/feature/admin-legal/admin-legal-view";

/** Section shape while it's being edited — `paragraphs` stays one string
 * (one paragraph per line) so a single Textarea can hold it, and only
 * splits back into `string[]` on save. */
type EditableSection = {
  id: string;
  heading: string;
  paragraphsText: string;
  links?: { label: string; href: string }[];
};

function toEditable(sections: AdminLegalDocumentRow["sections"]) {
  return sections.map((section) => ({
    id: section.id,
    heading: section.heading,
    paragraphsText: section.paragraphs.join("\n"),
    links: section.links,
  }));
}

/** Local id derivation from the heading, matching `uniqueSlug`'s -2/-3
 * suffixing but against the sections already in the editor, not the DB
 * (see the plan's "Getroffene Annahmen"). */
function uniqueLocalId(heading: string, existingIds: string[]) {
  const base = slugify(heading) || "section";
  let id = base;
  let suffix = 2;
  while (existingIds.includes(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

export function LegalDocumentEditor({
  doc,
  onSaved,
}: {
  doc: AdminLegalDocumentRow;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [pdfFileUrl, setPdfFileUrl] = useState(doc.pdfFileUrl ?? undefined);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [sections, setSections] = useState<EditableSection[]>(
    toEditable(doc.sections),
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const {
    uploadFiles,
    isUploading,
    error: uploadError,
  } = useBlobUpload("legal", getLegalUploadToken);
  const {
    run: runExtract,
    pending: extracting,
    error: extractError,
  } = useAction({ refresh: false });
  const {
    run: runSave,
    pending: saving,
    error: saveError,
  } = useAction({
    refresh: false,
    onSuccess: onSaved,
  });

  async function handleUpload(file: File | null) {
    if (!file) return;
    const [fileUrl] = await uploadFiles([file]);
    if (!fileUrl) return;

    setPdfFileUrl(fileUrl);
    await runExtract(async () => {
      const result = await extractLegalPdfText(fileUrl);
      if (result && "text" in result) setExtractedText(result.text);
      return result;
    });
  }

  function updateSection(id: string, patch: Partial<EditableSection>) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, ...patch } : section,
      ),
    );
  }

  function addSection() {
    const id = uniqueLocalId(
      "neue-section",
      sections.map((s) => s.id),
    );
    setSections((prev) => [
      ...prev,
      { id, heading: "Neue Section", paragraphsText: "" },
    ]);
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((section) => section.id !== id));
  }

  function moveSection(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    setSections((prev) => {
      const next = [...prev];
      const fromIndex = next.findIndex((s) => s.id === draggedId);
      const toIndex = next.findIndex((s) => s.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDraggedId(null);
  }

  function handleSave() {
    const payload = sections.map((section) => ({
      id: section.id,
      heading: section.heading,
      paragraphs: section.paragraphsText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
      links: section.links,
    }));

    void runSave(() => saveLegalDocument(doc.slug, title, payload, pdfFileUrl));
  }

  const error = uploadError || extractError || saveError;

  return (
    <div className="bg-muted/30 flex flex-col gap-6 rounded-lg border p-4">
      <TextField
        id={`legal-title-${doc.slug}`}
        label="Titel"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />

      <div className="flex flex-col gap-2">
        <label
          className="text-sm font-medium"
          htmlFor={`legal-pdf-${doc.slug}`}
        >
          PDF hochladen (ersetzt die aktuelle Datei)
        </label>
        <input
          id={`legal-pdf-${doc.slug}`}
          type="file"
          accept="application/pdf"
          onChange={(event) => {
            void handleUpload(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
        {(isUploading || extracting) && (
          <p className="text-muted-foreground text-sm">
            {isUploading ? "Lade hoch…" : "Extrahiere Text…"}
          </p>
        )}
        {extractedText && (
          <div className="flex flex-col gap-1.5">
            <p className="text-muted-foreground text-xs">
              Extrahierter Rohtext (zum Abschreiben in die Sections unten):
            </p>
            <Textarea value={extractedText} readOnly rows={8} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Sections</p>
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="size-4" /> Section hinzufügen
          </Button>
        </div>
        {sections.map((section) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => setDraggedId(section.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => moveSection(section.id)}
            className="bg-card flex flex-col gap-2 rounded-md border p-3"
          >
            <div className="flex items-center gap-2">
              <GripVertical
                className="text-muted-foreground size-4 shrink-0 cursor-grab"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <TextField
                  id={`legal-heading-${section.id}`}
                  label="Überschrift"
                  value={section.heading}
                  onChange={(event) =>
                    updateSection(section.id, { heading: event.target.value })
                  }
                />
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeSection(section.id)}
                aria-label="Section entfernen"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <TextAreaField
              id={`legal-paragraphs-${section.id}`}
              label="Absätze (ein Absatz pro Zeile)"
              value={section.paragraphsText}
              onChange={(event) =>
                updateSection(section.id, {
                  paragraphsText: event.target.value,
                })
              }
              rows={4}
            />
          </div>
        ))}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Speichert…" : "Speichern"}
        </Button>
      </div>
    </div>
  );
}
