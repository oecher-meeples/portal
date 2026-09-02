import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { createRole, updateRole, deleteRole, setRolePermissions, reorderRoles } =
  await import("./roles");

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}

beforeEach(() => {
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
  prismaMock.role.aggregate.mockResolvedValue({
    _max: { sortOrder: 4 },
  } as never);
});

describe("createRole", () => {
  it("creates the role with a trimmed name and description, appended after the highest sortOrder", async () => {
    expect(await createRole("  Kassenwart  ", "  Finanzen  ")).toEqual({
      success: true,
    });

    expect(prismaMock.role.create).toHaveBeenCalledWith({
      data: { name: "Kassenwart", description: "Finanzen", sortOrder: 5 },
    });
  });

  it("starts sortOrder at 0 for the very first role", async () => {
    prismaMock.role.aggregate.mockResolvedValue({
      _max: { sortOrder: null },
    } as never);

    await createRole("Kassenwart", null);

    expect(prismaMock.role.create).toHaveBeenCalledWith({
      data: { name: "Kassenwart", description: null, sortOrder: 0 },
    });
  });

  it("stores a blank description as null", async () => {
    await createRole("Kassenwart", "   ");

    expect(prismaMock.role.create).toHaveBeenCalledWith({
      data: { name: "Kassenwart", description: null, sortOrder: 5 },
    });
  });

  it("refuses a blank name", async () => {
    expect(await createRole("   ", null)).toEqual({
      error: "Bitte einen Rollennamen angeben.",
    });
    expect(prismaMock.role.create).not.toHaveBeenCalled();
  });

  it("turns a duplicate name into a speaking error instead of crashing", async () => {
    prismaMock.role.create.mockRejectedValue(uniqueConstraintError());

    expect(await createRole("Vorstand", null)).toEqual({
      error: "Eine Rolle mit dem Namen „Vorstand“ existiert bereits.",
    });
  });

  it("rethrows any other database error", async () => {
    prismaMock.role.create.mockRejectedValue(new Error("db down"));

    await expect(createRole("Vorstand", null)).rejects.toThrow("db down");
  });
});

describe("updateRole", () => {
  it("updates name and description", async () => {
    expect(await updateRole("role-1", "  Vorstand  ", "  Leitung  ")).toEqual({
      success: true,
    });

    expect(prismaMock.role.update).toHaveBeenCalledWith({
      where: { id: "role-1" },
      data: { name: "Vorstand", description: "Leitung" },
    });
  });

  it("refuses a blank name", async () => {
    expect(await updateRole("role-1", "  ", null)).toEqual({
      error: "Bitte einen Rollennamen angeben.",
    });
    expect(prismaMock.role.update).not.toHaveBeenCalled();
  });

  it("turns a duplicate name into a speaking error", async () => {
    prismaMock.role.update.mockRejectedValue(uniqueConstraintError());

    expect(await updateRole("role-1", "Vorstand", null)).toEqual({
      error: "Eine Rolle mit dem Namen „Vorstand“ existiert bereits.",
    });
  });

  it("rethrows any other database error", async () => {
    prismaMock.role.update.mockRejectedValue(new Error("db down"));

    await expect(updateRole("role-1", "Vorstand", null)).rejects.toThrow(
      "db down",
    );
  });
});

describe("deleteRole", () => {
  it("deletes the role outright, relying on the FK cascade", async () => {
    expect(await deleteRole("role-1")).toEqual({ success: true });

    expect(prismaMock.role.delete).toHaveBeenCalledWith({
      where: { id: "role-1" },
    });
  });
});

describe("setRolePermissions", () => {
  it("sets the RolePermission rows to exactly the given list", async () => {
    prismaMock.rolePermission.findMany.mockResolvedValue([]);

    expect(await setRolePermissions("role-1", ["perm-a", "perm-b"])).toEqual({
      success: true,
    });

    expect(prismaMock.rolePermission.deleteMany).toHaveBeenCalledWith({
      where: {
        roleId: "role-1",
        permissionId: { notIn: ["perm-a", "perm-b"] },
      },
    });
    expect(prismaMock.rolePermission.upsert).toHaveBeenCalledWith({
      where: {
        roleId_permissionId: { roleId: "role-1", permissionId: "perm-a" },
      },
      create: { roleId: "role-1", permissionId: "perm-a" },
      update: {},
    });
    expect(prismaMock.rolePermission.upsert).toHaveBeenCalledWith({
      where: {
        roleId_permissionId: { roleId: "role-1", permissionId: "perm-b" },
      },
      create: { roleId: "role-1", permissionId: "perm-b" },
      update: {},
    });
  });

  it("clears all permissions for an empty list", async () => {
    prismaMock.rolePermission.findMany.mockResolvedValue([]);

    expect(await setRolePermissions("role-1", [])).toEqual({ success: true });

    expect(prismaMock.rolePermission.deleteMany).toHaveBeenCalledWith({
      where: { roleId: "role-1", permissionId: { notIn: [] } },
    });
  });

  it("refuses to change permissions on the role granting admin:access", async () => {
    prismaMock.rolePermission.findMany.mockResolvedValue([
      { permission: { key: "admin:access" } },
    ] as never);

    expect(await setRolePermissions("role-admin", ["perm-a"])).toEqual({
      error:
        "Diese Rolle gewährt Systemzugriff und behält deshalb immer alle Rechte — sie können nicht einzeln entzogen werden.",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("reorderRoles (#391)", () => {
  it("sets each role's sortOrder to its index in the given list", async () => {
    expect(await reorderRoles(["role-b", "role-a", "role-c"])).toEqual({
      success: true,
    });

    expect(prismaMock.role.update).toHaveBeenCalledWith({
      where: { id: "role-b" },
      data: { sortOrder: 0 },
    });
    expect(prismaMock.role.update).toHaveBeenCalledWith({
      where: { id: "role-a" },
      data: { sortOrder: 1 },
    });
    expect(prismaMock.role.update).toHaveBeenCalledWith({
      where: { id: "role-c" },
      data: { sortOrder: 2 },
    });
  });
});
