"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";

export async function assignShelfToEvent(eventId: string, unitId: string) {
  await requirePermission("events:manage");

  const unit = await prisma.storageUnit.findUnique({ where: { id: unitId } });
  if (!unit) {
    return { error: "Einheit nicht gefunden." };
  }
  if (unit.kind !== "SHELF") {
    return {
      error: "Nur Regale können einem Event zugeordnet werden, keine Kartons.",
    };
  }

  await prisma.eventShelfAssignment.upsert({
    where: { eventId_unitId: { eventId, unitId } },
    update: {},
    create: { eventId, unitId },
  });

  revalidatePath(`/admin/events/${eventId}`);
  return { success: true as const };
}

export async function unassignShelfFromEvent(eventId: string, unitId: string) {
  await requirePermission("events:manage");

  await prisma.eventShelfAssignment.deleteMany({
    where: { eventId, unitId },
  });

  revalidatePath(`/admin/events/${eventId}`);
  return { success: true as const };
}
