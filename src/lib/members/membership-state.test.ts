import { describe, expect, it } from "vitest";
import { computeMembershipEndsAt } from "./membership-state";

describe("computeMembershipEndsAt", () => {
  it("ends at the coming turn of the year when far more than 4 weeks remain", () => {
    expect(
      computeMembershipEndsAt(new Date("2026-07-29T12:00:00Z")).toISOString(),
    ).toBe("2027-01-01T00:00:00.000Z");
  });

  it("skips to the turn of the year after next when submitted on 10 December (#258)", () => {
    expect(
      computeMembershipEndsAt(new Date("2026-12-10T00:00:00Z")).toISOString(),
    ).toBe("2028-01-01T00:00:00.000Z");
  });

  it("still counts exactly 4 weeks' notice as sufficient", () => {
    expect(
      computeMembershipEndsAt(new Date("2026-12-04T00:00:00Z")).toISOString(),
    ).toBe("2027-01-01T00:00:00.000Z");
  });

  it("pushes out once notice is a single second short of 4 weeks", () => {
    expect(
      computeMembershipEndsAt(new Date("2026-12-04T00:00:01Z")).toISOString(),
    ).toBe("2028-01-01T00:00:00.000Z");
  });

  it("still counts a second more than 4 weeks as sufficient", () => {
    expect(
      computeMembershipEndsAt(new Date("2026-12-03T23:59:59Z")).toISOString(),
    ).toBe("2027-01-01T00:00:00.000Z");
  });

  it("pushes out a resignation submitted on 31 December itself", () => {
    expect(
      computeMembershipEndsAt(new Date("2026-12-31T23:59:00Z")).toISOString(),
    ).toBe("2028-01-01T00:00:00.000Z");
  });
});
