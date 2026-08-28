"use client";

import { TextField, TextAreaField } from "@/components/ui/field";

export function SparePartListingFields({
  title,
  onTitleChange,
  condition,
  onConditionChange,
  description,
  onDescriptionChange,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  condition: string;
  onConditionChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
}) {
  return (
    <>
      <TextField
        id="spare-part-listing-title"
        label="Titel"
        placeholder="z. B. Siedler von Catan (Ausschlachtung)"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        required
      />
      <TextField
        id="spare-part-listing-condition"
        label="Zustand"
        placeholder="z. B. beschädigt, unvollständig, gemischt"
        value={condition}
        onChange={(event) => onConditionChange(event.target.value)}
        required
      />
      <TextAreaField
        id="spare-part-listing-description"
        label="Beschreibung"
        rows={3}
        placeholder="Was ist noch da, was fehlt?"
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
      />
    </>
  );
}
