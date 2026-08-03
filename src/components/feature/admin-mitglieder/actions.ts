"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import { anonymiseMeepleRecord } from "@/lib/members/anonymisation";
import { countOpenHoldings } from "@/lib/members/open-holdings";

async function requireMembersManage() {
  return requirePermission("members:manage");
}

/** How many games and units currently sit with this Meeple, for the confirmation dialog. */
export async function getOpenHoldingsSummary(meepleId: string) {
  await requireMembersManage();

  return countOpenHoldings(meepleId);
}

export async function recordResignation(meepleId: string, endsAt: Date) {
  await requireMembersManage();

  await prisma.$transaction([
    prisma.meeple.update({
      where: { id: meepleId },
      data: { resignedAt: new Date(), membershipEndsAt: endsAt },
    }),
    // No cron marks the exact turn-of-year moment, so this is the closest
    // practical hook to "wird ausgetreten" — close now rather than leave
    // open Gesuche nobody will ever close once access is revoked.
    prisma.lfgPost.updateMany({
      where: { createdByMeepleId: meepleId, closedAt: null },
      data: { closedAt: new Date() },
    }),
  ]);

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function revokeResignation(meepleId: string) {
  await requireMembersManage();

  await prisma.meeple.update({
    where: { id: meepleId },
    data: { resignedAt: null, membershipEndsAt: null },
  });

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function anonymiseMeeple(meepleId: string) {
  await requireMembersManage();

  const result = await anonymiseMeepleRecord(meepleId);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  revalidatePath("/markt");
  return { success: true as const };
}
