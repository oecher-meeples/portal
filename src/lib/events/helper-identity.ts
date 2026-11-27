/** Einheitliche Identität für Helfer (#698): ein Helfer ist entweder ein
 * Meeple (Account) oder ein Gast ohne Account. `meepleId` hat Vorrang — sind
 * (fälschlich) beide gesetzt, zählt das Meeple. Einmal hier definiert, damit
 * Pool, Plan und Export dieselbe Regel nutzen. */
export type HelperRef = {
  meepleId?: string | null;
  guestId?: string | null;
};

export const GUEST_SUFFIX = " (Gast)";

/** Stabiler Schlüssel (Meeple- oder Gast-ID, cuids kollidieren nicht). */
export function helperKey(ref: HelperRef): string {
  const key = ref.meepleId ?? ref.guestId;
  if (!key) {
    throw new Error("Helfer ohne meepleId und guestId.");
  }
  return key;
}

export function isGuest(ref: HelperRef): boolean {
  return !ref.meepleId && !!ref.guestId;
}

export function helperDisplayName(ref: HelperRef, name: string): string {
  return isGuest(ref) ? `${name}${GUEST_SUFFIX}` : name;
}

/** Prisma-`where`/`data`-Teil für eine Helfer-Referenz. */
export function helperRefData(
  helperId: string,
  guest: boolean,
): { meepleId: string } | { guestId: string } {
  return guest ? { guestId: helperId } : { meepleId: helperId };
}
