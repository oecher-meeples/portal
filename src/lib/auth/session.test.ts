import { describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

const hasRoleMock = vi.fn();
const hasPermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  hasRole: hasRoleMock,
  hasPermission: hasPermissionMock,
}));

const ensureMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return { ...actual, ensureMeeple: ensureMeepleMock };
});

class RedirectError extends Error {}
const redirectMock = vi.fn((target: string) => {
  throw new RedirectError(target);
});
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

let pathname = "/dashboard";
let previewCookie: string | undefined;
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-pathname": pathname }),
  cookies: async () => ({
    get: (name: string) =>
      name === "preview-tier" && previewCookie !== undefined
        ? { name, value: previewCookie }
        : undefined,
  }),
}));

const {
  isSettlementPath,
  requireMember,
  getRealSessionTier,
  getPreviewTier,
  getSessionTier,
  hasPermissionInCurrentView,
} = await import("./session");

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

describe("getRealSessionTier", () => {
  it("returns gast without a session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    expect(await getRealSessionTier()).toBe("gast");
  });

  it("returns admin for a user with the admin role", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1", name: "Lea" });
    hasRoleMock.mockResolvedValue(true);

    expect(await getRealSessionTier()).toBe("admin");
  });

  it("returns mitglied for a logged-in user without the admin role", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1", name: "Lea" });
    hasRoleMock.mockResolvedValue(false);

    expect(await getRealSessionTier()).toBe("mitglied");
  });
});

describe("getPreviewTier", () => {
  it("returns null without a preview cookie", async () => {
    previewCookie = undefined;

    expect(await getPreviewTier()).toBeNull();
  });

  it("returns null for a garbage cookie value", async () => {
    previewCookie = "superadmin";

    expect(await getPreviewTier()).toBeNull();
  });

  it("returns the cookie value when it is a valid tier", async () => {
    previewCookie = "gast";

    expect(await getPreviewTier()).toBe("gast");
  });
});

describe("getSessionTier", () => {
  it("ignores the preview cookie for a non-admin — preview is admin-only", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1", name: "Lea" });
    hasRoleMock.mockResolvedValue(false);
    previewCookie = "admin";

    expect(await getSessionTier()).toBe("mitglied");
  });

  it("defaults to mitglied for a real admin without a preview cookie", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1", name: "Lea" });
    hasRoleMock.mockResolvedValue(true);
    previewCookie = undefined;

    expect(await getSessionTier()).toBe("mitglied");
  });

  it("lets a real admin explicitly switch back up to admin", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1", name: "Lea" });
    hasRoleMock.mockResolvedValue(true);
    previewCookie = "admin";

    expect(await getSessionTier()).toBe("admin");
  });

  it("lets a real admin's preview cookie override the displayed tier", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1", name: "Lea" });
    hasRoleMock.mockResolvedValue(true);
    previewCookie = "gast";

    expect(await getSessionTier()).toBe("gast");
  });
});

describe("hasPermissionInCurrentView", () => {
  it("defers to the real permission when no preview is active", async () => {
    previewCookie = undefined;
    hasPermissionMock.mockResolvedValue(true);

    expect(await hasPermissionInCurrentView("user-1", "posts:write")).toBe(
      true,
    );
  });

  it("hides an admin-only affordance while a preview tier is active, even with the real permission", async () => {
    previewCookie = "gast";
    hasPermissionMock.mockClear();
    hasPermissionMock.mockResolvedValue(true);

    expect(await hasPermissionInCurrentView("user-1", "posts:write")).toBe(
      false,
    );
    expect(hasPermissionMock).not.toHaveBeenCalled();
  });

  it("stays false without the real permission, preview or not", async () => {
    previewCookie = undefined;
    hasPermissionMock.mockResolvedValue(false);

    expect(await hasPermissionInCurrentView("user-1", "posts:write")).toBe(
      false,
    );
  });
});
