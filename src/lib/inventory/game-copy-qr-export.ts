/** QR-Code-Export für Ludothek-Exemplare (#271) — Ziel ist die Exemplar-Ebene
 * (nicht der Titel), ermöglicht durch die Inventarnummer (#270). Nur die
 * reine, testbare Logik lebt hier: URL-Aufbau, Auswahl exportierbarer
 * Exemplare, Dateiname. Die eigentliche PNG-/ZIP-Erzeugung braucht
 * Canvas/Blob (Browser-APIs) und lebt in `qr-export-actions.ts` (Client). */

import { formatShortIdSlug } from "@/lib/short-id/short-id";

export type QrExportableCopy = {
  id: string;
  title: string;
  inventoryNumber: number | null;
};

/** Nur Exemplare mit gesetzter Inventarnummer können einen QR-Code
 * bekommen — ohne sie gibt es kein eindeutiges Exemplar-Ziel. */
export function selectQrExportableCopies<T extends QrExportableCopy>(
  copies: T[],
): (T & { inventoryNumber: number })[] {
  return copies.filter(
    (copy): copy is T & { inventoryNumber: number } =>
      copy.inventoryNumber !== null,
  );
}

/** Ziel-URL des QR-Codes — exemplar-, nicht titelbezogen (#271), damit bei
 * mehreren Exemplaren desselben Spiels jedes seinen eigenen Code bekommt.
 * Zeigt auf den Short-ID-Router `/id/inv-<n>` (#545); die Umstellung auf die
 * feste Short-Domain folgt in #546. */
export function buildExemplarUrl(
  origin: string,
  inventoryNumber: number,
): string {
  return `${origin}/id/${formatShortIdSlug({ kind: "inv", id: inventoryNumber })}`;
}

/** Dateiname innerhalb der ZIP — Inventarnummer zuerst, damit Dateien in der
 * ZIP alphabetisch nach Inventarnummer sortiert erscheinen, Titel dahinter
 * für die Lesbarkeit. */
export function qrExportFilename(copy: QrExportableCopy): string {
  const safeTitle = copy.title.replace(/[\\/:*?"<>|]/g, "").trim();
  return `${copy.inventoryNumber}_${safeTitle}.png`;
}
