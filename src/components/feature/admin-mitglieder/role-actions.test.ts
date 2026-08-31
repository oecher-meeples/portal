import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

// The role CRUD rules themselves live in the lib layer and are tested in
// src/lib/auth/roles.test.ts — here only the action wrappers matter.
const createRoleRecordMock = vi.fn();
const updateRoleRecordMock = vi.fn();
const deleteRoleRecordMock = vi.fn();
const setRolePermissionsRecordMock = vi.fn();
vi.mock("@/lib/auth/roles", () => ({
  createRole: (...args: unknown[]) => createRoleRecordMock(...args),
  updateRole: (...args: unknown[]) => updateRoleRecordMock(...args),
  deleteRole: (...args: unknown[]) => deleteRoleRecordMock(...args),
  setRolePermissions: (...args: unknown[]) =>
    setRolePermissionsRecordMock(...args),
}));

// The assignment rules themselves live in the lib layer and are tested in
// src/lib/auth/user-roles.test.ts — here only the action wrappers matter.
const assignMeepleRoleRecordMock = vi.fn();
const removeMeepleRoleRecordMock = vi.fn();
const listMeepleRoleAssignmentsMock = vi.fn();
vi.mock("@/lib/auth/user-roles", () => ({
  assignMeepleRole: (...args: unknown[]) => assignMeepleRoleRecordMock(...args),
  removeMeepleRole: (...args: unknown[]) => removeMeepleRoleRecordMock(...args),
  listMeepleRoleAssignments: (...args: unknown[]) =>
    listMeepleRoleAssignmentsMock(...args),
}));

const {
  assignMeepleRole,
  createRole,
  deleteRole,
  removeMeepleRole,
  setRolePermissions,
  updateRole,
} = await import("./actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  requirePermissionMock.mockResolvedValue({ id: "admin-user" });
  createRoleRecordMock.mockReset().mockResolvedValue({ success: true });
  updateRoleRecordMock.mockReset().mockResolvedValue({ success: true });
  deleteRoleRecordMock.mockReset().mockResolvedValue({ success: true });
  setRolePermissionsRecordMock.mockReset().mockResolvedValue({
    success: true,
  });
  assignMeepleRoleRecordMock.mockReset().mockResolvedValue({ success: true });
  removeMeepleRoleRecordMock.mockReset().mockResolvedValue({ success: true });
  listMeepleRoleAssignmentsMock.mockReset().mockResolvedValue([]);
  prismaMock.role.findUniqueOrThrow.mockResolvedValue({
    isSystemRole: false,
  } as never);
  prismaMock.userRole.findUniqueOrThrow.mockResolvedValue({
    role: { isSystemRole: false },
  } as never);
});

