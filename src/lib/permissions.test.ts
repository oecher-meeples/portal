import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const { hasPermission } = await import("@/lib/permissions");

describe("hasPermission", () => {
  it("returns true when the user has a role granting the permission", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await hasPermission("user-1", "posts:write");

    expect(result).toBe(true);
    expect(prismaMock.rolePermission.count).toHaveBeenCalledWith({
      where: {
        permission: { key: "posts:write" },
        role: { users: { some: { neonAuthUserId: "user-1" } } },
      },
    });
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
