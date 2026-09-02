import { prisma } from "@/lib/utils/prisma";
import { formatTimePlain } from "@/lib/utils/format";

export type ShiftBookingAssignmentResult =
  { error: string } | { success: true };

/**
 * Assigns (`bookingId` omitted, fresh drop from the pool) or re-times
 * (`bookingId` given, resize in #160) one meeple's individual time block on
 * a Shift in the Schichtplan-Editor (#159). A meeple may hold several
 * bookings on the same Shift — e.g. a break handled by the same person
 * twice — as long as their own time blocks never overlap. Two hard
 * validations, both from the issue's AC:
 * - the block must fall entirely within the meeple's reported
 *   HelperAvailability for that day, for a role it actually chose;
 * - the block must not overlap any other ShiftBooking of the same person,
 *   on any shift or day (a person cannot be in two places at once).
 * Does not check permissions — that is the caller's job.
 */
export async function assignShiftBooking({
  shiftId,
  meepleId,
  startsAt,
  endsAt,
  bookingId,
  slotIndex,
}: {
  shiftId: string;
  meepleId: string;
  startsAt: Date;
  endsAt: Date;
  /** Re-times this exact booking instead of creating a new one — used by
   * the resize handles on an already-assigned block. */
  bookingId?: string;
  /** Rein optische Spaltenposition innerhalb der Rollen-Spaltengruppe, per
   * Drag gesetzt (#Schichtplan-Grid-Spaltenwechsel) — undefined lässt einen
   * bestehenden Wert unangetastet, statt ihn zu löschen. */
  slotIndex?: number;
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
    // Nennt die tatsächlichen Grenzen — sonst wirkt die Ablehnung
    // unerklärlich, wenn die Schicht selbst länger läuft als das, was diese
    // Person gemeldet hat (Bugreport: Schicht bis 19 Uhr, Person nur bis
    // 17:45 verfügbar).
    return {
      error: `Der Zeitblock liegt außerhalb der gemeldeten Verfügbarkeit (${formatTimePlain(availability.startsAt)}–${formatTimePlain(availability.endsAt)}).`,
    };
  }

  const overlapping = await prisma.shiftBooking.findFirst({
    where: {
      meepleId,
      ...(bookingId ? { id: { not: bookingId } } : {}),
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

  if (bookingId) {
    // Re-times an existing block — `confirmedAt` bleibt unangetastet, ein
    // Resize soll eine bereits erteilte Bestätigung nicht stillschweigend
    // widerrufen.
    await prisma.shiftBooking.update({
      where: { id: bookingId },
      data: { startsAt, endsAt, ...(slotIndex !== undefined && { slotIndex }) },
    });
  } else {
    await prisma.shiftBooking.create({
      data: {
        shiftId,
        meepleId,
        startsAt,
        endsAt,
        ...(slotIndex !== undefined && { slotIndex }),
      },
    });
  }

  return { success: true };
}

/** Removes one specific booking (#161 Unassign) — targets the exact block,
 * since a meeple may hold several on the same Shift. Does not check
 * permissions — that is the caller's job. */
export async function unassignShiftBooking(
  bookingId: string,
): Promise<ShiftBookingAssignmentResult> {
  await prisma.shiftBooking.deleteMany({ where: { id: bookingId } });
  return { success: true };
}
