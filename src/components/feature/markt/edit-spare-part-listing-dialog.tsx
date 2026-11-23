"use client";

import { useState } from "react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { SparePartListingFields } from "@/components/feature/markt/spare-part-listing-fields";
import { updateSparePartListing } from "@/lib/inventory/spare-part-actions";
import type { SparePartListingView } from "@/lib/inventory/spare-parts";

export function EditSparePartListingDialog({
  part,
}: {
  part: SparePartListingView;
}) {
  const [title, setTitle] = useState(part.title);
  const [condition, setCondition] = useState(part.condition);
  const [description, setDescription] = useState(part.description ?? "");

  function reset() {
    setTitle(part.title);
    setCondition(part.condition);
    setDescription(part.description ?? "");
  }

  return (
    <ActionDialog
      trigger={
        <Button variant="outline" size="sm">
          Bearbeiten
        </Button>
      }
      title="Ersatzteillager-Eintrag bearbeiten"
      submitLabel="Änderungen speichern"
      canSubmit={Boolean(title.trim() && condition.trim())}
      action={() =>
        updateSparePartListing(part.id, { title, condition, description })
      }
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
