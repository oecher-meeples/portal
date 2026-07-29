"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getMembershipState } from "@/lib/meeples";
import { requirePermission } from "@/lib/permissions";

async function requireMembersManage() {
  return requirePermission("members:manage");
}

/** How many games and units currently sit with this Meeple, for the confirmation dialog. */
export async function getOpenHoldingsSummary(meepleId: string) {
  await requireMembersManage();

  const [games, units] = await Promise.all([
    prisma.gameHolding.count({ where: { meepleId, endedAt: null } }),
    prisma.storageUnit.count({ where: { keeperMeepleId: meepleId, retiredAt: null } }),
  ]);

  return { games, units };
}

export async function recordResignation(meepleId: string, endsAt: Date) {
  await requireMembersManage();

  await prisma.meeple.update({
    where: { id: meepleId },
    data: { resignedAt: new Date(), membershipEndsAt: endsAt },
  });

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

  const meeple = await prisma.meeple.findUnique({ where: { id: meepleId } });
  if (!meeple) {
    return { error: "Mitglied nicht gefunden." };
  }
  if (meeple.anonymizedAt) {
    return { error: "Dieses Mitglied ist bereits anonymisiert." };
  }
  if (getMembershipState(meeple) !== "ausgetreten") {
    return { error: "Nur ausgetretene Mitglieder können anonymisiert werden." };
  }

  const [openGames, openUnits] = await Promise.all([
    prisma.gameHolding.count({ where: { meepleId, endedAt: null } }),
    prisma.storageUnit.count({ where: { keeperMeepleId: meepleId, retiredAt: null } }),
  ]);
  if (openGames > 0 || openUnits > 0) {
    return {
      error:
        "Bei diesem Mitglied liegen noch Vereinsspiele oder -einheiten. Erst zurückholen, dann anonymisieren.",
    };
  }

  const neonAuthUserId = meeple.neonAuthUserId;

  await prisma.$transaction(async (tx) => {
    if (neonAuthUserId) {
      await tx.$executeRaw`DELETE FROM neon_auth."session" WHERE "userId" = ${neonAuthUserId}::uuid`;
      await tx.$executeRaw`DELETE FROM neon_auth."account" WHERE "userId" = ${neonAuthUserId}::uuid`;
      await tx.$executeRaw`DELETE FROM neon_auth."user" WHERE id = ${neonAuthUserId}::uuid`;
    }

    await tx.meeple.update({
      where: { id: meepleId },
      data: {
        displayName: "(anonymisiert)",
        neonAuthUserId: null,
        email: null,
        accountHolder: null,
        ibanEncrypted: null,
        ibanLast4: null,
        bggUsername: null,
        bgaUsername: null,
        anonymizedAt: new Date(),
      },
    });
  });

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}
