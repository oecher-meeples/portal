import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

class RedirectError extends Error {}
const redirectMock = vi.fn((target: string) => {
  throw new RedirectError(target);
});
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const {
  ensureMeeple,
  getCurrentMeeple,
  getMembershipState,
  nextTurnOfTheYear,
  requireMeeple,
} = await import("./meeples");

const MEEPLE = { id: "meeple-1", displayName: "Lea" };

describe("ensureMeeple", () => {
  it("creates a meeple for a user that has none yet", async () => {
    prismaMock.meeple.upsert.mockResolvedValue(MEEPLE as never);

    await ensureMeeple({ id: "user-1", name: "Lea", email: "lea@example.org" });

    expect(prismaMock.meeple.upsert).toHaveBeenCalledWith({
      where: { neonAuthUserId: "user-1" },
      update: { displayName: "Lea", email: "lea@example.org" },
      create: {
        neonAuthUserId: "user-1",
        displayName: "Lea",
        email: "lea@example.org",
      },
    });
  });

  it("upserts instead of creating, so a second call cannot duplicate", async () => {
    prismaMock.meeple.upsert.mockResolvedValue(MEEPLE as never);

    await ensureMeeple({ id: "user-1", name: "Lea", email: "lea@example.org" });
    await ensureMeeple({ id: "user-1", name: "Lea", email: "lea@example.org" });

    expect(prismaMock.meeple.upsert).toHaveBeenCalledTimes(2);
    expect(prismaMock.meeple.create).not.toHaveBeenCalled();
  });

  it("updates the display name when it changed at the auth provider", async () => {
    prismaMock.meeple.upsert.mockResolvedValue(MEEPLE as never);

    await ensureMeeple({
      id: "user-1",
      name: "Lea Neuer Name",
      email: "lea@example.org",
    });

    expect(prismaMock.meeple.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { displayName: "Lea Neuer Name", email: "lea@example.org" },
      }),
    );
  });

  it("falls back to the mail-local-part when the account has no name", async () => {
    prismaMock.meeple.upsert.mockResolvedValue(MEEPLE as never);

    await ensureMeeple({ id: "user-1", name: "  ", email: "lea@example.org" });

    expect(prismaMock.meeple.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { displayName: "lea", email: "lea@example.org" },
      }),
    );
  });
});

describe("getCurrentMeeple / requireMeeple", () => {
  it("returns null without a session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    expect(await getCurrentMeeple()).toBeNull();
    expect(prismaMock.meeple.upsert).not.toHaveBeenCalled();
  });

  it("redirects to the login page when there is no session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(requireMeeple()).rejects.toThrow(RedirectError);
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("returns the meeple for a logged-in user", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1", name: "Lea" });
    prismaMock.meeple.upsert.mockResolvedValue(MEEPLE as never);

    expect(await requireMeeple()).toEqual(MEEPLE);
  });
});

describe("getMembershipState", () => {
  const NOW = new Date("2026-07-29T12:00:00Z");

  it("is aktiv without a resignation", () => {
    expect(
      getMembershipState(
        { resignedAt: null, membershipEndsAt: null, anonymizedAt: null },
        NOW,
      ),
    ).toBe("aktiv");
  });

  it("is gekuendigt while the membership still runs", () => {
    expect(
      getMembershipState(
        {
          resignedAt: new Date("2026-07-01T00:00:00Z"),
          membershipEndsAt: new Date("2027-01-01T00:00:00Z"),
          anonymizedAt: null,
        },
        NOW,
      ),
    ).toBe("gekuendigt");
  });

  it("is ausgetreten once the turn of the year has passed", () => {
    expect(
      getMembershipState(
        {
          resignedAt: new Date("2025-07-01T00:00:00Z"),
          membershipEndsAt: new Date("2026-01-01T00:00:00Z"),
          anonymizedAt: null,
        },
        NOW,
      ),
    ).toBe("ausgetreten");
  });

  it("is ausgetreten on the very day the membership ends", () => {
    expect(
      getMembershipState(
        {
          resignedAt: new Date("2025-07-01T00:00:00Z"),
          membershipEndsAt: new Date("2026-07-29T00:00:00Z"),
          anonymizedAt: null,
        },
        NOW,
      ),
    ).toBe("ausgetreten");
  });

  it("stays gekuendigt as long as the end date is still ahead on the same day", () => {
    expect(
      getMembershipState(
        {
          resignedAt: new Date("2025-07-01T00:00:00Z"),
          membershipEndsAt: new Date("2026-07-29T23:00:00Z"),
          anonymizedAt: null,
        },
        NOW,
      ),
    ).toBe("gekuendigt");
  });

  it("is anonymisiert regardless of the other dates", () => {
    expect(
      getMembershipState(
        {
          resignedAt: new Date("2025-07-01T00:00:00Z"),
          membershipEndsAt: new Date("2026-01-01T00:00:00Z"),
          anonymizedAt: new Date("2026-03-01T00:00:00Z"),
        },
        NOW,
      ),
    ).toBe("anonymisiert");
  });

  it("treats a resignation without an end date as gekuendigt", () => {
    expect(
      getMembershipState(
        {
          resignedAt: new Date("2026-07-01T00:00:00Z"),
          membershipEndsAt: null,
          anonymizedAt: null,
        },
        NOW,
      ),
    ).toBe("gekuendigt");
  });
});

describe("nextTurnOfTheYear", () => {
  it("returns the first of january of the following year", () => {
    expect(nextTurnOfTheYear(new Date("2026-07-29T12:00:00Z")).toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
  });

  it("still returns the coming turn of the year on 31 december", () => {
    expect(nextTurnOfTheYear(new Date("2026-12-31T23:59:00Z")).toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
  });
});
