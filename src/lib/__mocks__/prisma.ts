import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import { beforeEach } from "vitest";
import { PERMISSIONS } from "@/lib/auth/permission-keys";

export const prismaMock =
  mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

/**
 * Stubs the permission lookup behind `hasPermission`/`getUserPermissionKeys`
 * (#525: both read `rolePermission.findMany`). `"all"` grants every key of
 * the catalog, `[]` none.
 */
export function mockPermissionKeys(keys: "all" | readonly string[]) {
  const granted =
    keys === "all" ? PERMISSIONS.map((permission) => permission.key) : keys;
  prismaMock.rolePermission.findMany.mockResolvedValue(
    granted.map((key) => ({ permission: { key } })) as never,
  );
}
