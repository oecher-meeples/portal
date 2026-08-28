"use client";

import { useState } from "react";
import { Camera, Crop, Star, Trash2 } from "lucide-react";
import { TextField, TextAreaField } from "@/components/ui/field";
import { FileField } from "@/components/ui/file-field";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/ui/camera-capture";
import { CoverMedia } from "@/components/ui/cover-media";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import { compressImage } from "@/lib/utils/compress-image";
import {
  getMarketListingUploadToken,
  deleteMarketListingImage,
} from "@/components/feature/markt/actions";

async function urlToFile(url: string): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  const fileName = url.split("/").pop() ?? "bild.jpg";
  return new File([blob], fileName, { type: blob.type });
}

/** Ein bereits hochgeladenes Bild mit Zuschneiden-/Löschen-/
 * Titelbild-Aktionen (#175). Einmalig genutzt, daher kein eigener Dateiname. */
function MarketImageThumbnail({
  url,
  isCover,
  onCrop,
  onRemove,
  onSetCover,
}: {
  url: string;
  isCover: boolean;
  onCrop: () => void;
  onRemove: () => void;
  onSetCover: () => void;
}) {
  return (
    <div className="group relative">
      <CoverMedia
        imageUrl={url}
        alt="Hochgeladenes Bild"
        aspect="aspect-square"
        fit="contain"
      />
      {isCover && (
        <span className="bg-primary text-primary-foreground absolute top-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-medium">
          Titelbild
        </span>
      )}
      <div className="absolute right-1 bottom-1 flex gap-1">
        {!isCover && (
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            title="Als Titelbild markieren"
            onClick={onSetCover}
          >
            <Star className="size-3.5" />
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          title="Zuschneiden"
          onClick={onCrop}
        >
          <Crop className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          title="Entfernen"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

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
  const [cropFile, setCropFile] = useState<File | null>(null);
  // Bei Bearbeiten eines bereits hochgeladenen Bildes (statt einer neuen
  // Kamera-Aufnahme) trägt dieser State die zu ersetzende URL.
  const [cropTargetUrl, setCropTargetUrl] = useState<string | null>(null);

  async function handleImagesChange(files: File[]) {
    const urls = await uploadFiles(files);
    onImageUrlsChange([...imageUrls, ...urls]);
  }

  /** Direkte Kamera-Aufnahme statt Datei-Auswahl (#108) — vor der Übernahme
   * durchläuft die Aufnahme einen Crop-Schritt (#170), erst danach wird das
   * zugeschnittene Bild wie ein hochgeladenes Bild behandelt: komprimiert,
   * zu Blob Store hochgeladen, imageUrls ergänzt. */
  function handleCameraCapture(file: File) {
    setShowCamera(false);
    setCropFile(file);
  }

  /** Zuschneiden eines bereits hochgeladenen Bildes (#175) — lädt das Bild
   * erst zurück als File, der Crop-Dialog ersetzt anschließend die
   * bestehende URL an derselben Position durch das neu hochgeladene Bild. */
  async function handleCropExisting(url: string) {
    setCropTargetUrl(url);
    setCropFile(await urlToFile(url));
  }

  async function handleCropped(file: File) {
    const targetUrl = cropTargetUrl;
    setCropFile(null);
    setCropTargetUrl(null);
    const compressed = await compressImage(file);

    if (targetUrl) {
      const [newUrl] = await uploadFiles([compressed]);
      if (!newUrl) return;
      onImageUrlsChange(
        imageUrls.map((url) => (url === targetUrl ? newUrl : url)),
      );
      await deleteMarketListingImage(targetUrl);
    } else {
      await handleImagesChange([compressed]);
    }
  }

  function handleCropDialogOpenChange(open: boolean) {
    if (!open) {
      const wasCameraCapture = cropTargetUrl === null;
      setCropFile(null);
      setCropTargetUrl(null);
      if (wasCameraCapture) setShowCamera(true);
    }
  }

  async function handleRemoveImage(url: string) {
    onImageUrlsChange(imageUrls.filter((entry) => entry !== url));
    await deleteMarketListingImage(url);
  }

  function handleSetCover(url: string) {
    onImageUrlsChange([url, ...imageUrls.filter((entry) => entry !== url)]);
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
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        )}
        <ImageCropDialog
          open={cropFile !== null}
          onOpenChange={handleCropDialogOpenChange}
          file={cropFile}
          onCropped={(file) => void handleCropped(file)}
        />
        {isUploading && (
          <p className="text-muted-foreground text-sm">Lade Bilder hoch…</p>
        )}
        {uploadError && (
          <p className="text-destructive text-sm">{uploadError}</p>
        )}
        {imageUrls.length > 0 && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {imageUrls.map((url, index) => (
              <MarketImageThumbnail
                key={url}
                url={url}
                isCover={index === 0}
                onCrop={() => void handleCropExisting(url)}
                onRemove={() => void handleRemoveImage(url)}
                onSetCover={() => handleSetCover(url)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
