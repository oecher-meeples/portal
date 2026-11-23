import { describe, expect, it, vi } from "vitest";
import { mockPermissionKeys, prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const { getPostPermissions } = await import("@/lib/content/post-permissions");

describe("getPostPermissions", () => {
  it("reflects both posts:public and posts:internal independently", async () => {
    mockPermissionKeys(["posts:internal"]);

    const perms = await getPostPermissions("user-1");

    expect(perms).toEqual({ canEditPublic: false, canEditInternal: true });
  });

  it("returns both false when neither permission is granted", async () => {
    mockPermissionKeys([]);

    const perms = await getPostPermissions("user-1");

    expect(perms).toEqual({ canEditPublic: false, canEditInternal: false });
  });

  it("returns both true when both permissions are granted", async () => {
    mockPermissionKeys("all");

    const perms = await getPostPermissions("user-1");

    expect(perms).toEqual({ canEditPublic: true, canEditInternal: true });
  });
});
