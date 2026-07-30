"use server";

import type { ShiftType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";

export type ShiftInput = {
  type: ShiftType;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
};

function validateShiftInput(input: ShiftInput) {
  if (!input.startsAt || !input.endsAt) {
    return "Bitte Start- und End-Zeitpunkt angeben.";
  }
  if (input.endsAt <= input.startsAt) {
    return "Das Ende muss nach dem Start liegen.";
  }
  if (!Number.isInteger(input.capacity) || input.capacity < 1) {
    return "Die Kapazität muss mindestens 1 sein.";
  }
  return null;
}

export async function createShift(eventId: string, input: ShiftInput) {
  await requirePermission("events:manage");

  const validationError = validateShiftInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const shift = await prisma.shift.create({
    data: {
      eventId,
      type: input.type,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      capacity: input.capacity,
    },
  });

  revalidatePath(`/admin/events/${eventId}`);
  return { success: true as const, id: shift.id };
}

export async function updateShift(shiftId: string, input: ShiftInput) {
  await requirePermission("events:manage");

  const validationError = validateShiftInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const shift = await prisma.shift.update({
    where: { id: shiftId },
    data: {
      type: input.type,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      capacity: input.capacity,
    },
  });

  revalidatePath(`/admin/events/${shift.eventId}`);
  return { success: true as const };
}

export async function deleteShift(shiftId: string) {
  await requirePermission("events:manage");

  const bookingCount = await prisma.shiftBooking.count({
    where: { shiftId },
  });

  if (bookingCount > 0) {
    return {
      error: "Diese Schicht hat bereits Buchungen — erst diese entfernen.",
    };
  }

  const shift = await prisma.shift.delete({ where: { id: shiftId } });

  revalidatePath(`/admin/events/${shift.eventId}`);
  return { success: true as const };
}
