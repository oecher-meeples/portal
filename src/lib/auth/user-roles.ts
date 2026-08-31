import { prisma } from "@/lib/utils/prisma";

export type UserRoleActionResult = { error: string } | { success: true };

export type MeepleRoleAssignment = {
  id: string;
  roleId: string;
  roleName: string;
  startsAt: string;
  endsAt: string | null;
};

/** Der seed-erzeugte Fallback-Admin-Account (prisma/seed.ts) — bleibt immer
 * erreichbar, damit ein verpatzter Rollen-Umbau nie alle Admins aussperrt. */
const PROTECTED_ADMIN_DISPLAY_NAME = "Admin";

/**
 * All role assignments a Meeple has ever held (active and expired) — the
 * audit/history view (#264) shows both, only active ones grant permissions
 * (see `hasPermission`/`getUserPermissionKeys` in permissions.ts).
 */
export async function listMeepleRoleAssignments(
  neonAuthUserId: string,
): Promise<MeepleRoleAssignment[]> {
  const rows = await prisma.userRole.findMany({
    where: { neonAuthUserId },
    include: { role: { select: { name: true } } },
    // #391: kanonische Rollen-Reihenfolge statt Zuweisungsdatum, damit
    // dieselbe Rollenkombination überall gleich sortiert erscheint.
    orderBy: { role: { sortOrder: "asc" } },
  });
  return rows.map((row) => ({
    id: row.id,
    roleId: row.roleId,
    roleName: row.role.name,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
  }));
}

/**
 * Grants a Meeple an additional role — a Meeple can hold several roles at
 * once (#335), e.g. "Vorstand" and later also "Ausgetreten" (#332). A plain
 * assignment (no explicit window) starts now and never ends; an explicit
 * window (a term of office, #264) is the caller's job to gate on
 * `admin:access` — this function itself does not check permissions.
 */
export async function assignMeepleRole(
  meepleId: string,
  roleId: string,
  window?: { startsAt: Date; endsAt: Date | null },
): Promise<UserRoleActionResult> {
  const [meeple, role] = await Promise.all([
    prisma.meeple.findUniqueOrThrow({ where: { id: meepleId } }),
    prisma.role.findUniqueOrThrow({ where: { id: roleId } }),
  ]);

  if (meeple.displayName === PROTECTED_ADMIN_DISPLAY_NAME) {
    return {
      error: `Die Rollen des Benutzers „${PROTECTED_ADMIN_DISPLAY_NAME}“ sind geschützt und können nicht geändert werden.`,
    };
  }
  if (!meeple.neonAuthUserId) {
    return { error: "Dieses Mitglied hat kein Login-Konto." };
  }

  const startsAt = window?.startsAt ?? new Date();
  const endsAt = window?.endsAt ?? null;

  await prisma.userRole.create({
    data: {
      neonAuthUserId: meeple.neonAuthUserId,
      roleId: role.id,
      startsAt,
      endsAt,
    },
  });

  return { success: true };
}

const ADMIN_ACCESS_PERMISSION_KEY = "admin:access";

/** True if the given active-assignment window is currently active. */
function isActiveWindow(endsAt: Date | null, now: Date): boolean {
  return !endsAt || endsAt > now;
}

/** Does this neonAuthUserId hold an active admin:access grant through any
 * assignment other than `excludingUserRoleId` (#354)? */
async function hasOtherActiveAdminAccess(
  neonAuthUserId: string,
  excludingUserRoleId: string,
  now: Date,
): Promise<boolean> {
  const assignments = await prisma.userRole.findMany({
    where: { neonAuthUserId, id: { not: excludingUserRoleId } },
    select: {
      endsAt: true,
      role: {
        select: {
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  });
  return assignments.some(
    (a) =>
      isActiveWindow(a.endsAt, now) &&
      a.role.permissions.some(
        (p) => p.permission.key === ADMIN_ACCESS_PERMISSION_KEY,
      ),
  );
}

/**
 * Ends a role assignment now rather than deleting it — an expired
 * assignment stays visible in the audit/history view (#264), it just no
 * longer counts as active. Does not check permissions — that is the
 * caller's job.
 *
 * `actorNeonAuthUserId` is used only for the self-lockout guard (#354): an
 * actor may not remove their own currently-active admin:access-granting
 * assignment if it would leave them with no other active admin:access
 * grant. Other admins may still remove each other's admin:access freely —
 * only self-removal of the *last* one is blocked.
 */
export async function removeMeepleRole(
  userRoleId: string,
  actorNeonAuthUserId: string,
): Promise<UserRoleActionResult> {
  const assignment = await prisma.userRole.findUnique({
    where: { id: userRoleId },
    include: {
      role: {
        select: {
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  });
  if (!assignment) {
    return { error: "Rollenzuweisung nicht gefunden." };
  }

  const now = new Date();
  const isActive = isActiveWindow(assignment.endsAt, now);
  const grantsAdminAccess = assignment.role.permissions.some(
    (p) => p.permission.key === ADMIN_ACCESS_PERMISSION_KEY,
  );

  if (
    isActive &&
    grantsAdminAccess &&
    assignment.neonAuthUserId === actorNeonAuthUserId &&
    !(await hasOtherActiveAdminAccess(actorNeonAuthUserId, userRoleId, now))
  ) {
    return {
      error:
        "Du kannst dir deine letzte aktive admin:access-Rollenzuweisung nicht selbst entziehen.",
    };
  }

  if (isActive) {
    await prisma.userRole.update({
      where: { id: userRoleId },
      data: { endsAt: now },
    });
  }

  return { success: true };
}
