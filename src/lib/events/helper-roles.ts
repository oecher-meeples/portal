import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";

export type HelperRoleActionResult = { error: string } | { success: true };

const UNIQUE_CONSTRAINT_CODE = "P2002";

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_CONSTRAINT_CODE
  );
}

/**
 * Global, admin-definable helper role (ADR-0012) — replaces the former fixed
 * ShiftType enum. `grantsPermissionKey` is optional: when set, it applies
 * for the duration of an assigned shift booking of this role (generalized
 * in hasRoleGrantedPermission, shift-rights.ts).
 * Does not check permissions — that is the caller's job.
 */
export async function createHelperRole(
  name: string,
  grantsPermissionKey: string | null,
): Promise<HelperRoleActionResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: "Bitte einen Namen für die Rolle angeben." };
  }

  try {
    await prisma.helperRole.create({
      data: {
        name: trimmedName,
        grantsPermissionKey: grantsPermissionKey || null,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        error: `Eine Helferrolle mit dem Namen „${trimmedName}“ existiert bereits.`,
      };
    }
    throw error;
  }

  return { success: true };
}

/** Does not check permissions — that is the caller's job. */
export async function updateHelperRole(
  roleId: string,
  name: string,
  grantsPermissionKey: string | null,
): Promise<HelperRoleActionResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: "Bitte einen Namen für die Rolle angeben." };
  }

  try {
    await prisma.helperRole.update({
      where: { id: roleId },
      data: {
        name: trimmedName,
        grantsPermissionKey: grantsPermissionKey || null,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        error: `Eine Helferrolle mit dem Namen „${trimmedName}“ existiert bereits.`,
      };
    }
    throw error;
  }

  return { success: true };
}

/**
 * Refuses when shifts still reference this role — deleting it would either
 * cascade-delete unrelated shift data or leave a dangling FK, neither of
 * which is a safe default. Reassign or delete those shifts first.
 * Does not check permissions — that is the caller's job.
 */
export async function deleteHelperRole(
  roleId: string,
): Promise<HelperRoleActionResult> {
  const shiftCount = await prisma.shift.count({ where: { roleId } });
  if (shiftCount > 0) {
    return {
      error:
        "Diese Rolle wird noch von Schichten verwendet — erst diese Schichten entfernen oder umstellen.",
    };
  }

  await prisma.helperRole.delete({ where: { id: roleId } });
  return { success: true };
}
