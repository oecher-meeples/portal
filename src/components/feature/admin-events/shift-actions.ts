"use server";

import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/lib/auth/action-guards";
import { prisma } from "@/lib/utils/prisma";

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
  if (!Number.isInteger(input.capacity) || input.capacity < 0) {
    return "Die Kapazität muss mindestens 1 sein.";
  }
  return null;
}

/** Listen-Rollen (`hasShifts = false`, #697) haben immer `capacity = 0`
 * (unbegrenzt), alle anderen mindestens 1. */
async function resolveCapacity(
  roleId: string,
  capacity: number,
): Promise<{ capacity: number } | { error: string }> {
  const role = await prisma.helperRole.findUnique({
    where: { id: roleId },
    select: { hasShifts: true },
  });
  if (role && !role.hasShifts) return { capacity: 0 };
  if (capacity < 1) return { error: "Die Kapazität muss mindestens 1 sein." };
  return { capacity };
}

export async function createShift(eventId: string, input: ShiftInput) {
  await requireActionPermission("events:manage");

  const validationError = validateShiftInput(input);
  if (validationError) {
    return { error: validationError };
  }
  const resolved = await resolveCapacity(input.roleId, input.capacity);
  if ("error" in resolved) return resolved;

  const shift = await prisma.shift.create({
    data: {
      eventId,
      dayId: input.dayId,
      roleId: input.roleId,
      targetStartsAt: input.targetStartsAt,
      targetEndsAt: input.targetEndsAt,
      capacity: resolved.capacity,
    },
  });

  revalidatePath(`/admin/events/${eventId}`);
  return { success: true as const, id: shift.id };
}

export async function updateShift(shiftId: string, input: ShiftInput) {
  await requireActionPermission("events:manage");

  const validationError = validateShiftInput(input);
  if (validationError) {
    return { error: validationError };
  }
  const resolved = await resolveCapacity(input.roleId, input.capacity);
  if ("error" in resolved) return resolved;

  const shift = await prisma.shift.update({
    where: { id: shiftId },
    data: {
      dayId: input.dayId,
      roleId: input.roleId,
      targetStartsAt: input.targetStartsAt,
      targetEndsAt: input.targetEndsAt,
      capacity: resolved.capacity,
    },
  });

  revalidatePath(`/admin/events/${shift.eventId}`);
  return { success: true as const };
}

/** Löscht die Schicht mitsamt ihren Zuweisungen — `ShiftBooking.shiftId` hat
 * `onDelete: Cascade`, ein vorheriger Block "erst Buchungen entfernen" hatte
 * Löschen belegter Schichten faktisch unmöglich gemacht (Bugreport). Die
 * Bestätigungsabfrage vor dem Klick ist die einzige Absicherung. */
export async function deleteShift(shiftId: string) {
  await requireActionPermission("events:manage");

  const shift = await prisma.shift.delete({ where: { id: shiftId } });

  revalidatePath(`/admin/events/${shift.eventId}`);
  return { success: true as const };
}

/** Tag×Rolle-Matrix (#693): legt die per Häkchen neu gewählten Schichten an
 * und löscht die abgewählten (samt Zuweisungen, wie `deleteShift`) in einer
 * Transaktion. Die Zeiten kommen vom Client (Öffnungszeiten des Tages bzw.
 * Fallback, `defaultRangeForDay`), die Stellenzahl startet bei 1. */
export async function applyShiftMatrix(
  eventId: string,
  changes: {
    add: Omit<ShiftInput, "capacity">[];
    removeShiftIds: string[];
  },
) {
  await requireActionPermission("events:manage");

  const listRoles = await prisma.helperRole.findMany({
    where: { hasShifts: false },
    select: { id: true },
  });
  const listRoleIds = new Set(listRoles.map((role) => role.id));
  const data = changes.add.map((entry) => ({
    ...entry,
    eventId,
    capacity: listRoleIds.has(entry.roleId) ? 0 : 1,
  }));
  for (const entry of data) {
    const validationError = validateShiftInput(entry);
    if (validationError) return { error: validationError };
  }

  await prisma.$transaction([
    prisma.shift.deleteMany({
      where: { id: { in: changes.removeShiftIds }, eventId },
    }),
    prisma.shift.createMany({ data }),
  ]);

  revalidatePath(`/admin/events/${eventId}`);
  return { success: true as const };
}
