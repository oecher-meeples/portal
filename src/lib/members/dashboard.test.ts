import { describe, expect, it } from "vitest";
import {
  countActiveEvents,
  countUpcomingShiftBookings,
  summariseMemberHoldings,
  type DashboardHolding,
  type DashboardUnit,
} from "./dashboard";

const MEEPLE = "meeple-1";
const OTHER = "meeple-2";

function holding(overrides: Partial<DashboardHolding> = {}): DashboardHolding {
  return {
    id: "holding-1",
    gameCopyId: "copy-1",
    meepleId: null,
    unitId: null,
    origin: "LOAN",
    confirmedAt: new Date(),
    endedAt: null,
    ...overrides,
  };
}

function unit(overrides: Partial<DashboardUnit> = {}): DashboardUnit {
  return { id: "unit-1", keeperMeepleId: null, retiredAt: null, ...overrides };
}

describe("summariseMemberHoldings", () => {
  it("counts only the meeple's own loans", () => {
    const holdings = [
      holding({ id: "h1", meepleId: MEEPLE, origin: "LOAN" }),
      holding({ id: "h2", meepleId: OTHER, origin: "LOAN" }),
    ];

    const summary = summariseMemberHoldings(MEEPLE, holdings, []);

    expect(summary.ownLoans.map((h) => h.id)).toEqual(["h1"]);
  });

  it("does not count a closed holding", () => {
    const holdings = [
      holding({
        id: "h1",
        meepleId: MEEPLE,
        origin: "LOAN",
        endedAt: new Date(),
      }),
    ];

    const summary = summariseMemberHoldings(MEEPLE, holdings, []);

    expect(summary.ownLoans).toEqual([]);
  });

  it("attributes a unit's contents to its keeper", () => {
    const units = [unit({ id: "unit-1", keeperMeepleId: MEEPLE })];
    const holdings = [
      holding({ id: "h1", unitId: "unit-1" }),
      holding({ id: "h2", unitId: "unit-2" }),
    ];

    const summary = summariseMemberHoldings(MEEPLE, holdings, units);

    expect(summary.ownUnitContents.map((h) => h.id)).toEqual(["h1"]);
  });

  it("ignores a retired unit even if it still lists the meeple as keeper", () => {
    const units = [
      unit({ id: "unit-1", keeperMeepleId: MEEPLE, retiredAt: new Date() }),
    ];
    const holdings = [holding({ id: "h1", unitId: "unit-1" })];

    const summary = summariseMemberHoldings(MEEPLE, holdings, units);

    expect(summary.ownUnitContents).toEqual([]);
  });

  it("separates unconfirmed handovers from unconfirmed returns", () => {
    const holdings = [
      holding({
        id: "handover",
        meepleId: MEEPLE,
        origin: "HANDOVER",
        confirmedAt: null,
      }),
      holding({
        id: "return",
        meepleId: MEEPLE,
        origin: "RETURN",
        confirmedAt: null,
      }),
      holding({
        id: "confirmed-handover",
        meepleId: MEEPLE,
        origin: "HANDOVER",
        confirmedAt: new Date(),
      }),
    ];

    const summary = summariseMemberHoldings(MEEPLE, holdings, []);

    expect(summary.unconfirmedHandovers.map((h) => h.id)).toEqual(["handover"]);
    expect(summary.unconfirmedReturns.map((h) => h.id)).toEqual(["return"]);
  });

  it("returns an empty summary for a meeple with nothing, without throwing", () => {
    expect(summariseMemberHoldings(MEEPLE, [], [])).toEqual({
      ownLoans: [],
      ownUnitContents: [],
      unconfirmedHandovers: [],
      unconfirmedReturns: [],
    });
  });
});

const NOW = new Date("2026-08-01T00:00:00Z");

describe("countUpcomingShiftBookings", () => {
  it("counts only the caller's own bookings for shifts that haven't ended", () => {
    const bookings = [
      { meepleId: MEEPLE, shift: { endsAt: new Date("2026-08-10T00:00:00Z") } },
      { meepleId: MEEPLE, shift: { endsAt: new Date("2026-07-01T00:00:00Z") } },
      { meepleId: OTHER, shift: { endsAt: new Date("2026-08-10T00:00:00Z") } },
    ];

    expect(countUpcomingShiftBookings(MEEPLE, bookings, NOW)).toBe(1);
  });

  it("returns 0 for no bookings", () => {
    expect(countUpcomingShiftBookings(MEEPLE, [], NOW)).toBe(0);
  });
});

describe("countActiveEvents", () => {
  it("counts events without an end date and events ending in the future", () => {
    const events = [
      { endsAt: null },
      { endsAt: new Date("2026-09-01T00:00:00Z") },
      { endsAt: new Date("2026-07-01T00:00:00Z") },
    ];

    expect(countActiveEvents(events, NOW)).toBe(2);
  });
});
