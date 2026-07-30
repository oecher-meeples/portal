import { describe, expect, it } from "vitest";
import { getLfgStatus, isLfgExpired } from "./lfg";

const NOW = new Date("2026-08-01T12:00:00Z");

describe("isLfgExpired", () => {
  it("is false when there is no planned date", () => {
    expect(isLfgExpired({ plannedAt: null }, NOW)).toBe(false);
  });

  it("is true once the planned date is in the past", () => {
    expect(
      isLfgExpired({ plannedAt: new Date("2026-07-01T00:00:00Z") }, NOW),
    ).toBe(true);
  });

  it("is false while the planned date is still ahead", () => {
    expect(
      isLfgExpired({ plannedAt: new Date("2026-09-01T00:00:00Z") }, NOW),
    ).toBe(false);
  });
});

describe("getLfgStatus", () => {
  const base = { maxParticipants: 4, plannedAt: null, closedAt: null };

  it("is offen with free slots and no expiry", () => {
    expect(getLfgStatus(base, 2, NOW)).toBe("offen");
  });

  it("is voll once the slots are filled", () => {
    expect(getLfgStatus(base, 4, NOW)).toBe("voll");
  });

  it("is abgelaufen once the planned date has passed, even with free slots", () => {
    expect(
      getLfgStatus(
        { ...base, plannedAt: new Date("2026-07-01T00:00:00Z") },
        1,
        NOW,
      ),
    ).toBe("abgelaufen");
  });

  it("never expires without a planned date", () => {
    expect(getLfgStatus({ ...base, plannedAt: null }, 1, NOW)).toBe("offen");
  });

  it("is geschlossen once closedAt is set, taking priority over everything else", () => {
    expect(
      getLfgStatus(
        { ...base, closedAt: new Date("2026-07-01T00:00:00Z") },
        1,
        NOW,
      ),
    ).toBe("geschlossen");
  });
});
