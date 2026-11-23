"use client";

import { QrCode } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import type { QrExportableCopy } from "@/lib/inventory/game-copy-qr-export";

/**
 * QR-Code-ZIP-Export für ein oder mehrere Exemplare (#271) — eigene
 * Client-Komponente, da `exportGameCopyQrCodesZip()` reiner Browser-Code ist
 * (Canvas/Blob), kein Server Action: eine Server-Komponente (z. B.
 * `GameCopiesSection`) dürfte eine solche Funktion sonst nicht als Prop an
 * `ActionButton` durchreichen.
 */
export function GameCopyQrExportButton({
  copies,
  zipFilename,
  label = "QR-Codes exportieren",
}: {
  copies: QrExportableCopy[];
  zipFilename?: string;
  label?: string;
}) {
  return (
    <ActionButton
      variant="outline"
      size="sm"
      refresh={false}
      className="gap-1.5"
      action={async () => {
        // `qrcode` + `jszip` erst beim Klick laden (#529), nicht mit der Seite.
        const { exportGameCopyQrCodesZip } =
          await import("@/lib/inventory/game-copy-qr-export-client");
        return exportGameCopyQrCodesZip(copies, zipFilename);
      }}
    >
      <QrCode className="size-4" />
      {label}
    </ActionButton>
  );
}
