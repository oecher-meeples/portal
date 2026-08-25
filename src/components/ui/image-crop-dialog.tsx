"use client";

import { useEffect, useMemo, useState } from "react";
import Cropper, {
  type Area,
  type MediaSize,
  type Point,
} from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cropImage, type PixelCropArea } from "@/lib/utils/crop-image";

/**
 * Fachfreie, wiederverwendbare Crop-Komponente (#223): nimmt ein
 * `File`/`Blob` entgegen, lässt es per Zoom/Pan zuschneiden und liefert bei
 * Bestätigen ein neues, gecropptes `File` über `onCropped`. Keine
 * Domain-Importe — nur die Bausteine, der Einbau an konkreten
 * Upload-Stellen folgt in Folge-Tickets (u. a. #170).
 *
 * Das Crop-Rechteck hat kein festes Preset-Seitenverhältnis (AC #223): es
 * startet im Seitenverhältnis der Quelle selbst (gesetzt sobald das Medium
 * geladen ist) und füllt den ganzen sichtbaren Rahmen — gezoomt/verschoben
 * wird, welcher Ausschnitt der Quelle darin landet. `react-easy-crop`
 * unterstützt kein Ziehen der Rechteck-Kanten zum freien Resizen; Pan +
 * Zoom ist das von der Library (laut Issue-Vorschlag) unterstützte
 * Interaktionsmodell.
 *
 * Controlled component: der Aufrufer hält `file`/`open` und bekommt über
 * `onCropped`/`onOpenChange` die Ergebnisse zurück, analog zum
 * `open`/`onOpenChange`-Muster von `ActionDialog`.
 */
export function ImageCropDialog({
  open,
  onOpenChange,
  file,
  onCropped,
  title = "Bild zuschneiden",
  description = "Zoomen und verschieben, um den gewünschten Bildausschnitt zu wählen.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onCropped: (result: File) => void;
  title?: string;
  description?: string;
}) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<PixelCropArea | null>(null);

  const objectUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  function reset() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAspect(1);
    setCroppedAreaPixels(null);
  }

  function handleMediaLoaded(mediaSize: MediaSize) {
    if (mediaSize.naturalWidth > 0 && mediaSize.naturalHeight > 0) {
      setAspect(mediaSize.naturalWidth / mediaSize.naturalHeight);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) reset();
  }

  async function handleConfirm() {
    if (!file || !croppedAreaPixels) return;
    const result = await cropImage(file, croppedAreaPixels, {
      fileName: file.name,
    });
    onCropped(result);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {objectUrl && (
          <div className="bg-muted relative h-80 w-full overflow-hidden rounded-md">
            <Cropper
              image={objectUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onMediaLoaded={handleMediaLoaded}
              onCropComplete={(_area: Area, areaPixels: Area) =>
                setCroppedAreaPixels(areaPixels)
              }
            />
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">Zoom</span>
          <input
            type="range"
            min={1}
            max={5}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="accent-primary w-full"
            aria-label="Zoom"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            disabled={!croppedAreaPixels}
            onClick={handleConfirm}
          >
            Übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
