"use client";

import { useState } from "react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { SparePartListingFields } from "@/components/feature/markt/spare-part-listing-fields";
import { createSparePartListing } from "@/lib/inventory/spare-part-actions";

export function CreateSparePartListingDialog() {
  const [title, setTitle] = useState("");
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");

  function reset() {
    setTitle("");
    setCondition("");
    setDescription("");
  }

  return (
    <ActionDialog
      trigger={<Button size="sm">Ins Ersatzteillager geben</Button>}
      title="Spiel ins Ersatzteillager geben"
      description="Bleibt bei dir als Verwahrer:in — Interessierte melden sich direkt bei dir, kein Eigentumsübergang."
      submitLabel="Eintrag anlegen"
      canSubmit={Boolean(title.trim() && condition.trim())}
      action={() => createSparePartListing({ title, condition, description })}
      onReset={reset}
    >
      <SparePartListingFields
        title={title}
        onTitleChange={setTitle}
        condition={condition}
        onConditionChange={setCondition}
        description={description}
        onDescriptionChange={setDescription}
      />
    </ActionDialog>
  );
}
