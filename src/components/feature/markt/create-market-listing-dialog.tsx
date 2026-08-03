"use client";

import { useState } from "react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { MarketListingFields } from "@/components/feature/markt/market-listing-fields";
import { createMarketListing } from "@/components/feature/markt/actions";

export function CreateMarketListingDialog() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceEuros, setPriceEuros] = useState("");
  const [condition, setCondition] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  function reset() {
    setTitle("");
    setDescription("");
    setPriceEuros("");
    setCondition("");
    setImageUrls([]);
  }

  return (
    <ActionDialog
      trigger={<Button size="sm">Anzeige inserieren</Button>}
      title="Anzeige inserieren"
      description="Kleinanzeige für alle Mitglieder – Kontakt läuft über dein Profil, nicht über das Portal."
      submitLabel="Anzeige erstellen"
      canSubmit={Boolean(title.trim() && condition.trim() && priceEuros)}
      action={() =>
        createMarketListing({
          title,
          description,
          priceEuros: Number(priceEuros),
          condition,
          imageUrls,
        })
      }
      onReset={reset}
    >
      <MarketListingFields
        title={title}
        onTitleChange={setTitle}
        priceEuros={priceEuros}
        onPriceEurosChange={setPriceEuros}
        condition={condition}
        onConditionChange={setCondition}
        description={description}
        onDescriptionChange={setDescription}
        imageUrls={imageUrls}
        onImageUrlsChange={setImageUrls}
      />
    </ActionDialog>
  );
}