describe("assignMeepleRole", () => {
  it("delegates to the shared assignment rules and revalidates on success", async () => {
    expect(await assignMeepleRole("meeple-1", "role-admin")).toEqual({
      success: true,
    });
    expect(assignMeepleRoleRecordMock).toHaveBeenCalledWith(
      "meeple-1",
      "role-admin",
      undefined,
    );
  });

  it("passes a rule violation straight back without revalidating", async () => {
    assignMeepleRoleRecordMock.mockResolvedValue({
      error: "Dieses Mitglied hat kein Login-Konto.",
    });

    expect(await assignMeepleRole("meeple-1", "role-admin")).toEqual({
      error: "Dieses Mitglied hat kein Login-Konto.",
    });
  });

  it("requires admin:access instead of members:manage when a time window is given", async () => {
    await assignMeepleRole("meeple-1", "role-vorstand", {
      startsAt: new Date("2026-01-01"),
      endsAt: new Date("2027-01-01"),
    });

    expect(requirePermissionMock).toHaveBeenCalledWith("admin:access");
  });

  it("requires members:manage for a plain assignment (no window)", async () => {
    await assignMeepleRole("meeple-1", "role-vorstand");

    expect(requirePermissionMock).toHaveBeenCalledWith("members:manage");
  });

  it("requires admin:access for a Systemrolle even without a window (#353)", async () => {
    prismaMock.role.findUniqueOrThrow.mockResolvedValue({
      isSystemRole: true,
    } as never);

    await assignMeepleRole("meeple-1", "role-ausgetreten");

    expect(requirePermissionMock).toHaveBeenCalledWith("members:manage");
    expect(requirePermissionMock).toHaveBeenCalledWith("admin:access");
  });

  it("checks members:manage before reading the role, so a caller without any permission never triggers the DB read", async () => {
    requirePermissionMock.mockRejectedValueOnce(new ForbiddenError("/403"));

    await expect(assignMeepleRole("meeple-1", "role-vorstand")).rejects.toThrow(
      ForbiddenError,
    );
    expect(prismaMock.role.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});

describe("removeMeepleRole", () => {
  it("delegates to the shared rules and revalidates on success", async () => {
    expect(await removeMeepleRole("user-role-1")).toEqual({ success: true });
    expect(removeMeepleRoleRecordMock).toHaveBeenCalledWith(
      "user-role-1",
      "admin-user",
    );
  });

  it("passes a rule violation straight back", async () => {
    removeMeepleRoleRecordMock.mockResolvedValue({
      error: "Rollenzuweisung nicht gefunden.",
    });

    expect(await removeMeepleRole("user-role-1")).toEqual({
      error: "Rollenzuweisung nicht gefunden.",
    });
  });

  it("requires admin:access to remove a Systemrolle assignment (#353)", async () => {
    prismaMock.userRole.findUniqueOrThrow.mockResolvedValue({
      role: { isSystemRole: true },
    } as never);

    await removeMeepleRole("user-role-1");

    expect(requirePermissionMock).toHaveBeenCalledWith("members:manage");
    expect(requirePermissionMock).toHaveBeenCalledWith("admin:access");
  });
});

describe("createRole", () => {
  it("delegates to the shared role rules and revalidates on success", async () => {
    expect(await createRole("Vorstand", "Leitung")).toEqual({
      success: true,
    });
    expect(createRoleRecordMock).toHaveBeenCalledWith("Vorstand", "Leitung");
  });

  it("passes a rule violation straight back", async () => {
    createRoleRecordMock.mockResolvedValue({
      error: "Eine Rolle mit dem Namen „Vorstand“ existiert bereits.",
    });

    expect(await createRole("Vorstand", null)).toEqual({
      error: "Eine Rolle mit dem Namen „Vorstand“ existiert bereits.",
    });
  });

  it("requires roles:manage, not just members:manage (#365)", async () => {
    requirePermissionMock.mockClear();

    await createRole("Vorstand", "Leitung");

    expect(requirePermissionMock).toHaveBeenCalledWith("roles:manage");
    expect(requirePermissionMock).not.toHaveBeenCalledWith("members:manage");
  });
});

describe("updateRole", () => {
  it("delegates to the shared role rules and revalidates on success", async () => {
    expect(await updateRole("role-1", "Vorstand", "Leitung")).toEqual({
      success: true,
    });
    expect(updateRoleRecordMock).toHaveBeenCalledWith(
      "role-1",
      "Vorstand",
      "Leitung",
    );
  });

  it("passes a rule violation straight back", async () => {
    updateRoleRecordMock.mockResolvedValue({
      error: "Eine Rolle mit dem Namen „Vorstand“ existiert bereits.",
    });

    expect(await updateRole("role-1", "Vorstand", null)).toEqual({
      error: "Eine Rolle mit dem Namen „Vorstand“ existiert bereits.",
    });
  });
});

describe("deleteRole", () => {
  it("delegates to the shared role rules and revalidates on success", async () => {
    expect(await deleteRole("role-1")).toEqual({ success: true });
    expect(deleteRoleRecordMock).toHaveBeenCalledWith("role-1");
  });
});

describe("setRolePermissions", () => {
  it("delegates to the shared role rules and revalidates on success", async () => {
    expect(await setRolePermissions("role-1", ["perm-a"])).toEqual({
      success: true,
    });
    expect(setRolePermissionsRecordMock).toHaveBeenCalledWith("role-1", [
      "perm-a",
    ]);
  });

  it("passes a rule violation straight back (e.g. the system-admin role)", async () => {
    setRolePermissionsRecordMock.mockResolvedValue({
      error:
        "Diese Rolle gewährt Systemzugriff und behält deshalb immer alle Rechte — sie können nicht einzeln entzogen werden.",
    });

    expect(await setRolePermissions("role-admin", [])).toEqual({
      error:
        "Diese Rolle gewährt Systemzugriff und behält deshalb immer alle Rechte — sie können nicht einzeln entzogen werden.",
    });
  });
});
