"use client";

import { useRef, useState, type ReactNode } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

/**
 * File input rendered as an actual button. A bare `<input type="file">`
 * renders the browser's own "Durchsuchen…"/"Choose file" chrome, which
 * doesn't read as a button in this design system — this hides that native
 * control and drives it from a proper `<Button>` instead, echoing the
 * chosen filename(s) next to it.
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

  return (
    <Field label={label} htmlFor={id} hint={hint} className={fieldClassName}>
      <div className="flex items-center gap-2">
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
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) {
            setFileNames(files.map((file) => file.name));
            onFilesSelected(files);
          }
          event.target.value = "";
        }}
      />
    </Field>
  );
}
