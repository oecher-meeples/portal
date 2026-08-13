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

/**
 * A Meeple holds exactly one role at a time (see redeemInvite's DEFAULT_ROLE),
 * so changing it means swapping the UserRole row, not adding to a set.
 */
export async function setMeepleRole(meepleId: string, roleId: string) {
  await requireMembersManage();

  const [meeple, role] = await Promise.all([
    prisma.meeple.findUniqueOrThrow({ where: { id: meepleId } }),
    prisma.role.findUniqueOrThrow({ where: { id: roleId } }),
  ]);

  if (!meeple.neonAuthUserId) {
    return { error: "Dieses Mitglied hat kein Login-Konto." };
  }

  await prisma.$transaction([
    prisma.userRole.deleteMany({
      where: { neonAuthUserId: meeple.neonAuthUserId },
    }),
    prisma.userRole.create({
      data: { neonAuthUserId: meeple.neonAuthUserId, roleId: role.id },
    }),
  ]);

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}
