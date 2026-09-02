import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";

export type RoleActionResult = { error: string } | { success: true };

const UNIQUE_CONSTRAINT_CODE = "P2002";

/**
 * Die Rolle, die aktuell "admin:access" gewährt, ist der Systemzugriff
 * (siehe src/lib/auth/session.ts) — sie darf nie weniger als alle Rechte
 * haben, sonst droht wieder ein stiller Lockout wie im ursprünglichen Bug
 * (#219-Review: Umbenennen der Rolle hat den Zugriff entzogen). Identifiziert
 * über die Permission, nicht über den Rollennamen — der bleibt frei änderbar.
 */
const ADMIN_ACCESS_PERMISSION_KEY = "admin:access";

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_CONSTRAINT_CODE
  );
}

/** Does not check permissions — that is the caller's job. */
export async function createRole(
  name: string,
  description: string | null,
): Promise<RoleActionResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: "Bitte einen Rollennamen angeben." };
  }

  try {
    const { _max } = await prisma.role.aggregate({ _max: { sortOrder: true } });
    await prisma.role.create({
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        sortOrder: (_max.sortOrder ?? -1) + 1,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        error: `Eine Rolle mit dem Namen „${trimmedName}“ existiert bereits.`,
      };
    }
    throw error;
  }

  return { success: true };
}

/** Does not check permissions — that is the caller's job. */
export async function updateRole(
  roleId: string,
  name: string,
  description: string | null,
): Promise<RoleActionResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: "Bitte einen Rollennamen angeben." };
  }

  try {
    await prisma.role.update({
      where: { id: roleId },
      data: { name: trimmedName, description: description?.trim() || null },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        error: `Eine Rolle mit dem Namen „${trimmedName}“ existiert bereits.`,
      };
    }
    throw error;
  }

  return { success: true };
}

/**
 * Deletes the role outright — cascades to its RolePermission and UserRole
 * rows via the FK (prisma/schema.prisma), so members holding this role end
 * up without one rather than being reassigned to a replacement.
 * Does not check permissions — that is the caller's job.
 */
export async function deleteRole(roleId: string): Promise<RoleActionResult> {
  await prisma.role.delete({ where: { id: roleId } });
  return { success: true };
}

/**
 * Sets a role's permissions to exactly the given list — removes any
 * RolePermission rows not in `permissionIds` and adds the missing ones.
 * An empty list clears all permissions from the role. Refuses outright for
 * the role that currently grants "admin:access" (see
 * ADMIN_ACCESS_PERMISSION_KEY) — that one always keeps all rights.
 * Does not check permissions — that is the caller's job.
 */
export async function setRolePermissions(
  roleId: string,
  permissionIds: string[],
): Promise<RoleActionResult> {
  const currentPermissions = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });
  const isSystemAdminRole = currentPermissions.some(
    (entry) => entry.permission.key === ADMIN_ACCESS_PERMISSION_KEY,
  );
  if (isSystemAdminRole) {
    return {
      error:
        "Diese Rolle gewährt Systemzugriff und behält deshalb immer alle Rechte — sie können nicht einzeln entzogen werden.",
    };
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({
      where: { roleId, permissionId: { notIn: permissionIds } },
    }),
    ...permissionIds.map((permissionId) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        create: { roleId, permissionId },
        update: {},
      }),
    ),
  ]);

  return { success: true };
}

/**
 * Persists a new canonical role order (#391) — `roleIds` is the complete,
 * already-reordered list (drag target position decided client-side), each
 * entry's index becomes its `sortOrder`. Not a partial move: the caller
 * (Drag-and-Drop-Handler in role-management-section.tsx) always sends every
 * role id. Does not check permissions — that is the caller's job.
 */
export async function reorderRoles(
  roleIds: string[],
): Promise<RoleActionResult> {
  await prisma.$transaction(
    roleIds.map((roleId, sortOrder) =>
      prisma.role.update({ where: { id: roleId }, data: { sortOrder } }),
    ),
  );

  return { success: true };
}
