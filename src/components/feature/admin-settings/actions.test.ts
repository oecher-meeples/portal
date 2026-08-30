import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/permissions")>()),
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const setDefaultInviteDaysMock = vi.fn();
vi.mock("@/lib/members/invite-settings", () => ({
  setDefaultInviteDays: (...args: unknown[]) =>
    setDefaultInviteDaysMock(...args),
}));

const { disconnectInstagram, updateDefaultInviteDays } = await import(
  "./actions"
);

describe("disconnectInstagram", () => {
  it("rejects when the user lacks the instagram:connect permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await disconnectInstagram();

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.instagramConnection.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes the active instagram connection when authorized", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await disconnectInstagram();

    expect(result).toEqual({ success: true });
    expect(prismaMock.instagramConnection.deleteMany).toHaveBeenCalledTimes(1);
  });
});

describe("updateDefaultInviteDays", () => {
  it("rejects a value outside the valid range", async () => {
    requirePermissionMock.mockResolvedValue({ id: "admin-1" });

    const result = await updateDefaultInviteDays(200);

    expect(result?.error).toMatch(/zwischen/);
    expect(setDefaultInviteDaysMock).not.toHaveBeenCalled();
  });

  it("stores a valid value", async () => {
    requirePermissionMock.mockResolvedValue({ id: "admin-1" });

    const result = await updateDefaultInviteDays(10);

    expect(result).toEqual({ success: true });
    expect(setDefaultInviteDaysMock).toHaveBeenCalledWith(10);
  });
});
