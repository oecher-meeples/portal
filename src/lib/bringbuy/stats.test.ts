import { describe, expect, it } from "vitest";
import { computeFleaMarketStats } from "./stats";

const NOW = new Date("2026-08-09T18:00:00Z");
const TODAY_MORNING = new Date("2026-08-09T08:00:00Z");
const YESTERDAY = new Date("2026-08-08T18:00:00Z");

describe("computeFleaMarketStats", () => {
  it("counts only items of the selected event", () => {
    const items = [
      { eventId: "event-1", priceEuros: 10, status: "FOR_SALE" as const, updatedAt: NOW },
      { eventId: "event-2", priceEuros: 99, status: "FOR_SALE" as const, updatedAt: NOW },
    ];

    const stats = computeFleaMarketStats("event-1", items, NOW);

    expect(stats.listed).toBe(1);
  });

  it("computes soldToday and revenue from items sold today only", () => {
    const items = [
      { eventId: "event-1", priceEuros: 20, status: "SOLD" as const, updatedAt: TODAY_MORNING },
      { eventId: "event-1", priceEuros: 15, status: "SOLD" as const, updatedAt: YESTERDAY },
      { eventId: "event-1", priceEuros: 5, status: "FOR_SALE" as const, updatedAt: NOW },
    ];

    const stats = computeFleaMarketStats("event-1", items, NOW);

    expect(stats.soldToday).toBe(1);
    expect(stats.revenue).toBe(20);
  });

  it("counts reserved items", () => {
    const items = [
      { eventId: "event-1", priceEuros: 10, status: "RESERVED" as const, updatedAt: NOW },
    ];

    expect(computeFleaMarketStats("event-1", items, NOW).reserved).toBe(1);
  });
});
