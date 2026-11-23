import type { FleaMarketItemStatus } from "@prisma/client";

/** Erlaubte Statuswechsel eines `FleaMarketItem` (#211, erweitert um #266:
 * PAID_OUT/RETURNED/DONATED). Geteilt zwischen der Kassenansicht und der
 * Verkäufer-Registrierungsseite — keine der beiden Features darf aus dem
 * jeweils anderen importieren (Layer-Regel), deshalb hier in `lib/`. */
export const NEXT_STATUS: Record<FleaMarketItemStatus, FleaMarketItemStatus[]> =
  {
    PENDING: ["FOR_SALE"],
    FOR_SALE: ["RESERVED", "SOLD", "RETURNED", "DONATED"],
    RESERVED: ["FOR_SALE", "SOLD", "RETURNED"],
    SOLD: ["PAID_OUT"],
    PAID_OUT: [],
    RETURNED: [],
    DONATED: [],
  };

/** Endzustände, in denen ein Artikel keine weitere Kassen-Aktion mehr braucht. */
export const TERMINAL_STATUSES: FleaMarketItemStatus[] = [
  "PAID_OUT",
  "RETURNED",
  "DONATED",
];

export function canTransitionFleaMarketItemStatus(
  from: FleaMarketItemStatus,
  to: FleaMarketItemStatus,
): boolean {
  return NEXT_STATUS[from].includes(to);
}

/**
 * Der Token einer externen Verkäufer:in (#266) bleibt gültig, solange
 * mindestens einer ihrer Artikel noch eine offene Aktion braucht — d. h.
 * noch nicht in einem Endzustand (`PAID_OUT`/`RETURNED`/`DONATED`) ist.
 * Ziel laut Klärung: alle eigenen Artikel erreichen irgendwann `PAID_OUT`
 * (oder werden zurückgegeben/gespendet) — erst dann ist nichts mehr offen.
 */
export function isFleaMarketExternalSellerTokenValid(
  items: { status: FleaMarketItemStatus }[],
): boolean {
  if (items.length === 0) return true;
  return items.some((item) => !TERMINAL_STATUSES.includes(item.status));
}
