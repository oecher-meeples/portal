"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { slugify } from "@/lib/utils/slug";
import type { EditableSection } from "@/components/feature/rechtliches/legal-document-editor";

/** Local id derivation from the heading, matching `uniqueSlug`'s -2/-3
 * suffixing but against the sections already in the editor, not the DB
 * (see the plan's "Getroffene Annahmen"). */
export function uniqueLocalId(heading: string, existingIds: string[]) {
  const base = slugify(heading) || "section";
  let id = base;
  let suffix = 2;
  while (existingIds.includes(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

/**
 * Doubles as a click action (using the current textarea selection) and a
 * native drop target (dragging that same selection out of the textarea
 * and onto the button) — same handler either way, since both just need
 * the selection to still be current. Highlights while something is
 * dragged over it so the drop target reads as one.
 */
export function SelectionTargetButton({
  icon,
  label,
  disabled,
  onActivate,
}: {
  icon: ReactNode;
  label: string;
  disabled: boolean;
  onActivate: () => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={onActivate}
      onDragOver={(event) => event.preventDefault()}
      onDragEnter={() => setIsDragOver(true)}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        onActivate();
      }}
      className={cn(
        "h-auto min-h-16 w-full flex-col gap-1.5 border-2 border-dashed py-3 whitespace-normal",
        isDragOver && "border-primary bg-primary/10",
      )}
    >
      {icon}
      {label}
    </Button>
  );
}

type TextSelection = { text: string; start: number; end: number };

/**
 * Tracks a selection made in the extracted-PDF-text scratchpad and turns it
 * into either the document title or a brand-new section (see the
 * `SelectionTargetButton`s in `LegalDocumentEditor`'s left column). Either
 * action removes the used range from the scratchpad, so working through a
 * PDF top-to-bottom consumes it as you go.
 */
export function useTextSelectionActions({
  extractedText,
  onExtractedTextChange,
  onTitleChange,
  sections,
  onSectionsChange,
}: {
  extractedText: string | null;
  onExtractedTextChange: (text: string | null) => void;
  onTitleChange: (title: string) => void;
  sections: EditableSection[];
  onSectionsChange: (
    updater: (prev: EditableSection[]) => EditableSection[],
  ) => void;
}) {
  const [textSelection, setTextSelection] = useState<TextSelection | null>(
    null,
  );

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

  return {
    textSelection,
    handleExtractedTextSelect,
    useSelectionAsTitle,
    pushSelectionToNewSection,
  };
}
