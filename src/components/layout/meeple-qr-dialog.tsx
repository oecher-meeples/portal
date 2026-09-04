"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildMeepleCode } from "@/lib/inventory/codes";

/**
 * Persönlicher QR-Code des eigenen Meeples (#465) — per Longpress auf das
 * Header-Profil erreichbar. Gescannt beim Weitergeben/Zurückgeben
 * (`TargetPicker`, `holding-mini-dialogs.tsx`) bestätigt der Scan die
 * Übergabe sofort, ohne dass die empfangende Person selbst noch etwas
 * anklicken muss (siehe `resolveScannedCode()`/`confirmationFor()`).
 */
export function MeepleQrDialog({
  meepleId,
  open,
  onOpenChange,
}: {
  meepleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(buildMeepleCode(meepleId), { margin: 1, width: 240 }).then(
      (url) => {
        if (!cancelled) setDataUrl(url);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, meepleId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Mein QR-Code</DialogTitle>
          <DialogDescription>
            Zeig diesen Code beim Weitergeben oder Zurückgeben eines Spiels —
            das Scannen gilt dann als deine Bestätigung, kein zusätzlicher Klick
            nötig.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data: URL, kein next/image nötig
            <img
              src={dataUrl}
              alt="Mein persönlicher QR-Code"
              className="size-60"
            />
          ) : (
            <div className="bg-muted size-60 animate-pulse rounded-md" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
