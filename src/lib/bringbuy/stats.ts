import type { FleaMarketItemStatus } from "@prisma/client";

export type FleaMarketStatsItem = {
  eventId: string;
  priceEuros: number;
  status: FleaMarketItemStatus;
  /** Last status change — used as the "sold today" reference point (no dedicated soldAt field). */
  updatedAt: Date;
};

export type FleaMarketStats = {
  listed: number;
  soldToday: number;
  revenue: number;
  reserved: number;
};

function isToday(date: Date, now: Date) {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * Kennzahlen für die Kassenansicht — nur Artikel des ausgewählten Events zählen,
 * "verkauft heute"/Umsatz beziehen sich auf `SOLD`-Artikel dieses Kalendertags.
 */
export function computeFleaMarketStats(
  eventId: string,
  items: FleaMarketStatsItem[],
  now: Date = new Date(),
): FleaMarketStats {
  const eventItems = items.filter((item) => item.eventId === eventId);
  const soldItems = eventItems.filter((item) => item.status === "SOLD");
  const soldToday = soldItems.filter((item) => isToday(item.updatedAt, now));

  return {
    listed: eventItems.length,
    soldToday: soldToday.length,
    revenue: soldToday.reduce((sum, item) => sum + item.priceEuros, 0),
    reserved: eventItems.filter((item) => item.status === "RESERVED").length,
  };
}
