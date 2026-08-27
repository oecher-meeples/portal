import { prisma } from "@/lib/utils/prisma";
import { hasPermission } from "@/lib/auth/permissions";

/**
 * Generalizes ADR-0006 (docs/adr/0006-schicht-buchung-statt-permission-fuer-event-rechte.md)
 * per ADR-0012 (docs/adr/0012-helferrolle-generalisiert-schicht-buchung-rechte.md):
 * a permission comes from either holding it durably (Role/RolePermission) or
 * currently sitting inside an assigned ShiftBooking time block for a
 * HelperRole whose `grantsPermissionKey` matches — never from a permission
 * tied to a hardcoded role name. Replaces the former hasFleaMarketRights,
 * which was hard-coupled to a "KASSE" shift type. Checks the booking's own
 * `startsAt`/`endsAt` block (#159) rather than the Shift's overall target
 * period, now that the Schichtplan-Editor gives each assignment its own,
 * individually resizable time block.
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
      shift: { role: { grantsPermissionKey: permissionKey } },
      startsAt: { lte: at },
      endsAt: { gte: at },
    },
  });

  return booking !== null;
}

/**
 * The currently-running (per `at`) event a meeple is inside an active
 * ShiftBooking for, matched by the HelperRole's name — used to gate pages
 * that aren't about a durable permission (like `hasRoleGrantedPermission`)
 * but about "is this person on duty for role X right now" (ADR-0006), e.g.
 * the Ausleihe/Rückgabe-Seite (#121). Returns `null` when no such booking
 * is currently active.
 */
export async function findActiveShiftEvent(
  meepleId: string,
  roleName: string,
  at: Date = new Date(),
): Promise<{ eventId: string } | null> {
  const booking = await prisma.shiftBooking.findFirst({
    where: {
      meepleId,
      shift: { role: { name: roleName } },
      startsAt: { lte: at },
      endsAt: { gte: at },
    },
    select: { shift: { select: { eventId: true } } },
  });

  return booking ? { eventId: booking.shift.eventId } : null;
}
