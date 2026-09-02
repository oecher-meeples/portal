import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const getLoginBackoffStatusMock = vi.fn();
const adminResetLoginBackoffMock = vi.fn();
const setManualLoginLockMock = vi.fn();
vi.mock("@/lib/utils/rate-limit", () => ({
  getLoginBackoffStatus: (...args: unknown[]) =>
    getLoginBackoffStatusMock(...args),
  adminResetLoginBackoff: (...args: unknown[]) =>
    adminResetLoginBackoffMock(...args),
  setManualLoginLock: (...args: unknown[]) => setManualLoginLockMock(...args),
}));

const {
  getMeepleLoginRateLimitStatus,
  resetMeepleLoginRateLimit,
  lockMeepleLogin,
} = await import("./rate-limit-actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  vi.clearAllMocks();
  requirePermissionMock.mockResolvedValue({ id: "admin-1" });
  prismaMock.member.findUnique.mockResolvedValue({
    email: "Member@Example.com",
  } as never);
});

describe("getMeepleLoginRateLimitStatus", () => {
  it("requires members:manage", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(getMeepleLoginRateLimitStatus("meeple-1")).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("looks up the status by the lowercased member email", async () => {
    getLoginBackoffStatusMock.mockResolvedValue({
      failCount: 5,
      currentCooldownSecs: 1,
      atCap: false,
      manuallyLockedAt: null,
      lastFailedAt: new Date(),
    });

    await getMeepleLoginRateLimitStatus("meeple-1");

    expect(getLoginBackoffStatusMock).toHaveBeenCalledWith(
      "login:email:member@example.com",
    );
  });

  it("reports an error without a member email", async () => {
    prismaMock.member.findUnique.mockResolvedValue({ email: null } as never);

    const result = await getMeepleLoginRateLimitStatus("meeple-1");

    expect(result).toEqual({
      error: "Für dieses Mitglied ist keine E-Mail hinterlegt.",
    });
    expect(getLoginBackoffStatusMock).not.toHaveBeenCalled();
  });
});

describe("resetMeepleLoginRateLimit", () => {
  it("resets the counter for the member's login key", async () => {
    const result = await resetMeepleLoginRateLimit("meeple-1");

    expect(adminResetLoginBackoffMock).toHaveBeenCalledWith(
      "login:email:member@example.com",
    );
    expect(result).toEqual({ success: true });
  });
});

describe("lockMeepleLogin", () => {
  it("sets a manual lock for the member's login key", async () => {
    const result = await lockMeepleLogin("meeple-1");

    expect(setManualLoginLockMock).toHaveBeenCalledWith(
      "login:email:member@example.com",
    );
    expect(result).toEqual({ success: true });
  });
});
