/** QR-Code-Export für Ludothek-Exemplare (#271) — Ziel ist die Exemplar-Ebene
 * (nicht der Titel), ermöglicht durch die Inventarnummer (#270). Nur die
 * reine, testbare Logik lebt hier: URL-Aufbau, Auswahl exportierbarer
 * Exemplare, Dateiname. Die eigentliche PNG-/ZIP-Erzeugung braucht
 * Canvas/Blob (Browser-APIs) und lebt in `qr-export-actions.ts` (Client). */

export type QrExportableCopy = {
  id: string;
  title: string;
  inventoryNumber: string | null;
};

/** Nur Exemplare mit gesetzter Inventarnummer können einen QR-Code
 * bekommen — ohne sie gibt es kein eindeutiges Exemplar-Ziel. */
export function selectQrExportableCopies<T extends QrExportableCopy>(
  copies: T[],
): (T & { inventoryNumber: string })[] {
  return copies.filter(
    (copy): copy is T & { inventoryNumber: string } =>
      copy.inventoryNumber !== null && copy.inventoryNumber.trim() !== "",
  );
}

/** Ziel-URL des QR-Codes — die neue Exemplar-Route (#271), nicht die
 * Titel-Route, damit bei mehreren Exemplaren desselben Spiels jedes seinen
 * eigenen Code bekommt. */
export function buildExemplarUrl(
  origin: string,
  inventoryNumber: string,
): string {
  return `${origin}/ludothek/exemplar/${encodeURIComponent(inventoryNumber)}`;
}

/** Dateiname innerhalb der ZIP — Inventarnummer zuerst, damit Dateien in der
 * ZIP alphabetisch nach Inventarnummer sortiert erscheinen, Titel dahinter
 * für die Lesbarkeit. */
export function qrExportFilename(copy: QrExportableCopy): string {
  const safeTitle = copy.title.replace(/[\\/:*?"<>|]/g, "").trim();
  return `${copy.inventoryNumber}_${safeTitle}.png`;
}
