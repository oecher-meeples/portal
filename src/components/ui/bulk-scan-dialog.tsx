"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CodeScanner } from "@/components/ui/code-scanner";

/**
 * Fachfreie Mehrfach-Scan-Dialog: bleibt nach jedem erkannten Code offen
 * (anders als `ScanSearchDialog`, das nach dem ersten Treffer schließt) und
 * meldet jeden Treffer über `onDetected` — kein Resolving, keine
 * Domänenlogik. Für Massenimport-Flows, in denen mehrere Codes
 * hintereinander gescannt werden sollen (#186-Folge).
 */
export function BulkScanDialog({
  onDetected,
  disabled,
}: {
  onDetected: (text: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);

  function handleDetected(text: string) {
    setScannedCount((count) => count + 1);
    onDetected(text);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setScannedCount(0);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={disabled}
          >
            <Camera className="size-4" />
            Scannen
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>EANs scannen</DialogTitle>
          <DialogDescription>
            Mehrere Codes nacheinander in den Rahmen halten — jeder erkannte
            Code wird der Liste hinzugefügt, der Scanner bleibt aktiv.
          </DialogDescription>
        </DialogHeader>
        <CodeScanner onDetected={handleDetected} />
        <p className="text-muted-foreground text-sm">
          {scannedCount === 0
            ? "Noch nichts gescannt."
            : `${scannedCount} ${scannedCount === 1 ? "Code" : "Codes"} gescannt.`}
        </p>
        <DialogFooter>
          <Button type="button" onClick={() => handleOpenChange(false)}>
            Fertig
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
