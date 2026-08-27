import { prisma } from "@/lib/utils/prisma";

export type HelperAvailabilityActionResult =
  { error: string } | { success: true };

/**
 * A Meeple's offer to help on one Event-Tag (#156) — window plus the roles
 * it would take, distinct from the admin-side ShiftBooking time-block
 * assignment (Schichtplan-Editor, #157 ff.). One row per (meeple, day):
 * resubmitting replaces the previous offer instead of adding a second one.
 * Does not check permissions — that is the caller's job.
 */
export async function setHelperAvailability({
  meepleId,
  dayId,
  startsAt,
  endsAt,
  roleIds,
}: {
  meepleId: string;
  dayId: string;
  startsAt: Date;
  endsAt: Date;
  roleIds: string[];
}): Promise<HelperAvailabilityActionResult> {
  if (!startsAt || !endsAt) {
    return { error: "Bitte Beginn und Ende der Verfügbarkeit angeben." };
  }
  if (endsAt <= startsAt) {
    return { error: "Das Ende muss nach dem Beginn liegen." };
  }
  if (roleIds.length === 0) {
    return { error: "Bitte mindestens eine Rolle auswählen." };
  }

  const day = await prisma.eventDay.findUnique({
    where: { id: dayId },
    select: { event: { select: { visibility: true, helpersWanted: true } } },
  });
  if (!day) {
    return { error: "Tag nicht gefunden." };
  }
  // Entwurf ist normalerweise nur für events:manage sichtbar — "Helfer
  // suchen" ist die bewusste Ausnahme, die Helferplanung schon vor der
  // eigentlichen Freigabe öffnet (siehe findUpcomingEventsVisibleToMembers).
  if (day.event.visibility === "DRAFT" && !day.event.helpersWanted) {
    return {
      error: "Für dieses Event ist die Helferplanung noch nicht freigegeben.",
    };
  }

  await prisma.helperAvailability.upsert({
    where: { meepleId_dayId: { meepleId, dayId } },
    create: {
      meepleId,
      dayId,
      startsAt,
      endsAt,
      roles: { create: roleIds.map((roleId) => ({ roleId })) },
    },
    update: {
      startsAt,
      endsAt,
      roles: {
        deleteMany: {},
        create: roleIds.map((roleId) => ({ roleId })),
      },
    },
  });

  return { success: true };
}

/** Does not check permissions — that is the caller's job. */
export async function clearHelperAvailability(
  meepleId: string,
  dayId: string,
): Promise<HelperAvailabilityActionResult> {
  await prisma.helperAvailability.deleteMany({ where: { meepleId, dayId } });
  return { success: true };
}
