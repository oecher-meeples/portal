import { describe, expect, it } from "vitest";
import {
  buildHelperOverview,
  dayUtilizationPercent,
  type OverviewAvailability,
} from "./helper-overview";

const window = {
  startsAt: "2026-10-10T08:00:00.000Z",
  endsAt: "2026-10-10T16:00:00.000Z",
};

function availability(
  overrides: Partial<OverviewAvailability>,
): OverviewAvailability {
  return {
    helperId: "m1",
    displayName: "Anna",
    profilePictureUrl: null,
    profilePictureVisibility: "INTERN",
    dayDate: "2026-10-10T00:00:00.000Z",
    ...window,
    roleIds: ["r1"],
    ...overrides,
  };
}

describe("dayUtilizationPercent", () => {
  it("is 0 without bookings", () => {
    expect(dayUtilizationPercent(window, [])).toBe(0);
  });

  it("is 50 for 4 of 8 hours", () => {
    expect(
      dayUtilizationPercent(window, [
        {
          helperId: "m1",
          startsAt: "2026-10-10T08:00:00.000Z",
          endsAt: "2026-10-10T12:00:00.000Z",
        },
      ]),
    ).toBe(50);
  });

  it("counts overlapping bookings once and clamps to 100", () => {
    const full = {
      helperId: "m1",
      startsAt: "2026-10-10T06:00:00.000Z",
      endsAt: "2026-10-10T20:00:00.000Z",
    };
    expect(dayUtilizationPercent(window, [full, full])).toBe(100);
  });
});

describe("buildHelperOverview", () => {
  const roles = new Map([
    ["r1", "Theke"],
    ["r2", "Aufbau"],
  ]);

  it("groups by person sorted by name, then day, with role names", () => {
    const groups = buildHelperOverview(
      [
        availability({ helperId: "m2", displayName: "Berta" }),
        availability({
          dayDate: "2026-10-11T00:00:00.000Z",
          roleIds: ["r1", "r2"],
        }),
        availability({}),
      ],
      [],
      roles,
    );
    expect(groups.map((g) => g.displayName)).toEqual(["Anna", "Berta"]);
    expect(groups[0].rows.map((r) => r.dayDate)).toEqual([
      "2026-10-10T00:00:00.000Z",
      "2026-10-11T00:00:00.000Z",
    ]);
    expect(groups[0].rows[1].roleNames).toEqual(["Theke", "Aufbau"]);
  });

  it("ignores bookings on other days and of other people", () => {
    const [group] = buildHelperOverview(
      [
        availability({}),
        availability({
          dayDate: "2026-10-11T00:00:00.000Z",
          startsAt: "2026-10-11T08:00:00.000Z",
          endsAt: "2026-10-11T16:00:00.000Z",
        }),
      ],
      [
        {
          helperId: "m1",
          startsAt: "2026-10-10T08:00:00.000Z",
          endsAt: "2026-10-10T12:00:00.000Z",
        },
        {
          helperId: "m2",
          startsAt: "2026-10-11T08:00:00.000Z",
          endsAt: "2026-10-11T16:00:00.000Z",
        },
      ],
      roles,
    );
    expect(group.rows.map((r) => r.utilizationPercent)).toEqual([50, 0]);
  });
});
