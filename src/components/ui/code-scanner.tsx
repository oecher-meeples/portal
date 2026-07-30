"use client";

import { Camera } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  useCodeScanner,
  type ScannerStatus,
} from "@/components/ui/use-code-scanner";

const STATUS_LABELS: Record<ScannerStatus, string> = {
  idle: "",
  starting: "Kamera wird gestartet …",
  scanning: "Bereit — Code in den Rahmen halten",
  "no-camera-access": "Kein Kamerazugriff — bitte manuell eingeben",
  "no-code-detected": "Kein Code erkannt — weiter versuchen",
};

/**
 * Fachfremde EAN/QR-Scanner-Komponente: kapselt Kamera-Vorschau, Start/Stop
 * und Status-Anzeige. Meldet erkannte Codes ausschließlich über `onDetected` —
 * kennt keine Fachdomäne (Spiele, Holdings, Einheiten, …).
 */
export function CodeScanner({
  onDetected,
  className,
  frame = true,
  stopOnDetect = false,
}: {
  onDetected: (text: string) => void;
  className?: string;
  frame?: boolean;
  /** Stop the camera as soon as a code is detected, instead of continuing to scan. */
  stopOnDetect?: boolean;
}) {
  const { videoRef, status, start, stop } = useCodeScanner({
    onDetected: (text) => {
      if (stopOnDetect) stop();
      onDetected(text);
    },
  });

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
        {frame && (
          <div className="border-primary pointer-events-none absolute inset-12 rounded-lg border-2 sm:inset-24" />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 bg-neutral-900 px-4 py-2.5 text-sm text-neutral-100">
        <span>{STATUS_LABELS[status]}</span>
        {status !== "idle" && (
          <Button size="sm" variant="ghost" onClick={stop}>
            Stoppen
          </Button>
        )}
      </div>
    </div>
  );
}
