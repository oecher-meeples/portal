import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const { getPostPermissions } = await import("@/lib/content/post-permissions");

describe("getPostPermissions", () => {
  it("reflects both posts:public and posts:internal independently", async () => {
    prismaMock.rolePermission.count.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async ({ where }: any) =>
        where.permission.key === "posts:internal" ? 1 : 0) as never,
    );

    const perms = await getPostPermissions("user-1");

    expect(perms).toEqual({ canEditPublic: false, canEditInternal: true });
  });

  it("returns both false when neither permission is granted", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const perms = await getPostPermissions("user-1");

    expect(perms).toEqual({ canEditPublic: false, canEditInternal: false });
  });

  it("returns both true when both permissions are granted", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const perms = await getPostPermissions("user-1");

    expect(perms).toEqual({ canEditPublic: true, canEditInternal: true });
  });
});
