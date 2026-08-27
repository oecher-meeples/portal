import { prisma } from "@/lib/utils/prisma";
import { hasPermission } from "@/lib/auth/permissions";

/**
 * Generalizes ADR-0006 (docs/adr/0006-schicht-buchung-statt-permission-fuer-event-rechte.md)
 * per ADR-0012 (docs/adr/0012-helferrolle-generalisiert-schicht-buchung-rechte.md):
 * a permission comes from either holding it durably (Role/RolePermission) or
 * currently sitting inside an assigned ShiftBooking time block for a
 * HelperRole whose `grantsPermissionKey` matches — never from a permission
 * tied to a hardcoded role name. Replaces the former hasFleaMarketRights,
 * which was hard-coupled to a "KASSE" shift type.
 */
export async function hasRoleGrantedPermission(
  meepleId: string,
  permissionKey: string,
  at: Date = new Date(),
) {
  const meeple = await prisma.meeple.findUnique({
    where: { id: meepleId },
    select: { neonAuthUserId: true },
  });

  if (meeple?.neonAuthUserId) {
    const allowed = await hasPermission(meeple.neonAuthUserId, permissionKey);
    if (allowed) {
      return true;
    }
  }

  const booking = await prisma.shiftBooking.findFirst({
    where: {
      meepleId,
      shift: {
        role: { grantsPermissionKey: permissionKey },
        startsAt: { lte: at },
        endsAt: { gte: at },
      },
    },
  });

  return booking !== null;
}
