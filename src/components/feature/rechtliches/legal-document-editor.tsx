"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField, TextAreaField } from "@/components/ui/field";
import { FileField } from "@/components/ui/file-field";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/components/ui/use-action";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import { slugify } from "@/lib/utils/slug";
import {
  getLegalUploadToken,
  extractLegalPdfText,
  saveLegalDocument,
} from "@/lib/legal/actions";
import type { LegalSection } from "@/data/legal";

export type LegalDocumentRow = {
  slug: string;
  title: string;
  sections: LegalSection[];
  pdfFileUrl: string | null;
};

/** Section shape while it's being edited — `paragraphs` stays one string
 * (one paragraph per line) so a single Textarea can hold it, and only
 * splits back into `string[]` on save. */
export type EditableSection = {
  id: string;
  heading: string;
  paragraphsText: string;
  links?: { label: string; href: string }[];
};

export function toEditable(sections: LegalDocumentRow["sections"]) {
  return sections.map((section) => ({
    id: section.id,
    heading: section.heading,
    paragraphsText: section.paragraphs.join("\n"),
    links: section.links,
  }));
}

export function toSections(sections: EditableSection[]): LegalSection[] {
  return sections.map((section) => ({
    id: section.id,
    heading: section.heading,
    paragraphs: section.paragraphsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
    links: section.links,
  }));
}

/** Insert-here affordance placed before the first, between every pair, and
 * after the last section — centered, not full-width, so it doesn't read as
 * part of the section cards themselves. */
function InsertSectionButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex justify-center">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClick}
        className="text-muted-foreground hover:text-foreground"
      >
        <Plus className="size-3.5" />
        Section hier hinzufügen
      </Button>
    </div>
  );
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
  title,
  onTitleChange,
  sections,
  onSectionsChange,
  pdfFileUrl,
  onPdfFileUrlChange,
  extractedText,
  onExtractedTextChange,
  onSaved,
}: {
  doc: LegalDocumentRow;
  title: string;
  onTitleChange: (title: string) => void;
  sections: EditableSection[];
  onSectionsChange: (
    updater: (prev: EditableSection[]) => EditableSection[],
  ) => void;
  pdfFileUrl?: string;
  onPdfFileUrlChange: (url?: string) => void;
  extractedText: string | null;
  onExtractedTextChange: (text: string | null) => void;
  onSaved: () => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [textSelection, setTextSelection] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);

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

    onPdfFileUrlChange(fileUrl);
    await runExtract(async () => {
      const result = await extractLegalPdfText(fileUrl);
      if (result && "text" in result) onExtractedTextChange(result.text);
      return result;
    });
  }

  function handleExtractedTextSelect(
    event: React.SyntheticEvent<HTMLTextAreaElement>,
  ) {
    const el = event.currentTarget;
    if (el.selectionStart === el.selectionEnd) {
      setTextSelection(null);
      return;
    }
    setTextSelection({
      text: el.value.slice(el.selectionStart, el.selectionEnd),
      start: el.selectionStart,
      end: el.selectionEnd,
    });
  }

  /** Removes the just-used selection from the extracted-text scratchpad, so
   * working through a PDF top-to-bottom consumes it as you go. */
  function consumeTextSelection() {
    if (!textSelection || extractedText === null) return;
    onExtractedTextChange(
      extractedText.slice(0, textSelection.start) +
        extractedText.slice(textSelection.end),
    );
    setTextSelection(null);
  }

  function useSelectionAsTitle() {
    if (!textSelection) return;
    onTitleChange(textSelection.text.trim().replace(/\s+/g, " "));
    consumeTextSelection();
  }

  function pushSelectionToNewSection() {
    if (!textSelection) return;
    const lines = textSelection.text.split("\n");
    const heading = lines[0]?.trim() || "Neue Section";
    const paragraphsText = lines
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");
    const id = uniqueLocalId(
      heading,
      sections.map((s) => s.id),
    );
    onSectionsChange((prev) => [...prev, { id, heading, paragraphsText }]);
    consumeTextSelection();
  }

  function updateSection(id: string, patch: Partial<EditableSection>) {
    onSectionsChange((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, ...patch } : section,
      ),
    );
  }

  function addSectionAt(index: number) {
    const id = uniqueLocalId(
      "neue-section",
      sections.map((s) => s.id),
    );
    onSectionsChange((prev) => {
      const next = [...prev];
      next.splice(index, 0, {
        id,
        heading: "Neue Section",
        paragraphsText: "",
      });
      return next;
    });
  }

  function removeSection(id: string) {
    onSectionsChange((prev) => prev.filter((section) => section.id !== id));
  }

  function moveSection(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    onSectionsChange((prev) => {
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
    void runSave(() =>
      saveLegalDocument(doc.slug, title, toSections(sections), pdfFileUrl),
    );
  }

  const error = uploadError || extractError || saveError;

  return (
    <div className="bg-muted/30 flex flex-col gap-6 rounded-lg border p-4">
      <TextField
        id={`legal-title-${doc.slug}`}
        label="Titel"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
      />

      <div className="flex flex-col gap-2">
        <FileField
          id={`legal-pdf-${doc.slug}`}
          label="PDF hochladen (ersetzt die aktuelle Datei)"
          accept="application/pdf"
          disabled={isUploading || extracting}
          onFilesSelected={(files) => void handleUpload(files[0] ?? null)}
        />
        {(isUploading || extracting) && (
          <p className="text-muted-foreground text-sm">
            {isUploading ? "Lade hoch…" : "Extrahiere Text…"}
          </p>
        )}
        {pdfFileUrl && !isUploading && (
          <p className="text-muted-foreground text-xs">
            Aktuelle Datei:{" "}
            <a
              href={pdfFileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              ansehen
            </a>
          </p>
        )}
        {extractedText && (
          <div className="flex flex-col gap-1.5">
            <p className="text-muted-foreground text-xs">
              Extrahierter Rohtext — Text markieren, um ihn direkt zu
              übernehmen:
            </p>
            <Textarea
              value={extractedText}
              readOnly
              rows={8}
              onSelect={handleExtractedTextSelect}
            />
            {textSelection && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={useSelectionAsTitle}
                >
                  Als Titel verwenden
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={pushSelectionToNewSection}
                >
                  In neue Section am Ende schieben
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Sections</p>
        <InsertSectionButton onClick={() => addSectionAt(0)} />
        {sections.map((section, index) => (
          <div key={section.id} className="flex flex-col gap-3">
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => moveSection(section.id)}
              className="bg-card flex flex-col gap-2 rounded-md border p-3"
            >
              <div className="flex items-center gap-2">
                <span
                  draggable
                  onDragStart={() => setDraggedId(section.id)}
                  className="cursor-grab"
                >
                  <GripVertical
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <TextField
                    id={`legal-heading-${section.id}`}
                    label="Überschrift"
                    value={section.heading}
                    onChange={(event) =>
                      updateSection(section.id, {
                        heading: event.target.value,
                      })
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
            <InsertSectionButton onClick={() => addSectionAt(index + 1)} />
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
