"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CodeScanner } from "@/components/ui/code-scanner";

// Der grüne Flash aus use-code-scanner.ts dauert 600ms — den Dialog vorher zu
// schließen würde ihn abschneiden, siehe Plan-Schritt 2.
const CLOSE_DELAY_MS = 400;

/**
 * Fachfreie Kamera-Scan-zu-Text-Dialog: kein EAN-Resolving, kein Server-Call —
 * meldet den erkannten Text nur über `onScanned`. Domänenlogik (Suche, Matching)
 * liegt beim Aufrufer.
 */
export function ScanSearchDialog({
  onScanned,
}: {
  onScanned: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);

  function handleDetected(text: string) {
    window.setTimeout(() => {
      setOpen(false);
      onScanned(text);
    }, CLOSE_DELAY_MS);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Scannen"
          >
            <Camera className="size-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Code scannen</DialogTitle>
          <DialogDescription>
            EAN oder QR-Code in den Rahmen halten.
          </DialogDescription>
        </DialogHeader>
        <CodeScanner stopOnDetect onDetected={handleDetected} />
      </DialogContent>
    </Dialog>
  );
}
