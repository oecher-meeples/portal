import { describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

const hasRoleMock = vi.fn();
vi.mock("@/lib/permissions", () => ({ hasRole: hasRoleMock }));

const ensureMeepleMock = vi.fn();
vi.mock("@/lib/meeples", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/meeples")>("@/lib/meeples");
  return { ...actual, ensureMeeple: ensureMeepleMock };
});

class RedirectError extends Error {}
const redirectMock = vi.fn((target: string) => {
  throw new RedirectError(target);
});
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

let pathname = "/dashboard";
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-pathname": pathname }),
}));

const { isSettlementPath, requireMember } = await import("./session");

const ACTIVE = {
  id: "meeple-1",
  resignedAt: null,
  membershipEndsAt: null,
  anonymizedAt: null,
};

const RESIGNED_AND_GONE = {
  id: "meeple-2",
  resignedAt: new Date("2024-07-01T00:00:00Z"),
  membershipEndsAt: new Date("2025-01-01T00:00:00Z"),
  anonymizedAt: null,
};

function withUser(meeple: unknown, at: string) {
  pathname = at;
  getCurrentUserMock.mockResolvedValue({ id: "user-1", name: "Lea" });
  ensureMeepleMock.mockResolvedValue(meeple);
}

describe("isSettlementPath", () => {
  it("allows the settlement routes", () => {
    expect(isSettlementPath("/dashboard")).toBe(true);
    expect(isSettlementPath("/profil")).toBe(true);
    expect(isSettlementPath("/scan")).toBe(true);
    expect(isSettlementPath("/dashboard/kalender")).toBe(true);
    expect(isSettlementPath("/mitglieder")).toBe(true);
  });

  it("blocks everything else, including nested internal routes", () => {
    expect(isSettlementPath("/ludothek")).toBe(false);
    expect(isSettlementPath("/lfg")).toBe(false);
    expect(isSettlementPath("/dashboard/news")).toBe(false);
    expect(isSettlementPath("/admin/bestand")).toBe(false);
    expect(isSettlementPath("")).toBe(false);
  });
});

describe("requireMember", () => {
  it("redirects to the login page without a session", async () => {
    pathname = "/dashboard";
    getCurrentUserMock.mockResolvedValue(null);

    await expect(requireMember()).rejects.toThrow(RedirectError);
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("lets an active member through on any route", async () => {
    withUser(ACTIVE, "/ludothek");

    const session = await requireMember();

    expect(session.membershipState).toBe("aktiv");
    expect(session.meeple).toEqual(ACTIVE);
  });

  it("lets a member with a recorded resignation through on any route", async () => {
    withUser(
      {
        ...ACTIVE,
        resignedAt: new Date("2026-07-01T00:00:00Z"),
        membershipEndsAt: new Date("2999-01-01T00:00:00Z"),
      },
      "/ludothek",
    );

    const session = await requireMember();

    expect(session.membershipState).toBe("gekuendigt");
  });

  it("rejects a resigned member on a blocked route", async () => {
    withUser(RESIGNED_AND_GONE, "/ludothek");

    await expect(requireMember()).rejects.toThrow(RedirectError);
    expect(redirectMock).toHaveBeenCalledWith("/403");
  });

  it("rejects a resigned member on the internal newsroom", async () => {
    withUser(RESIGNED_AND_GONE, "/dashboard/news");

    await expect(requireMember()).rejects.toThrow(RedirectError);
    expect(redirectMock).toHaveBeenCalledWith("/403");
  });

  it("lets a resigned member through on a settlement route", async () => {
    withUser(RESIGNED_AND_GONE, "/scan");

    const session = await requireMember();

    expect(session.membershipState).toBe("ausgetreten");
  });
});
