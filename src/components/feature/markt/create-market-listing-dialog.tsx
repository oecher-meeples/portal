"use client";

import { useState } from "react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextField, TextAreaField } from "@/components/ui/field";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import {
  createMarketListing,
  getMarketListingUploadToken,
} from "@/components/feature/markt/actions";

export function CreateMarketListingDialog() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceEuros, setPriceEuros] = useState("");
  const [condition, setCondition] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const { uploadFiles, isUploading, error: uploadError } = useBlobUpload(
    "market-listings",
    getMarketListingUploadToken,
  );

  function reset() {
    setTitle("");
    setDescription("");
    setPriceEuros("");
    setCondition("");
    setImageUrls([]);
  }

  async function handleImagesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const urls = await uploadFiles(files);
    setImageUrls((current) => [...current, ...urls]);
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
      <TextField
        id="market-listing-title"
        label="Titel"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />
      <TextField
        id="market-listing-price"
        label="Preis (€)"
        type="number"
        min={0}
        step={1}
        value={priceEuros}
        onChange={(event) => setPriceEuros(event.target.value)}
        required
      />
      <TextField
        id="market-listing-condition"
        label="Zustand"
        value={condition}
        onChange={(event) => setCondition(event.target.value)}
        required
      />
      <TextAreaField
        id="market-listing-description"
        label="Beschreibung"
        rows={3}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="market-listing-images">
          Bilder
        </label>
        <input
          id="market-listing-images"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          disabled={isUploading}
          onChange={handleImagesChange}
        />
        {isUploading && (
          <p className="text-muted-foreground text-sm">Lade Bilder hoch…</p>
        )}
        {uploadError && <p className="text-destructive text-sm">{uploadError}</p>}
        {imageUrls.length > 0 && (
          <p className="text-muted-foreground text-xs">
            {imageUrls.length} Bild(er) hochgeladen.
          </p>
        )}
      </div>
    </ActionDialog>
  );
}
