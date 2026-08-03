"use client";

import { TextField, TextAreaField } from "@/components/ui/field";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import { getMarketListingUploadToken } from "@/components/feature/markt/actions";

export function MarketListingFields({
  title,
  onTitleChange,
  priceEuros,
  onPriceEurosChange,
  condition,
  onConditionChange,
  description,
  onDescriptionChange,
  imageUrls,
  onImageUrlsChange,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  priceEuros: string;
  onPriceEurosChange: (value: string) => void;
  condition: string;
  onConditionChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  imageUrls: string[];
  onImageUrlsChange: (urls: string[]) => void;
}) {
  const {
    uploadFiles,
    isUploading,
    error: uploadError,
  } = useBlobUpload("market-listings", getMarketListingUploadToken);

  async function handleImagesChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const urls = await uploadFiles(files);
    onImageUrlsChange([...imageUrls, ...urls]);
  }

  return (
    <>
      <TextField
        id="market-listing-title"
        label="Titel"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        required
      />
      <TextField
        id="market-listing-price"
        label="Preis (€)"
        type="number"
        min={0}
        step={1}
        value={priceEuros}
        onChange={(event) => onPriceEurosChange(event.target.value)}
        required
      />
      <TextField
        id="market-listing-condition"
        label="Zustand"
        value={condition}
        onChange={(event) => onConditionChange(event.target.value)}
        required
      />
      <TextAreaField
        id="market-listing-description"
        label="Beschreibung"
        rows={3}
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
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
        {uploadError && (
          <p className="text-destructive text-sm">{uploadError}</p>
        )}
        {imageUrls.length > 0 && (
          <p className="text-muted-foreground text-xs">
            {imageUrls.length} Bild(er) hochgeladen.
          </p>
        )}
      </div>
    </>
  );
}
