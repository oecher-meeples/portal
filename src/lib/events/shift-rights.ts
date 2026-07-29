import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

/**
 * Implements the ADR-0006 rule (docs/adr/0006-schicht-buchung-statt-permission-fuer-event-rechte.md):
 * flea market rights come from either the `events:manage` permission or an active
 * KASSE shift booking for this event, never from a dedicated permanent permission.
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
        type: "KASSE",
        startsAt: { lte: at },
        endsAt: { gte: at },
      },
    },
  });

  return booking !== null;
}
