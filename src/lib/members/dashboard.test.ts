import { describe, expect, it } from "vitest";
import {
  buildResignationNotice,
  countActiveEvents,
  countUpcomingShiftBookings,
  summariseMemberHoldings,
  type DashboardHolding,
  type DashboardUnit,
} from "./dashboard";

const MEEPLE = "meeple-1";
const OTHER = "meeple-2";
const MEMBER = "member-1";
const OTHER_MEMBER = "member-2";

function holding(overrides: Partial<DashboardHolding> = {}): DashboardHolding {
  return {
    id: "holding-1",
    gameCopyId: "copy-1",
    vereinsmitgliedId: null,
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
      holding({ id: "h1", vereinsmitgliedId: MEMBER, origin: "LOAN" }),
      holding({ id: "h2", vereinsmitgliedId: OTHER_MEMBER, origin: "LOAN" }),
    ];

    const summary = summariseMemberHoldings(MEEPLE, MEMBER, holdings, []);

    expect(summary.ownLoans.map((h) => h.id)).toEqual(["h1"]);
  });

  it("does not count a closed holding", () => {
    const holdings = [
      holding({
        id: "h1",
        vereinsmitgliedId: MEMBER,
        origin: "LOAN",
        endedAt: new Date(),
      }),
    ];

    const summary = summariseMemberHoldings(MEEPLE, MEMBER, holdings, []);

    expect(summary.ownLoans).toEqual([]);
  });

  it("attributes a unit's contents to its keeper", () => {
    const units = [unit({ id: "unit-1", keeperMeepleId: MEEPLE })];
    const holdings = [
      holding({ id: "h1", unitId: "unit-1" }),
      holding({ id: "h2", unitId: "unit-2" }),
    ];

    const summary = summariseMemberHoldings(MEEPLE, MEMBER, holdings, units);

    expect(summary.ownUnitContents.map((h) => h.id)).toEqual(["h1"]);
  });

  it("ignores a retired unit even if it still lists the meeple as keeper", () => {
    const units = [
      unit({ id: "unit-1", keeperMeepleId: MEEPLE, retiredAt: new Date() }),
    ];
    const holdings = [holding({ id: "h1", unitId: "unit-1" })];

    const summary = summariseMemberHoldings(MEEPLE, MEMBER, holdings, units);

    expect(summary.ownUnitContents).toEqual([]);
  });

  it("separates unconfirmed handovers from unconfirmed returns", () => {
    const holdings = [
      holding({
        id: "handover",
        vereinsmitgliedId: MEMBER,
        origin: "HANDOVER",
        confirmedAt: null,
      }),
      holding({
        id: "return",
        vereinsmitgliedId: MEMBER,
        origin: "RETURN",
        confirmedAt: null,
      }),
      holding({
        id: "confirmed-handover",
        vereinsmitgliedId: MEMBER,
        origin: "HANDOVER",
        confirmedAt: new Date(),
      }),
    ];

    const summary = summariseMemberHoldings(MEEPLE, MEMBER, holdings, []);

    expect(summary.unconfirmedHandovers.map((h) => h.id)).toEqual(["handover"]);
    expect(summary.unconfirmedReturns.map((h) => h.id)).toEqual(["return"]);
  });

  it("returns an empty summary for a meeple with nothing, without throwing", () => {
    expect(summariseMemberHoldings(MEEPLE, MEMBER, [], [])).toEqual({
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
      {
        meepleId: MEEPLE,
        shift: { targetEndsAt: new Date("2026-08-10T00:00:00Z") },
      },
      {
        meepleId: MEEPLE,
        shift: { targetEndsAt: new Date("2026-07-01T00:00:00Z") },
      },
      {
        meepleId: OTHER,
        shift: { targetEndsAt: new Date("2026-08-10T00:00:00Z") },
      },
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

describe("buildResignationNotice (#360)", () => {
  const now = new Date("2026-07-29T12:00:00Z");

  it("is null for a non-gekuendigt state", () => {
    expect(
      buildResignationNotice(
        "registriert",
        new Date("2026-08-01T00:00:00Z"),
        0,
        now,
      ),
    ).toBeNull();
  });

  it("is null without a membershipEndsAt", () => {
    expect(buildResignationNotice("gekuendigt", null, 0, now)).toBeNull();
  });

  it("is null more than 31 days before membershipEndsAt", () => {
    expect(
      buildResignationNotice(
        "gekuendigt",
        new Date("2026-09-01T00:00:00Z"),
        2,
        now,
      ),
    ).toBeNull();
  });

  it("appears exactly at the 31-day mark", () => {
    const endsAt = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);

    expect(buildResignationNotice("gekuendigt", endsAt, 2, now)).toEqual({
      endsAt,
      openHoldingsCount: 2,
    });
  });

  it("appears within the 31-day window", () => {
    const endsAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    expect(buildResignationNotice("gekuendigt", endsAt, 0, now)).toEqual({
      endsAt,
      openHoldingsCount: 0,
    });
  });
});
