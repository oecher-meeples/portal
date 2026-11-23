import { describe, expect, it, vi } from "vitest";
import { mockPermissionKeys, prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

const setDefaultInviteDaysMock = vi.fn();
vi.mock("@/lib/members/invite-settings", () => ({
  setDefaultInviteDays: (...args: unknown[]) =>
    setDefaultInviteDaysMock(...args),
}));
vi.mock("@/lib/auth/action-guards", async () =>
  (await import("@/lib/__mocks__/action-guards")).currentUserGuards(),
);

const { disconnectInstagram, updateDefaultInviteDays } =
  await import("./actions");

describe("disconnectInstagram", () => {
  it("rejects when the user lacks the instagram:connect permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys([]);

    const result = await disconnectInstagram();

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.instagramConnection.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes the active instagram connection when authorized", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");

    const result = await disconnectInstagram();

    expect(result).toEqual({ success: true });
    expect(prismaMock.instagramConnection.deleteMany).toHaveBeenCalledTimes(1);
  });
});

describe("updateDefaultInviteDays", () => {
  it("rejects a value outside the valid range", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "admin-1" });
    mockPermissionKeys("all");

    const result = await updateDefaultInviteDays(200);

    expect(result?.error).toMatch(/zwischen/);
    expect(setDefaultInviteDaysMock).not.toHaveBeenCalled();
  });

  it("stores a valid value", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "admin-1" });
    mockPermissionKeys("all");

    const result = await updateDefaultInviteDays(10);

    expect(result).toEqual({ success: true });
    expect(setDefaultInviteDaysMock).toHaveBeenCalledWith(10);
  });
});
