import { describe, expect, it } from "vitest";
import { gameCopyAdminWhere } from "./filters";

describe("gameCopyAdminWhere", () => {
  it("excludes deinventarised games by default", () => {
    expect(gameCopyAdminWhere()).toEqual({
      AND: [{ status: { not: "DEINVENTARISED" } }],
    });
  });

  it("includes deinventarised games when explicitly requested", () => {
    expect(gameCopyAdminWhere({ showDeinventarised: true })).toEqual({});
  });

  it("combines the deinventarised exclusion with the ungeprüft filter", () => {
    expect(gameCopyAdminWhere({ filter: "ungeprueft" })).toEqual({
      AND: [
        { status: { not: "DEINVENTARISED" } },
        { needsCompletenessCheck: true },
      ],
    });
  });

  it("filters for a maintenance defect", () => {
    expect(gameCopyAdminWhere({ filter: "mangel" })).toEqual({
      AND: [{ status: { not: "DEINVENTARISED" } }, { status: "MAINTENANCE" }],
    });
  });

  it("filters for games in Unsortiert", () => {
    expect(gameCopyAdminWhere({ filter: "nicht-erfasst" })).toEqual({
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
      gameCopyAdminWhere({ showDeinventarised: true, filter: "mangel" }),
    ).toEqual({ AND: [{ status: "MAINTENANCE" }] });
  });
});
