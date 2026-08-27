import { prisma } from "@/lib/utils/prisma";

export type ShiftBookingAssignmentResult =
  { error: string } | { success: true };

/**
 * Assigns (or, reused by resize in #160, re-times) one meeple's individual
 * time block on a Shift in the Schichtplan-Editor (#159). Two hard
 * validations, both from the issue's AC:
 * - the block must fall entirely within the meeple's reported
 *   HelperAvailability for that day, for a role it actually chose;
 * - the block must not overlap any other ShiftBooking of the same person,
 *   on any day (a person cannot be in two places at once).
 * Does not check permissions — that is the caller's job.
 */
export async function assignShiftBooking({
  shiftId,
  meepleId,
  startsAt,
  endsAt,
}: {
  shiftId: string;
  meepleId: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<ShiftBookingAssignmentResult> {
  if (endsAt <= startsAt) {
    return { error: "Das Ende muss nach dem Beginn liegen." };
  }

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) {
    return { error: "Schicht nicht gefunden." };
  }

  const availability = await prisma.helperAvailability.findUnique({
    where: { meepleId_dayId: { meepleId, dayId: shift.dayId } },
    include: { roles: { select: { roleId: true } } },
  });
  if (
    !availability ||
    !availability.roles.some((role) => role.roleId === shift.roleId)
  ) {
    return {
      error:
        "Dieses Meeple hat sich für diese Rolle an diesem Tag nicht als verfügbar gemeldet.",
    };
  }
  if (availability.startsAt > startsAt || availability.endsAt < endsAt) {
    return {
      error: "Der Zeitblock liegt außerhalb der gemeldeten Verfügbarkeit.",
    };
  }

  const overlapping = await prisma.shiftBooking.findFirst({
    where: {
      meepleId,
      shiftId: { not: shiftId },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  if (overlapping) {
    return {
      error:
        "Überschneidet sich zeitlich mit einer anderen Zuweisung dieser Person.",
    };
  }

  await prisma.shiftBooking.upsert({
    where: { shiftId_meepleId: { shiftId, meepleId } },
    create: { shiftId, meepleId, startsAt, endsAt, uncertain: false },
    update: { startsAt, endsAt },
  });

  return { success: true };
}

/** Removes one meeple's assignment on a Shift (#161 Unassign). Does not
 * check permissions — that is the caller's job. */
export async function unassignShiftBooking(
  shiftId: string,
  meepleId: string,
): Promise<ShiftBookingAssignmentResult> {
  await prisma.shiftBooking.deleteMany({ where: { shiftId, meepleId } });
  return { success: true };
}
