"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";

/**
 * Ein Meeple bestätigt eine ihm zugewiesene Schicht (Schichtplan-Editor,
 * #159) — bis dahin gilt die Zuweisung als unbestätigt (`confirmedAt`
 * null). Kein Selbstbuchungs-Flow mehr: Zuweisungen entstehen nur noch per
 * Admin-Drag&Drop, nicht durch das Meeple selbst.
 */
export async function confirmOwnShiftBooking(shiftId: string) {
  const meeple = await requireMeeple();

  const updated = await prisma.shiftBooking.updateMany({
    where: { shiftId, meepleId: meeple.id, confirmedAt: null },
    data: { confirmedAt: new Date() },
  });

  if (updated.count === 0) {
    return { error: "Keine offene Zuweisung für diese Schicht gefunden." };
  }

  revalidatePath("/helfer");
  return { success: true as const };
}

/** Ein Meeple lehnt eine ihm zugewiesene Schicht ab — entfernt die eigene
 * Zuweisung, unabhängig vom Bestätigungsstatus. */
export async function declineOwnShiftBooking(shiftId: string) {
  const meeple = await requireMeeple();

  await prisma.shiftBooking.deleteMany({
    where: { shiftId, meepleId: meeple.id },
  });

  revalidatePath("/helfer");
  return { success: true as const };
}
