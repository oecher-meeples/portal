"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMeeple } from "@/lib/meeples";

export async function markAttending(eventId: string) {
  const meeple = await requireMeeple();

  const hasExplainerGame = await prisma.explainerGame.count({
    where: { meepleId: meeple.id },
  });
  if (hasExplainerGame === 0) {
    return {
      error: "Nur Erklärbären mit mindestens einem Spiel im Profil können sich anmelden.",
    };
  }

  await prisma.explainerAttendance.upsert({
    where: { eventId_meepleId: { eventId, meepleId: meeple.id } },
    update: {},
    create: { eventId, meepleId: meeple.id },
  });

  revalidatePath("/helfer");
  return { success: true as const };
}

export async function markNotAttending(eventId: string) {
  const meeple = await requireMeeple();

  await prisma.explainerAttendance.deleteMany({
    where: { eventId, meepleId: meeple.id },
  });

  revalidatePath("/helfer");
  return { success: true as const };
}
