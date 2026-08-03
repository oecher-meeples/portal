"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { getMembershipState } from "@/lib/members/meeples";
import { requirePermission } from "@/lib/auth/permissions";
import { deleteBlobs } from "@/lib/utils/blob-delete";

async function requireMembersManage() {
  return requirePermission("members:manage");
}

/** How many games and units currently sit with this Meeple, for the confirmation dialog. */
export async function getOpenHoldingsSummary(meepleId: string) {
  await requireMembersManage();

  const [games, units] = await Promise.all([
    prisma.gameHolding.count({ where: { meepleId, endedAt: null } }),
    prisma.storageUnit.count({
      where: { keeperMeepleId: meepleId, retiredAt: null },
    }),
  ]);

  return { games, units };
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
    prisma.storageUnit.count({
      where: { keeperMeepleId: meepleId, retiredAt: null },
    }),
  ]);
  if (openGames > 0 || openUnits > 0) {
    return {
      error:
        "Bei diesem Mitglied liegen noch Vereinsspiele oder -einheiten. Erst zurückholen, dann anonymisieren.",
    };
  }

  const neonAuthUserId = meeple.neonAuthUserId;
  const previousDisplayName = meeple.displayName;

  // Blob URLs stay publicly reachable after the database row is cleared, so the
  // files go first: if this fails the member is left un-anonymised and the admin
  // can retry, which is the safer failure than "anonymised, photos still online".
  const listingsWithImages = await prisma.marketListing.findMany({
    where: { sellerMeepleId: meepleId, imageUrls: { isEmpty: false } },
    select: { id: true, imageUrls: true },
  });
  await deleteBlobs(listingsWithImages.flatMap((listing) => listing.imageUrls));

  await prisma.$transaction(async (tx) => {
    if (neonAuthUserId) {
      await tx.$executeRaw`DELETE FROM neon_auth."session" WHERE "userId" = ${neonAuthUserId}::uuid`;
      await tx.$executeRaw`DELETE FROM neon_auth."account" WHERE "userId" = ${neonAuthUserId}::uuid`;
      await tx.$executeRaw`DELETE FROM neon_auth."user" WHERE id = ${neonAuthUserId}::uuid`;
    }

    await tx.marketListing.updateMany({
      where: { sellerMeepleId: meepleId },
      data: { imageUrls: [] },
    });

    // `Post.author` is free text with no relation to Meeple, so the display name
    // is the only available link — posts written under a different spelling stay
    // untouched and need a manual check.
    await tx.post.updateMany({
      where: { author: previousDisplayName },
      data: { author: null },
    });

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
        telegramHandle: null,
        signalHandle: null,
        discordHandle: null,
        anonymizedAt: new Date(),
      },
    });
  });

  revalidatePath("/admin/mitglieder");
  revalidatePath("/markt");
  return { success: true as const };
}
