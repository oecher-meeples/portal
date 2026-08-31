import { describe, expect, it } from "vitest";
import {
  buildVereinsmitgliedRows,
  type VereinsmitgliedSourceRow,
} from "./vereinsmitglieder-rows";

const NOW = new Date("2026-07-29T12:00:00Z");

function member(
  overrides: Partial<VereinsmitgliedSourceRow> = {},
): VereinsmitgliedSourceRow {
  return {
    id: "member-1",
    memberNumber: 1,
    firstName: "Erika",
    lastName: "Musterfrau",
    email: "erika@example.com",
    meepleId: "meeple-1",
    birthDate: new Date("1990-01-01"),
    selbstgewaehlterBeitrag: null,
    resignedAt: null,
    membershipEndsAt: null,
    meeple: {
      displayName: "Erika",
      joinedAt: new Date("2024-01-01T00:00:00Z"),
      anonymizedAt: null,
      neonAuthUserId: "user-1",
    },
    ...overrides,
  };
}

const EMPTY_LOOKUPS = {
  openGamesByMemberId: new Map<string, number>(),
  openUnitsByMeepleId: new Map<string, number>(),
  stufe3EligibleIds: new Set<string>(),
};

describe("buildVereinsmitgliedRows", () => {
  it("excludes the Anonymer-Meeple Sammelkonto (#341)", () => {
    const rows = buildVereinsmitgliedRows(
      [
        member({ id: "member-1" }),
        member({
          id: "member-anon",
          meeple: {
            displayName: "Anonymer Meeple",
            joinedAt: new Date("2020-01-01T00:00:00Z"),
            anonymizedAt: null,
            neonAuthUserId: null,
          },
        }),
      ],
      EMPTY_LOOKUPS,
      NOW,
    );

    expect(rows.map((r) => r.id)).toEqual(["member-1"]);
  });

  it("reports hasPortalLogin from Meeple.neonAuthUserId, not just meepleId (#341)", () => {
    const rows = buildVereinsmitgliedRows(
      [
        member({
          id: "member-no-login",
          meeple: {
            displayName: "Ohne Login",
            joinedAt: new Date("2024-01-01T00:00:00Z"),
            anonymizedAt: null,
            neonAuthUserId: null,
          },
        }),
      ],
      EMPTY_LOOKUPS,
      NOW,
    );

    expect(rows[0].hasPortalLogin).toBe(false);
    expect(rows[0].meepleId).toBe("meeple-1");
  });

  it("derives membershipState via getMembershipState", () => {
    const rows = buildVereinsmitgliedRows(
      [
        member({
          resignedAt: new Date("2025-01-01T00:00:00Z"),
          membershipEndsAt: new Date("2026-01-01T00:00:00Z"),
        }),
      ],
      EMPTY_LOOKUPS,
      NOW,
    );

    expect(rows[0].membershipState).toBe("ausgetreten");
  });

  it("looks up openGames by member id and openUnits by meeple id", () => {
    const rows = buildVereinsmitgliedRows(
      [member({ id: "member-1", meepleId: "meeple-1" })],
      {
        openGamesByMemberId: new Map([["member-1", 3]]),
        openUnitsByMeepleId: new Map([["meeple-1", 2]]),
        stufe3EligibleIds: new Set(),
      },
      NOW,
    );

    expect(rows[0].openGames).toBe(3);
    expect(rows[0].openUnits).toBe(2);
  });

  it("marks stufe3Eligible from the given id set", () => {
    const rows = buildVereinsmitgliedRows(
      [member({ id: "member-1" })],
      { ...EMPTY_LOOKUPS, stufe3EligibleIds: new Set(["member-1"]) },
      NOW,
    );

    expect(rows[0].stufe3Eligible).toBe(true);
  });
});
