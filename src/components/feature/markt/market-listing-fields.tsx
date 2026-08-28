"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { TextField, TextAreaField } from "@/components/ui/field";
import { FileField } from "@/components/ui/file-field";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/ui/camera-capture";
import { CoverMedia } from "@/components/ui/cover-media";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import { compressImage } from "@/lib/utils/compress-image";
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
  const [showCamera, setShowCamera] = useState(false);

  async function handleImagesChange(files: File[]) {
    const urls = await uploadFiles(files);
    onImageUrlsChange([...imageUrls, ...urls]);
  }

  /** Direkte Kamera-Aufnahme statt Datei-Auswahl (#108) — Foto wird wie ein
   * hochgeladenes Bild behandelt: komprimiert, zu Blob Store hochgeladen,
   * imageUrls ergänzt. */
  async function handleCameraCapture(file: File) {
    setShowCamera(false);
    const compressed = await compressImage(file);
    await handleImagesChange([compressed]);
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
        <FileField
          id="market-listing-images"
          label="Bilder"
          accept="image/png,image/jpeg,image/webp"
          multiple
          disabled={isUploading}
          onFilesSelected={(files) => void handleImagesChange(files)}
        />
        {!showCamera && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            disabled={isUploading}
            onClick={() => setShowCamera(true)}
          >
            <Camera className="size-4" />
            Foto aufnehmen
          </Button>
        )}
        {showCamera && (
          <CameraCapture
            onCapture={(file) => void handleCameraCapture(file)}
            onClose={() => setShowCamera(false)}
          />
        )}
        {isUploading && (
          <p className="text-muted-foreground text-sm">Lade Bilder hoch…</p>
        )}
        {uploadError && (
          <p className="text-destructive text-sm">{uploadError}</p>
        )}
        {imageUrls.length > 0 && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {imageUrls.map((url) => (
              <CoverMedia
                key={url}
                imageUrl={url}
                alt="Hochgeladenes Bild"
                aspect="aspect-square"
                fit="contain"
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
