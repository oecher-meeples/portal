import { describe, expect, it } from "vitest";
import {
  buildHelperOverview,
  averageBookedMinutes,
  filterOverviewGroups,
  overviewFilterOptions,
  paginateOverviewGroups,
  type HelperOverviewGroup,
  averageBookedMinutesPerHelper,
  totalBookedMinutes,
  utilizationColor,
  dayUtilizationPercent,
  formatUtilization,
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

describe("average and color", () => {
  const group = (minutes: number[]) =>
    ({
      rows: minutes.map((bookedMinutes) => ({ bookedMinutes })),
    }) as never;

  it("averages booked minutes per row", () => {
    expect(averageBookedMinutes([group([0, 120]), group([240])])).toBe(120);
    expect(averageBookedMinutes([])).toBe(0);
  });

  it("goes from red at 0h to green at the average and above", () => {
    expect(utilizationColor(0, 120)).toBe("hsl(0 70% 45%)");
    expect(utilizationColor(60, 120)).toBe("hsl(60 70% 45%)");
    expect(utilizationColor(120, 120)).toBe("hsl(120 70% 45%)");
    expect(utilizationColor(300, 120)).toBe("hsl(120 70% 45%)");
    expect(utilizationColor(0, 0)).toBe("hsl(120 70% 45%)");
  });
});

describe("per-helper totals", () => {
  const group = (minutes: number[]) =>
    ({
      rows: minutes.map((bookedMinutes) => ({ bookedMinutes })),
    }) as never;

  it("sums per person and averages over persons", () => {
    const groups = [group([60, 60]), group([240])];
    expect(totalBookedMinutes(groups[0])).toBe(120);
    expect(averageBookedMinutesPerHelper(groups)).toBe(180);
    expect(averageBookedMinutesPerHelper([])).toBe(0);
  });
});

describe("filter and pagination", () => {
  const mkRow = (dayDate: string, roleNames: string[]) =>
    ({ dayDate, roleNames, bookedMinutes: 0 }) as never;
  const mkGroup = (helperId: string, rows: unknown[]) =>
    ({ helperId, rows }) as never as HelperOverviewGroup;

  it("filters rows by day and role and drops empty persons", () => {
    const groups = [
      mkGroup("a", [mkRow("d1", ["Küche"]), mkRow("d2", ["Kasse"])]),
      mkGroup("b", [mkRow("d2", ["Küche"])]),
    ];
    const result = filterOverviewGroups(groups, {
      dayDate: "d2",
      roleName: "Küche",
    });
    expect(result.map((g) => [g.helperId, g.rows.length])).toEqual([["b", 1]]);
    expect(
      filterOverviewGroups(groups, { dayDate: null, roleName: null }),
    ).toHaveLength(2);
  });

  it("searches the name case-insensitively", () => {
    const groups = [
      { ...mkGroup("a", [mkRow("d1", [])]), displayName: "Anna Müller" },
      { ...mkGroup("b", [mkRow("d1", [])]), displayName: "Ben" },
    ] as HelperOverviewGroup[];
    expect(
      filterOverviewGroups(groups, {
        dayDate: null,
        roleName: null,
        query: " MÜLL ",
      }).map((g) => g.helperId),
    ).toEqual(["a"]);
  });

  it("never splits a person over two pages", () => {
    const groups = [
      mkGroup("a", Array(8).fill(mkRow("d", []))),
      mkGroup("b", Array(8).fill(mkRow("d", []))),
      mkGroup("c", Array(8).fill(mkRow("d", []))),
    ];
    const pages = paginateOverviewGroups(groups, 20);
    expect(pages.map((p) => p.map((g) => g.helperId))).toEqual([
      ["a", "b"],
      ["c"],
    ]);
  });

  it("gives an oversized person a page of their own", () => {
    const pages = paginateOverviewGroups(
      [
        mkGroup("a", Array(3).fill(mkRow("d", []))),
        mkGroup("big", Array(25).fill(mkRow("d", []))),
      ],
      20,
    );
    expect(pages.map((p) => p.map((g) => g.helperId))).toEqual([
      ["a"],
      ["big"],
    ]);
  });

  it("collects the filter options", () => {
    const options = overviewFilterOptions([
      mkGroup("a", [mkRow("d2", ["Küche"]), mkRow("d1", ["Kasse", "Küche"])]),
    ]);
    expect(options).toEqual({ days: ["d1", "d2"], roles: ["Kasse", "Küche"] });
  });
});

describe("formatUtilization", () => {
  it("formats hours and percent", () => {
    expect(
      formatUtilization({
        bookedMinutes: 120,
        offeredMinutes: 240,
        utilizationPercent: 50,
      }),
    ).toBe("2/4h (50%)");
    expect(
      formatUtilization({
        bookedMinutes: 90,
        offeredMinutes: 540,
        utilizationPercent: 17,
      }),
    ).toBe("1,5/9h (17%)");
  });
});

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
