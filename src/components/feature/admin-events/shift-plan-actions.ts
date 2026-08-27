"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";
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
  meepleId: string,
  startsAt: Date,
  endsAt: Date,
  /** Re-times this exact booking (Resize) statt eine neue anzulegen. */
  bookingId?: string,
) {
  await requirePermission("events:manage");

  const result = await assignShiftBooking({
    shiftId,
    meepleId,
    startsAt,
    endsAt,
    bookingId,
  });
  if ("success" in result) await revalidateEventPath(shiftId);
  return result;
}

export async function unassignHelperFromShift(
  bookingId: string,
  shiftId: string,
) {
  await requirePermission("events:manage");

  const result = await unassignShiftBooking(bookingId);
  if ("success" in result) await revalidateEventPath(shiftId);
  return result;
}
