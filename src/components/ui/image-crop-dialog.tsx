"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const MAX_DISPLAY_WIDTH = 448;
const MAX_DISPLAY_HEIGHT = 320;
const MIN_CROP_SIZE_PX = 24;

type Size = { width: number; height: number };
type CropRect = { x: number; y: number; width: number; height: number };
type DragEdge = "move" | "top" | "right" | "bottom" | "left";
type DragState = {
  edge: DragEdge;
  startX: number;
  startY: number;
  startRect: CropRect;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Fachfreie, wiederverwendbare Crop-Komponente (#223): nimmt ein
 * `File`/`Blob` entgegen, lässt es per Ziehen der vier Ränder (und der
 * Fläche zum Verschieben) zuschneiden und liefert bei Bestätigen ein neues,
 * gecropptes `File` über `onCropped`. Keine Domain-Importe.
 *
 * Kein festes Preset-Seitenverhältnis (AC #223): das Crop-Rechteck startet
 * randlos über dem ganzen Bild und wird frei verzerrt, indem jeder der vier
 * Ränder einzeln gezogen wird (#278-Folge — ersetzt das vorherige Pan/Zoom
 * über `react-easy-crop`, das kein Seiten-Resizing unterstützte; ohne Zoom
 * ist der Ausschnitt jetzt exakt: was im Rahmen liegt, wird übernommen).
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
  description = "Ränder ziehen zum Zuschneiden, Fläche ziehen zum Verschieben.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onCropped: (result: File) => void;
  title?: string;
  description?: string;
}) {
  const [naturalSize, setNaturalSize] = useState<Size | null>(null);
  const [displaySize, setDisplaySize] = useState<Size | null>(null);
  const [rect, setRect] = useState<CropRect | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef(drag);
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

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
    setNaturalSize(null);
    setDisplaySize(null);
    setRect(null);
    setDrag(null);
  }

  function handleImageLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget;
    const { naturalWidth, naturalHeight } = img;
    if (!naturalWidth || !naturalHeight) return;

    const scale = Math.min(
      MAX_DISPLAY_WIDTH / naturalWidth,
      MAX_DISPLAY_HEIGHT / naturalHeight,
    );
    const width = Math.round(naturalWidth * scale);
    const height = Math.round(naturalHeight * scale);
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
    setDisplaySize({ width, height });
    setRect({ x: 0, y: 0, width, height });
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) reset();
  }

  // Wie bei `AssignedBlock` (Schichtplan, #160): Pointer-Listener am Window
  // statt am Griff selbst, damit das Ziehen auch weiterläuft, wenn der
  // Zeiger den kleinen Rand-Streifen verlässt. `dragRef` hält den aktuellen
  // Drag-State, damit die Closure im Listener nicht veraltet.
  useEffect(() => {
    if (!drag || !displaySize) return;

    function handleMove(pointerEvent: PointerEvent) {
      const current = dragRef.current;
      if (!current || !displaySize) return;
      const dx = pointerEvent.clientX - current.startX;
      const dy = pointerEvent.clientY - current.startY;
      const { startRect } = current;
      const next = { ...startRect };

      if (current.edge === "move") {
        next.x = clamp(
          startRect.x + dx,
          0,
          displaySize.width - startRect.width,
        );
        next.y = clamp(
          startRect.y + dy,
          0,
          displaySize.height - startRect.height,
        );
      } else if (current.edge === "left") {
        const newX = clamp(
          startRect.x + dx,
          0,
          startRect.x + startRect.width - MIN_CROP_SIZE_PX,
        );
        next.x = newX;
        next.width = startRect.x + startRect.width - newX;
      } else if (current.edge === "right") {
        next.width = clamp(
          startRect.width + dx,
          MIN_CROP_SIZE_PX,
          displaySize.width - startRect.x,
        );
      } else if (current.edge === "top") {
        const newY = clamp(
          startRect.y + dy,
          0,
          startRect.y + startRect.height - MIN_CROP_SIZE_PX,
        );
        next.y = newY;
        next.height = startRect.y + startRect.height - newY;
      } else if (current.edge === "bottom") {
        next.height = clamp(
          startRect.height + dy,
          MIN_CROP_SIZE_PX,
          displaySize.height - startRect.y,
        );
      }

      setRect(next);
    }

    function handleUp() {
      setDrag(null);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- displaySize is stable per render pass, dragRef carries the live drag state
  }, [drag !== null]);

  function beginDrag(edge: DragEdge, pointerEvent: React.PointerEvent) {
    if (!rect) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    setDrag({
      edge,
      startX: pointerEvent.clientX,
      startY: pointerEvent.clientY,
      startRect: rect,
    });
  }

  const croppedAreaPixels = useMemo<PixelCropArea | null>(() => {
    if (!rect || !displaySize || !naturalSize) return null;
    const scaleX = naturalSize.width / displaySize.width;
    const scaleY = naturalSize.height / displaySize.height;
    return {
      x: rect.x * scaleX,
      y: rect.y * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY,
    };
  }, [rect, displaySize, naturalSize]);

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
          <div className="bg-muted flex h-80 w-full items-center justify-center overflow-hidden rounded-md">
            <div
              className="relative"
              style={
                displaySize
                  ? { width: displaySize.width, height: displaySize.height }
                  : undefined
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Crop-Vorschau eines noch nicht hochgeladenen lokalen Blobs, next/image kann das nicht optimieren */}
              <img
                src={objectUrl}
                alt=""
                draggable={false}
                onLoad={handleImageLoad}
                className="block max-w-none touch-none select-none"
                style={
                  displaySize
                    ? { width: displaySize.width, height: displaySize.height }
                    : undefined
                }
              />
              {rect && (
                <div
                  onPointerDown={(pointerEvent) =>
                    beginDrag("move", pointerEvent)
                  }
                  className="border-primary absolute cursor-move touch-none border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                  style={{
                    left: rect.x,
                    top: rect.y,
                    width: rect.width,
                    height: rect.height,
                  }}
                >
                  <div
                    aria-label="Oberen Rand ziehen"
                    onPointerDown={(pointerEvent) =>
                      beginDrag("top", pointerEvent)
                    }
                    className="absolute inset-x-0 -top-1.5 h-3 cursor-ns-resize touch-none"
                  />
                  <div
                    aria-label="Unteren Rand ziehen"
                    onPointerDown={(pointerEvent) =>
                      beginDrag("bottom", pointerEvent)
                    }
                    className="absolute inset-x-0 -bottom-1.5 h-3 cursor-ns-resize touch-none"
                  />
                  <div
                    aria-label="Linken Rand ziehen"
                    onPointerDown={(pointerEvent) =>
                      beginDrag("left", pointerEvent)
                    }
                    className="absolute inset-y-0 -left-1.5 w-3 cursor-ew-resize touch-none"
                  />
                  <div
                    aria-label="Rechten Rand ziehen"
                    onPointerDown={(pointerEvent) =>
                      beginDrag("right", pointerEvent)
                    }
                    className="absolute inset-y-0 -right-1.5 w-3 cursor-ew-resize touch-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}
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
