import { describe, expect, it, vi } from "vitest";
import { mockPermissionKeys, prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const { hasPermission, getUserPermissionKeys } =
  await import("@/lib/auth/permissions");

describe("hasPermission", () => {
  it("is true when the user's active roles grant the key", async () => {
    mockPermissionKeys(["posts:public", "games:manage"]);

    expect(await hasPermission("user-1", "posts:public")).toBe(true);
  });

  it("is false when none of the user's roles grant the key", async () => {
    mockPermissionKeys(["posts:public"]);

    expect(await hasPermission("user-1", "posts:delete")).toBe(false);
  });

  it("derives from getUserPermissionKeys' single findMany, not a count per key", async () => {
    mockPermissionKeys(["members:manage"]);

    await hasPermission("user-2", "members:manage");

    expect(prismaMock.rolePermission.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.rolePermission.count).not.toHaveBeenCalled();
  });
});

describe("getUserPermissionKeys", () => {
  it("filters on the active-assignment window (#264)", async () => {
    vi.setSystemTime(new Date("2026-08-30T10:00:00Z"));
    prismaMock.rolePermission.findMany.mockResolvedValue([
      { permission: { key: "games:manage" } },
    ] as never);

    const keys = await getUserPermissionKeys("user-1");

    expect(keys).toEqual(["games:manage"]);
    expect(prismaMock.rolePermission.findMany).toHaveBeenCalledWith({
      where: {
        role: {
          users: {
            some: {
              neonAuthUserId: "user-1",
              startsAt: { lte: new Date("2026-08-30T10:00:00Z") },
              OR: [
                { endsAt: null },
                { endsAt: { gt: new Date("2026-08-30T10:00:00Z") } },
              ],
            },
          },
        },
      },
      select: { permission: { select: { key: true } } },
    });
    vi.useRealTimers();
  });
});
