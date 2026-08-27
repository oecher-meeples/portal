import { prisma } from "@/lib/utils/prisma";
import { hasPermission } from "@/lib/auth/permissions";

/**
 * Implements the ADR-0006 rule (docs/adr/0006-schicht-buchung-statt-permission-fuer-event-rechte.md):
 * flea market rights come from either the `events:manage` permission or an active
 * "Kasse" shift booking for this event, never from a dedicated permanent permission.
 * Still matches by the (now admin-renamable) HelperRole name — #154 replaces this
 * with the generic hasRoleGrantedPermission(meepleId, permissionKey, at) that reads
 * HelperRole.grantsPermissionKey (ADR-0012) instead.
 */
export async function hasFleaMarketRights(
  meepleId: string,
  eventId: string,
  at: Date = new Date(),
) {
  const meeple = await prisma.meeple.findUnique({
    where: { id: meepleId },
    select: { neonAuthUserId: true },
  });

  if (meeple?.neonAuthUserId) {
    const allowed = await hasPermission(meeple.neonAuthUserId, "events:manage");
    if (allowed) {
      return true;
    }
  }

  const booking = await prisma.shiftBooking.findFirst({
    where: {
      meepleId,
      shift: {
        eventId,
        role: { name: "Kasse" },
        startsAt: { lte: at },
        endsAt: { gte: at },
      },
    },
  });

  return booking !== null;
}
