"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScanSearchDialog } from "@/components/ui/scan-search-dialog";

/** The EAN input plus its scan icon — shared by every place a BoardGame's
 * EAN is edited (create/edit dialogs, manual and BGG mode, see #121/#122). */
export function EanField({
  idPrefix,
  value,
  onChange,
  fieldClassName,
}: {
  idPrefix: string;
  value: string;
  onChange: (value: string) => void;
  fieldClassName?: string;
}) {
  return (
    <Field
      label="EAN"
      htmlFor={`${idPrefix}-ean`}
      hint="Mehrere Spiele desselben Titels dürfen dieselbe EAN tragen."
      className={fieldClassName}
    >
      <div className="flex gap-2">
        <Input
          id={`${idPrefix}-ean`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="optional, vom Barcode auf der Schachtel"
        />
        <ScanSearchDialog onScanned={onChange} />
      </div>
    </Field>
  );
}
