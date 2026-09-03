"use client";

import QRCode from "qrcode";
import JSZip from "jszip";
import {
  buildExemplarUrl,
  qrExportFilename,
  selectQrExportableCopies,
  type QrExportableCopy,
} from "@/lib/inventory/game-copy-qr-export";

/** Browser-seitige PNG-/ZIP-Erzeugung für den QR-Code-Export (#271) — nutzt
 * Canvas/Blob, daher getrennt von der reinen, testbaren Logik in
 * `game-copy-qr-export.ts`. Kein Server-Roundtrip nötig: alle benötigten
 * Daten (Titel, Inventarnummer) liegen der aufrufenden Ansicht bereits vor. */

const QR_SIZE = 320;
const LABEL_WIDTH = 400;
const TEXT_AREA_HEIGHT = 90;

async function renderLabelPng(
  copy: QrExportableCopy & { inventoryNumber: string },
): Promise<Blob> {
  const url = buildExemplarUrl(window.location.origin, copy.inventoryNumber);

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, url, { margin: 1, width: QR_SIZE });

  const canvas = document.createElement("canvas");
  canvas.width = LABEL_WIDTH;
  canvas.height = QR_SIZE + TEXT_AREA_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas wird nicht unterstützt.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(qrCanvas, (canvas.width - QR_SIZE) / 2, 0);

  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(copy.title, canvas.width / 2, QR_SIZE + 32, canvas.width - 20);
  ctx.font = "16px monospace";
  ctx.fillText(copy.inventoryNumber, canvas.width / 2, QR_SIZE + 60);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG-Erzeugung fehlgeschlagen."));
    }, "image/png");
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Erzeugt ein PNG (QR-Code + Titel/Inventarnummer als Text) pro Exemplar
 * mit gesetzter Inventarnummer, bündelt sie als ZIP und stößt den Download
 * an. Exemplare ohne Inventarnummer werden stillschweigend übersprungen —
 * Aufrufer können vorher selbst filtern/hinweisen, falls gewünscht. */
export async function exportGameCopyQrCodesZip(
  copies: QrExportableCopy[],
  zipFilename = "exemplar-qr-codes.zip",
): Promise<{ error: string } | { success: true; count: number }> {
  const exportable = selectQrExportableCopies(copies);
  if (exportable.length === 0) {
    return {
      error: "Keines der ausgewählten Exemplare hat eine Inventarnummer.",
    };
  }

  const zip = new JSZip();
  for (const copy of exportable) {
    const blob = await renderLabelPng(copy);
    zip.file(qrExportFilename(copy), blob);
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, zipFilename);

  return { success: true, count: exportable.length };
}
