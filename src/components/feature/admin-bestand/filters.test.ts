import { describe, expect, it } from "vitest";
import { boardGameAdminWhere } from "./filters";

describe("boardGameAdminWhere", () => {
  it("excludes deinventarised games by default", () => {
    expect(boardGameAdminWhere()).toEqual({
      AND: [{ status: { not: "DEINVENTARISED" } }],
    });
  });

  it("includes deinventarised games when explicitly requested", () => {
    expect(boardGameAdminWhere({ showDeinventarised: true })).toEqual({});
  });

  it("combines the deinventarised exclusion with the ungeprüft filter", () => {
    expect(boardGameAdminWhere({ filter: "ungeprueft" })).toEqual({
      AND: [
        { status: { not: "DEINVENTARISED" } },
        { needsCompletenessCheck: true },
      ],
    });
  });

  it("filters for a maintenance defect", () => {
    expect(boardGameAdminWhere({ filter: "mangel" })).toEqual({
      AND: [{ status: { not: "DEINVENTARISED" } }, { status: "MAINTENANCE" }],
    });
  });

  it("filters for games in Unsortiert", () => {
    expect(boardGameAdminWhere({ filter: "nicht-erfasst" })).toEqual({
      AND: [
        { status: { not: "DEINVENTARISED" } },
        {
          holdings: {
            some: { endedAt: null, unit: { code: "OM-BOX-0000" } },
          },
        },
      ],
    });
  });

  it("applies only the requested filter when deinventarised games are shown too", () => {
    expect(
      boardGameAdminWhere({ showDeinventarised: true, filter: "mangel" }),
    ).toEqual({ AND: [{ status: "MAINTENANCE" }] });
  });
});
