import { prisma } from "@/lib/utils/prisma";
import { getMembershipState } from "@/lib/members/meeples";
import {
  countOpenHoldings,
  countOpenHoldingsByMemberId,
  hasOpenHoldings,
} from "@/lib/members/open-holdings";
import { deleteBlobs } from "@/lib/utils/blob-delete";
import { ANONYMER_MEEPLE_NAME } from "@/lib/ludothek/anonymer-meeple";

export type AnonymisationResult = { error: string } | { success: true };

/**
 * Drei Stufen (#331), aufgeteilt aus der ursprünglich einstufigen
 * `anonymiseMeepleRecord`:
 *
 * - **Stufe 1** ({@link anonymiseMeepleStufe1}): optionale `Meeple`-Felder,
 *   `Post.author`, Marktplatzbilder — jederzeit selbst auslösbar, keine
 *   Kündigungs-Vorbedingung, `anonymizedAt` bleibt unberührt.
 * - **Stufe 2** ({@link anonymiseMeepleStufe2}): baut auf Stufe 1 auf (ruft
 *   sie idempotent mit auf) und löscht zusätzlich hart das Neon-Auth-Login,
 *   trennt `Member.meepleId`, setzt `Meeple.anonymizedAt`. Braucht
 *   "ausgetreten" + keine offenen Ausleihen.
 * - **Stufe 3** ({@link anonymiseMemberStufe3}): löscht die `Member`-Zeile
 *   komplett, frühestens 12 Monate nach `membershipEndsAt`, wieder ohne
 *   offene Ausleihen. `GameHolding.vereinsmitgliedId` fällt dabei per
 *   `onDelete: SetNull` weg — die Ausleihhistorie bleibt lesbar.
 *
 * Lebt im lib-Layer, weil mehrere Aufrufer (Admin-Aktion, Jahreswechsel-Cron)
 * dieselben Regeln brauchen — eine zweite Implementierung wäre ein
 * Compliance-Bug in Wartestellung. Keine der drei Funktionen prüft
 * Berechtigungen, das ist Sache der Aufrufer.
 */
export async function anonymiseMeepleStufe1(
  meepleId: string,
): Promise<AnonymisationResult> {
  const meeple = await prisma.meeple.findUnique({ where: { id: meepleId } });
  if (!meeple) {
    return { error: "Mitglied nicht gefunden." };
  }
  if (meeple.anonymizedAt) {
    return {
      error: "Dieses Mitglied ist bereits vollständig anonymisiert (Stufe 2).",
    };
  }

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
        // Gleicher Basisname wie das Sammelkonto "Anonymer Meeple" (#364) —
        // für alle außer `games:manage` ununterscheidbar, siehe
        // `anonymisedMeepleDisplayName()`.
        displayName: ANONYMER_MEEPLE_NAME,
        bggUsername: null,
        bgaUsername: null,
        telegramHandle: null,
        signalHandle: null,
        discordHandle: null,
        address: null,
        shareAddress: false,
        doorbellNote: null,
      },
    });
  });

  return { success: true };
}

export async function anonymiseMeepleStufe2(
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

  const member = await prisma.member.findUnique({
    where: { meepleId },
    select: { id: true, resignedAt: true, membershipEndsAt: true },
  });
  const membershipState = getMembershipState(
    {
      meepleId: meeple.id,
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

  // Idempotent: fasst Stufe 1 mit an, falls sie das Mitglied nicht schon
  // selbst ausgelöst hat — zwei separate Transaktionen statt einer
  // gemeinsamen, siehe Klassenkommentar oben.
  const stufe1 = await anonymiseMeepleStufe1(meepleId);
  if ("error" in stufe1) {
    return stufe1;
  }

  const neonAuthUserId = meeple.neonAuthUserId;

  await prisma.$transaction(async (tx) => {
    if (neonAuthUserId) {
      await tx.$executeRaw`DELETE FROM neon_auth."session" WHERE "userId" = ${neonAuthUserId}::uuid`;
      await tx.$executeRaw`DELETE FROM neon_auth."account" WHERE "userId" = ${neonAuthUserId}::uuid`;
      await tx.$executeRaw`DELETE FROM neon_auth."user" WHERE id = ${neonAuthUserId}::uuid`;
    }

    if (member) {
      await tx.member.update({
        where: { id: member.id },
        data: { meepleId: null },
      });
    }

    // Anonymising *is* how a deletion request gets fulfilled, so closing it here
    // keeps the Art.-12-Abs.-3 queue honest without a second admin click.
    await tx.deletionRequest.updateMany({
      where: { meepleId, handledAt: null },
      data: { handledAt: now },
    });

    await tx.meeple.update({
      where: { id: meepleId },
      data: { neonAuthUserId: null, anonymizedAt: now },
    });
  });

  return { success: true };
}

const STUFE3_MIN_MONTHS_SINCE_END = 12;

/** Berechnet den frühesten Zeitpunkt, ab dem Stufe 3 für einen bestimmten
 * `membershipEndsAt` erlaubt ist — exportiert für den Jahreswechsel-Cron. */
export function stufe3EligibleFrom(membershipEndsAt: Date): Date {
  const eligibleFrom = new Date(membershipEndsAt);
  eligibleFrom.setUTCMonth(
    eligibleFrom.getUTCMonth() + STUFE3_MIN_MONTHS_SINCE_END,
  );
  return eligibleFrom;
}

/** Vereinsmitglieder, für die Stufe 3 fällig ist — 12 Monate seit Austritt
 * vorbei, keine offenen Ausleihen. Von der Admin-Übersicht **und** dem
 * Jahreswechsel-Cron genutzt, damit beide dieselbe Definition von "fällig"
 * teilen. Member-zentrisch (nicht Meeple-zentrisch), weil nach Stufe 2 kein
 * `Meeple` mehr auf das Vereinsmitglied zeigt (`Member.meepleId` ist dann
 * bereits `null`). */
export async function listMembersEligibleForStufe3(now: Date = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - STUFE3_MIN_MONTHS_SINCE_END);

  const candidates = await prisma.member.findMany({
    where: { membershipEndsAt: { not: null, lte: cutoff } },
    include: { meeple: { select: { displayName: true } } },
  });

  const withoutOpenHoldings = [];
  for (const member of candidates) {
    const openGames = await countOpenHoldingsByMemberId(member.id);
    if (openGames === 0) withoutOpenHoldings.push(member);
  }
  return withoutOpenHoldings;
}

export async function anonymiseMemberStufe3(
  memberId: string,
  now: Date = new Date(),
): Promise<AnonymisationResult> {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) {
    return { error: "Vereinsmitglied nicht gefunden." };
  }
  if (!member.membershipEndsAt) {
    return {
      error: "Für dieses Vereinsmitglied ist kein Austrittsdatum hinterlegt.",
    };
  }
  if (stufe3EligibleFrom(member.membershipEndsAt) > now) {
    return {
      error:
        "Seit dem Austritt sind noch keine 12 Monate vergangen — Stufe 3 ist erst danach möglich.",
    };
  }
  if ((await countOpenHoldingsByMemberId(memberId)) > 0) {
    return {
      error:
        "Bei diesem Vereinsmitglied liegen noch Vereinsspiele vor. Erst zurückholen, dann löschen.",
    };
  }

  await prisma.member.delete({ where: { id: memberId } });

  return { success: true };
}
