"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";

export type ShiftInput = {
  roleId: string;
  dayId: string;
  targetStartsAt: Date;
  targetEndsAt: Date;
  capacity: number;
};

function validateShiftInput(input: ShiftInput) {
  if (!input.targetStartsAt || !input.targetEndsAt) {
    return "Bitte Beginn und Ende des Ziel-Zeitraums angeben.";
  }
  if (input.targetEndsAt <= input.targetStartsAt) {
    return "Das Ende muss nach dem Beginn liegen.";
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
      dayId: input.dayId,
      roleId: input.roleId,
      targetStartsAt: input.targetStartsAt,
      targetEndsAt: input.targetEndsAt,
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
      dayId: input.dayId,
      roleId: input.roleId,
      targetStartsAt: input.targetStartsAt,
      targetEndsAt: input.targetEndsAt,
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
