"use client";

import { useRef, useState, type ReactNode } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";

/**
 * File input rendered as an actual button. A bare `<input type="file">`
 * renders the browser's own "Durchsuchen…"/"Choose file" chrome, which
 * doesn't read as a button in this design system — this hides that native
 * control and drives it from a proper `<Button>` instead, echoing the
 * chosen filename(s) next to it. Also accepts a drag & drop from the
 * desktop directly onto the field, for the same result (#186-Folge).
 *
 * Uncontrolled by design (matching the native input it wraps): pass a
 * changing `key` prop to clear the shown selection, e.g. after a
 * successful submit resets the caller's own file state.
 */
export function FileField({
  id,
  label,
  hint,
  accept,
  multiple,
  disabled,
  onFilesSelected,
  fieldClassName,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFilesSelected: (files: File[]) => void;
  fieldClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  function acceptFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length > 0) {
      setFileNames(files.map((file) => file.name));
      onFilesSelected(files);
    }
  }

  return (
    <Field label={label} htmlFor={id} hint={hint} className={fieldClassName}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md",
          isDragOver && "ring-primary ring-2 ring-offset-2",
        )}
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          if (disabled) return;
          event.preventDefault();
          setIsDragOver(false);
          acceptFiles(event.dataTransfer.files);
        }}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" />
          Datei auswählen
        </Button>
        {fileNames.length > 0 && (
          <span className="text-muted-foreground truncate text-sm">
            {fileNames.join(", ")}
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(event) => {
          acceptFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </Field>
  );
}
