import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const { hasPermission, getUserPermissionKeys } =
  await import("@/lib/auth/permissions");

describe("hasPermission", () => {
  it("returns true when the user has an active role granting the permission", async () => {
    vi.setSystemTime(new Date("2026-08-30T10:00:00Z"));
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await hasPermission("user-1", "posts:write");

    expect(result).toBe(true);
    expect(prismaMock.rolePermission.count).toHaveBeenCalledWith({
      where: {
        permission: { key: "posts:write" },
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
    });
    vi.useRealTimers();
  });

  it("returns false when none of the user's roles grant the permission", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await hasPermission("user-1", "posts:delete");

    expect(result).toBe(false);
  });

  it("returns true when the user has multiple roles and at least one grants the permission", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(2);

    const result = await hasPermission("user-2", "members:manage");

    expect(result).toBe(true);
  });
});

describe("getUserPermissionKeys", () => {
  it("filters on the same active-assignment window as hasPermission", async () => {
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
