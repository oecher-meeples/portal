"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMeeple } from "@/lib/meeples";
import { computeShiftFillLevel } from "@/lib/events/shift-capacity";

export async function bookShift(shiftId: string, uncertain: boolean) {
  const meeple = await requireMeeple();

  const [shift, existingBooking] = await Promise.all([
    prisma.shift.findUnique({
      where: { id: shiftId },
      include: { bookings: { select: { uncertain: true } } },
    }),
    prisma.shiftBooking.findUnique({
      where: { shiftId_meepleId: { shiftId, meepleId: meeple.id } },
    }),
  ]);

  if (!shift) {
    return { error: "Schicht nicht gefunden." };
  }
  if (existingBooking) {
    return { error: "Du bist bereits für diese Schicht eingetragen." };
  }
  if (computeShiftFillLevel(shift, shift.bookings).isFull) {
    return { error: "Diese Schicht ist bereits voll." };
  }

  await prisma.shiftBooking.create({
    data: { shiftId, meepleId: meeple.id, uncertain },
  });

  revalidatePath("/helfer");
  return { success: true as const };
}

export async function updateBookingCertainty(shiftId: string, uncertain: boolean) {
  const meeple = await requireMeeple();

  const updated = await prisma.shiftBooking.updateMany({
    where: { shiftId, meepleId: meeple.id },
    data: { uncertain },
  });

  if (updated.count === 0) {
    return { error: "Keine eigene Buchung für diese Schicht gefunden." };
  }

  revalidatePath("/helfer");
  return { success: true as const };
}

export async function cancelBooking(shiftId: string) {
  const meeple = await requireMeeple();

  await prisma.shiftBooking.deleteMany({
    where: { shiftId, meepleId: meeple.id },
  });

  revalidatePath("/helfer");
  return { success: true as const };
}
