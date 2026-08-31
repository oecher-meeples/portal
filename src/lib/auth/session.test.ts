import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
const getCurrentSessionMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({
  getCurrentUser: getCurrentUserMock,
  getCurrentSession: getCurrentSessionMock,
}));

const hasPermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  hasPermission: hasPermissionMock,
}));

const logAdminLoginOnceMock = vi.fn();
vi.mock("@/lib/auth/login-log", () => ({
  logAdminLoginOnce: (...args: unknown[]) => logAdminLoginOnceMock(...args),
}));

/** Stubs hasPermission by key — everything not listed resolves to false. */
function mockPermissions(overrides: Record<string, boolean>) {
  hasPermissionMock.mockImplementation((_userId: string, key: string) =>
    Promise.resolve(overrides[key] ?? false),
  );
}

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
  requireAdminPermission,
  getRealSessionTier,
  getPreviewTier,
  getSessionTier,
  hasPermissionInCurrentView,
} = await import("./session");

const ACTIVE = { id: "meeple-1", anonymizedAt: null };
const ACTIVE_MEMBER = { resignedAt: null, membershipEndsAt: null };

const RESIGNED_AND_GONE = { id: "meeple-2", anonymizedAt: null };
const RESIGNED_AND_GONE_MEMBER = {
  resignedAt: new Date("2024-07-01T00:00:00Z"),
  membershipEndsAt: new Date("2025-01-01T00:00:00Z"),
};

function withUser(
  meeple: unknown,
  at: string,
  member: unknown = ACTIVE_MEMBER,
) {
  pathname = at;
  getCurrentUserMock.mockResolvedValue({ id: "user-1", name: "Lea" });
  ensureMeepleMock.mockResolvedValue(meeple);
  prismaMock.member.findUnique.mockResolvedValue(member as never);
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

    expect(session.membershipState).toBe("registriert");
    expect(session.meeple).toEqual(ACTIVE);
  });

  it("lets a member with a recorded resignation through on any route", async () => {
    withUser(ACTIVE, "/ludothek", {
      resignedAt: new Date("2026-07-01T00:00:00Z"),
      membershipEndsAt: new Date("2999-01-01T00:00:00Z"),
    });

    const session = await requireMember();

    expect(session.membershipState).toBe("gekuendigt");
  });

  it("rejects a resigned member on a blocked route", async () => {
    withUser(RESIGNED_AND_GONE, "/ludothek", RESIGNED_AND_GONE_MEMBER);

    await expect(requireMember()).rejects.toThrow(RedirectError);
    expect(redirectMock).toHaveBeenCalledWith("/403");
  });

  it("rejects a resigned member on the internal newsroom", async () => {
    withUser(RESIGNED_AND_GONE, "/dashboard/news", RESIGNED_AND_GONE_MEMBER);

    await expect(requireMember()).rejects.toThrow(RedirectError);
    expect(redirectMock).toHaveBeenCalledWith("/403");
  });

  it("lets a resigned member through on a settlement route", async () => {
    withUser(RESIGNED_AND_GONE, "/scan", RESIGNED_AND_GONE_MEMBER);

    const session = await requireMember();

    expect(session.membershipState).toBe("ausgetreten");
  });
});

