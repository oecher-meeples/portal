"use client";

import { useState } from "react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { MarketListingFields } from "@/components/feature/markt/market-listing-fields";
import { updateOwnMarketListing } from "@/components/feature/markt/actions";
import type { MarketListingView } from "@/lib/markt/market-listings";

export function EditMarketListingDialog({
  listing,
}: {
  listing: MarketListingView;
}) {
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description ?? "");
  const [priceEuros, setPriceEuros] = useState(String(listing.priceEuros));
  const [condition, setCondition] = useState(listing.condition);
  const [imageUrls, setImageUrls] = useState<string[]>(listing.imageUrls);

  function reset() {
    setTitle(listing.title);
    setDescription(listing.description ?? "");
    setPriceEuros(String(listing.priceEuros));
    setCondition(listing.condition);
    setImageUrls(listing.imageUrls);
  }

  return (
    <ActionDialog
      trigger={
        <Button variant="outline" size="sm">
          Bearbeiten
        </Button>
      }
      title="Anzeige bearbeiten"
      submitLabel="Änderungen speichern"
      canSubmit={Boolean(title.trim() && condition.trim() && priceEuros)}
      action={() =>
        updateOwnMarketListing(listing.id, {
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
