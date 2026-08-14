"use client";

import { Camera } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  useCameraCapture,
  type CameraCaptureStatus,
} from "@/components/ui/use-camera-capture";

const STATUS_LABELS: Record<CameraCaptureStatus, string> = {
  idle: "",
  starting: "Kamera wird gestartet …",
  ready: "Bereit für die Aufnahme",
  "no-camera-access": "Kein Kamerazugriff — bitte Datei-Upload nutzen",
};

/**
 * Fachfremde Live-Kamera-Komponente: Vorschau + Aufnahme-Button, kein
 * `<input capture>` (das wechselt auf iOS/Android in eine native Kamera-App
 * statt einer In-App-Vorschau). Liefert die Aufnahme ausschließlich über
 * `onCapture` — kennt keine Fachdomäne (Markt, Inserat, …), siehe #108.
 */
export function CameraCapture({
  onCapture,
  onClose,
  className,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  className?: string;
}) {
  const { videoRef, status, start, stop, capture } = useCameraCapture();

  async function handleCapture() {
    const file = await capture();
    if (file) onCapture(file);
  }

  function handleClose() {
    stop();
    onClose();
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-neutral-950",
        className,
      )}
    >
      <div className="relative flex aspect-video items-center justify-center">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        />
        {status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-500">
            <Camera className="size-8" />
            <Button size="sm" onClick={start}>
              Kamera starten
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 bg-neutral-900 px-4 py-2.5 text-sm text-neutral-100">
        <span>{STATUS_LABELS[status]}</span>
        <div className="flex gap-2">
          {status === "ready" && (
            <Button size="sm" onClick={() => void handleCapture()}>
              <Camera className="size-4" />
              Aufnehmen
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleClose}>
            Schließen
          </Button>
        </div>
      </div>
    </div>
  );
}
