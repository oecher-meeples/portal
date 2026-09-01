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
    slug: "mitglied-1",
    firstName: "Erika",
    lastName: "Musterfrau",
    email: "erika@example.com",
    meepleId: "meeple-1",
    birthDate: new Date("1990-01-01"),
    birthPlace: null,
    street: null,
    postalCode: null,
    city: null,
    phone: null,
    selbstgewaehlterBeitrag: null,
    joinedAt: new Date("2024-01-01T00:00:00Z"),
    resignedAt: null,
    membershipEndsAt: null,
    meeple: {
      displayName: "Erika",
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
  openInviteTokenByEmail: new Map<string, string>(),
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

  it("takes joinedAt from Member, not the linked Meeple (Live-Review F1)", () => {
    const rows = buildVereinsmitgliedRows(
      [
        member({
          joinedAt: new Date("2021-06-15T00:00:00Z"),
          meeple: null,
          meepleId: null,
        }),
      ],
      EMPTY_LOOKUPS,
      NOW,
    );

    expect(rows[0].joinedAt).toBe("2021-06-15T00:00:00.000Z");
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
        openInviteTokenByEmail: new Map(),
      },
      NOW,
    );

    expect(rows[0].openGames).toBe(3);
    expect(rows[0].openUnits).toBe(2);
  });

  it("looks up an open invite token by the member's email", () => {
    const rows = buildVereinsmitgliedRows(
      [member({ id: "member-1", email: "erika@example.com" })],
      {
        ...EMPTY_LOOKUPS,
        openInviteTokenByEmail: new Map([["erika@example.com", "tok-1"]]),
      },
      NOW,
    );

    expect(rows[0].openInviteToken).toBe("tok-1");
  });

  it("has no invite token without an open invite for that email", () => {
    const rows = buildVereinsmitgliedRows(
      [member({ id: "member-1", email: "erika@example.com" })],
      EMPTY_LOOKUPS,
      NOW,
    );

    expect(rows[0].openInviteToken).toBeNull();
  });

  it("has no invite token for a member without an email", () => {
    const rows = buildVereinsmitgliedRows(
      [member({ id: "member-1", email: null })],
      {
        ...EMPTY_LOOKUPS,
        openInviteTokenByEmail: new Map([["erika@example.com", "tok-1"]]),
      },
      NOW,
    );

    expect(rows[0].openInviteToken).toBeNull();
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
