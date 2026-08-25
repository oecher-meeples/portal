import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";

export type RoleActionResult = { error: string } | { success: true };

const UNIQUE_CONSTRAINT_CODE = "P2002";

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
    await prisma.role.create({
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
 * An empty list clears all permissions from the role.
 * Does not check permissions — that is the caller's job.
 */
export async function setRolePermissions(
  roleId: string,
  permissionIds: string[],
): Promise<RoleActionResult> {
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