describe("requireAdminPermission — admin:access forced-relogin (#231)", () => {
  it("does not check session freshness for a non-admin:access permission", async () => {
    withUser(ACTIVE, "/admin/bestand");
    mockPermissions({ "admin:access": false, "games:manage": true });

    await requireAdminPermission("games:manage");

    expect(getCurrentSessionMock).not.toHaveBeenCalled();
  });

  it("logs the login and lets a fresh admin:access session through", async () => {
    redirectMock.mockClear();
    withUser(ACTIVE, "/admin");
    mockPermissions({ "admin:access": true });
    const createdAt = new Date(Date.now() - 60 * 1000);
    getCurrentSessionMock.mockResolvedValue({
      user: { id: "user-1" },
      session: { createdAt },
    });

    await requireAdminPermission("admin:access");

    expect(logAdminLoginOnceMock).toHaveBeenCalledWith("user-1", createdAt);
    expect(redirectMock).not.toHaveBeenCalledWith(
      expect.stringContaining("force-logout"),
    );
  });

  it("forces a re-login once the admin:access session is older than 12h", async () => {
    withUser(ACTIVE, "/admin");
    mockPermissions({ "admin:access": true });
    const createdAt = new Date(Date.now() - 13 * 60 * 60 * 1000);
    getCurrentSessionMock.mockResolvedValue({
      user: { id: "user-1" },
      session: { createdAt },
    });

    await expect(requireAdminPermission("admin:access")).rejects.toThrow(
      RedirectError,
    );
    expect(redirectMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/force-logout?next="),
    );
  });

  it("handles createdAt as an ISO string, matching the SDK's cache-miss fallback path (#371)", async () => {
    redirectMock.mockClear();
    withUser(ACTIVE, "/admin");
    mockPermissions({ "admin:access": true });
    const createdAt = new Date(Date.now() - 60 * 1000);
    getCurrentSessionMock.mockResolvedValue({
      user: { id: "user-1" },
      // `auth.getSession()` only normalises `createdAt` to a `Date` on its
      // cache-hit path — the cache-miss fallback (e.g. right after a
      // server restart, before any session-data cache cookie exists)
      // passes the raw JSON response through, leaving it a string.
      session: { createdAt: createdAt.toISOString() },
    });

    await requireAdminPermission("admin:access");

    expect(logAdminLoginOnceMock).toHaveBeenCalledWith("user-1", createdAt);
    expect(redirectMock).not.toHaveBeenCalledWith(
      expect.stringContaining("force-logout"),
    );
  });

  it("lets the request through when there is no resolvable session (degraded render)", async () => {
    redirectMock.mockClear();
    withUser(ACTIVE, "/admin");
    mockPermissions({ "admin:access": true });
    getCurrentSessionMock.mockResolvedValue(null);

    await requireAdminPermission("admin:access");

    expect(redirectMock).not.toHaveBeenCalledWith(
      expect.stringContaining("force-logout"),
    );
  });
});

describe("getRealSessionTier", () => {
  it("returns gast without a session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    expect(await getRealSessionTier()).toBe("gast");
  });

  it("returns admin for a user with the admin:access permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1", name: "Lea" });
    mockPermissions({ "admin:access": true });

    expect(await getRealSessionTier()).toBe("admin");
  });

  it("returns mitglied for a logged-in user without the admin:access permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1", name: "Lea" });
    mockPermissions({ "admin:access": false });

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
    mockPermissions({ "admin:access": false });
    previewCookie = "admin";

    expect(await getSessionTier()).toBe("mitglied");
  });

  it("defaults to mitglied for a real admin without a preview cookie", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1", name: "Lea" });
    mockPermissions({ "admin:access": true });
    previewCookie = undefined;

    expect(await getSessionTier()).toBe("mitglied");
  });

  it("lets a real admin explicitly switch back up to admin", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1", name: "Lea" });
    mockPermissions({ "admin:access": true });
    previewCookie = "admin";

    expect(await getSessionTier()).toBe("admin");
  });

  it("lets a real admin's preview cookie override the displayed tier", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1", name: "Lea" });
    mockPermissions({ "admin:access": true });
    previewCookie = "gast";

    expect(await getSessionTier()).toBe("gast");
  });
});

describe("hasPermissionInCurrentView", () => {
  it("defers to the real permission for a non-admin (e.g. a moderator), preview cookie or not", async () => {
    previewCookie = undefined;
    mockPermissions({ "admin:access": false, "posts:write": true });

    expect(await hasPermissionInCurrentView("user-1", "posts:write")).toBe(
      true,
    );
  });

  it("hides an admin's permission while previewing a non-admin tier, even with the real permission", async () => {
    previewCookie = "gast";
    hasPermissionMock.mockClear();
    mockPermissions({ "admin:access": true, "posts:write": true });

    expect(await hasPermissionInCurrentView("user-1", "posts:write")).toBe(
      false,
    );
    expect(hasPermissionMock).not.toHaveBeenCalledWith("user-1", "posts:write");
  });

  it("hides an admin's permission by default (no preview cookie) — mitglied is the default view (#126)", async () => {
    previewCookie = undefined;
    hasPermissionMock.mockClear();
    mockPermissions({ "admin:access": true, "posts:write": true });

    expect(await hasPermissionInCurrentView("user-1", "posts:write")).toBe(
      false,
    );
    expect(hasPermissionMock).not.toHaveBeenCalledWith("user-1", "posts:write");
  });

  it("shows an admin's permission once they explicitly preview back to admin", async () => {
    previewCookie = "admin";
    mockPermissions({ "admin:access": true, "posts:write": true });

    expect(await hasPermissionInCurrentView("user-1", "posts:write")).toBe(
      true,
    );
  });

  it("stays false without the real permission, preview or not", async () => {
    previewCookie = undefined;
    mockPermissions({ "admin:access": false, "posts:write": false });

    expect(await hasPermissionInCurrentView("user-1", "posts:write")).toBe(
      false,
    );
  });
});
