"use server";

import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/lib/auth/action-guards";
import { prisma } from "@/lib/utils/prisma";
import {
  assignShiftBooking,
  unassignShiftBooking,
} from "@/lib/events/shift-booking-assignment";

async function revalidateEventPath(shiftId: string) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { eventId: true },
  });
  if (shift) revalidatePath(`/admin/events/${shift.eventId}`);
}

export async function assignHelperToShift(
  shiftId: string,
  helperId: string,
  isGuest: boolean,
  startsAt: Date,
  endsAt: Date,
  /** Re-times this exact booking (Resize/Move) statt eine neue anzulegen. */
  bookingId?: string,
  /** Rein optische Spaltenposition (Drag innerhalb der Rollen-Spaltengruppe). */
  slotIndex?: number,
) {
  await requireActionPermission("events:manage");

  const result = await assignShiftBooking({
    shiftId,
    helperId,
    isGuest,
    startsAt,
    endsAt,
    bookingId,
    slotIndex,
  });
  if ("success" in result) await revalidateEventPath(shiftId);
  return result;
}

export async function unassignHelperFromShift(
  bookingId: string,
  shiftId: string,
) {
  await requireActionPermission("events:manage");

  const result = await unassignShiftBooking(bookingId);
  if ("success" in result) await revalidateEventPath(shiftId);
  return result;
}
