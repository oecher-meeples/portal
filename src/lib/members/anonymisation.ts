import { prisma } from "@/lib/utils/prisma";
import { getMembershipState } from "@/lib/members/meeples";
import {
  countOpenHoldings,
  hasOpenHoldings,
} from "@/lib/members/open-holdings";
import { deleteBlobs } from "@/lib/utils/blob-delete";

export type AnonymisationResult = { error: string } | { success: true };

/**
 * Strips every identifying field from a Meeple while keeping the row, so the
 * club's lending and event history survives without a personal reference.
 *
 * Lives in the lib layer because two callers need the exact same rules: the
 * admin action in the members area and the retention job on the daily cron.
 * A second implementation would be a compliance bug waiting to happen.
 *
 * Does *not* check permissions — that is the caller's job.
 */
export async function anonymiseMeepleRecord(
  meepleId: string,
  now: Date = new Date(),
): Promise<AnonymisationResult> {
  const meeple = await prisma.meeple.findUnique({ where: { id: meepleId } });
  if (!meeple) {
    return { error: "Mitglied nicht gefunden." };
  }
  if (meeple.anonymizedAt) {
    return { error: "Dieses Mitglied ist bereits anonymisiert." };
  }
  // resignedAt/membershipEndsAt moved to Member since #328 — anonymizedAt
  // itself stays on Meeple.
  const member = await prisma.member.findUnique({
    where: { meepleId },
    select: { resignedAt: true, membershipEndsAt: true },
  });
  const membershipState = getMembershipState(
    {
      resignedAt: member?.resignedAt ?? null,
      membershipEndsAt: member?.membershipEndsAt ?? null,
      anonymizedAt: meeple.anonymizedAt,
    },
    now,
  );
  if (membershipState !== "ausgetreten") {
    return { error: "Nur ausgetretene Mitglieder können anonymisiert werden." };
  }
  if (hasOpenHoldings(await countOpenHoldings(meepleId))) {
    return {
      error:
        "Bei diesem Mitglied liegen noch Vereinsspiele oder -einheiten. Erst zurückholen, dann anonymisieren.",
    };
  }

  const neonAuthUserId = meeple.neonAuthUserId;
  const previousDisplayName = meeple.displayName;

  // Blob URLs stay publicly reachable after the database row is cleared, so the
  // files go first: if this fails the member is left un-anonymised and the caller
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

    // Anonymising *is* how a deletion request gets fulfilled, so closing it here
    // keeps the Art.-12-Abs.-3 queue honest without a second admin click.
    await tx.deletionRequest.updateMany({
      where: { meepleId, handledAt: null },
      data: { handledAt: now },
    });

    await tx.meeple.update({
      where: { id: meepleId },
      data: {
        displayName: "(anonymisiert)",
        neonAuthUserId: null,
        bggUsername: null,
        bgaUsername: null,
        telegramHandle: null,
        signalHandle: null,
        discordHandle: null,
        address: null,
        shareAddress: false,
        doorbellNote: null,
        anonymizedAt: now,
      },
    });
  });

  return { success: true };
}
