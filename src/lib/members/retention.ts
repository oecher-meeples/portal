import { prisma } from "@/lib/utils/prisma";
import { anonymiseMeepleRecord } from "@/lib/members/anonymisation";

/**
 * TODO (Vorstandsentscheidung, siehe #49): Aufbewahrungsfrist für Stammdaten
 * nach dem Austritt. Bewusst `null`, nicht geraten.
 *
 * Der Konflikt: Art. 5 Abs. 1 lit. c DSGVO (Datenminimierung) drängt auf
 * Löschen, während steuerliche Belegaufbewahrung für Beitragsdaten Jahre
 * verlangen kann. Wahrscheinlich braucht es getrennte Fristen für Stammdaten
 * und Finanzdaten — deshalb ist hier keine einzelne Zahl eingesetzt.
 *
 * Solange dieser Wert `null` ist, läuft die Automatik **nicht**. Die Mechanik
 * ist fertig und getestet; sie wartet nur auf die Zahl.
 */
export const MEMBER_DATA_RETENTION_MONTHS: number | null = null;

export type RetentionRunSummary = {
  /** True while MEMBER_DATA_RETENTION_MONTHS is unset — nothing was touched. */
  skipped: boolean;
  anonymised: number;
  failed: { meepleId: string; error: string }[];
};

export function retentionCutoff(retentionMonths: number, now: Date): Date {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - retentionMonths);
  return cutoff;
}

/**
 * Anonymises members whose membership ended longer ago than the retention
 * period. Reuses `anonymiseMeepleRecord`, so the open-holdings precondition and
 * the blob deletion apply here exactly as in the admin path.
 *
 * Runs on the existing daily cron (`/api/cron/instagram-queue`) — deliberately
 * no second cron entry, mirroring `deleteExpiredBankDataAccessLogs`.
 */
export async function anonymiseExpiredMeeples({
  retentionMonths = MEMBER_DATA_RETENTION_MONTHS,
  now = new Date(),
}: {
  retentionMonths?: number | null;
  now?: Date;
} = {}): Promise<RetentionRunSummary> {
  if (retentionMonths === null) {
    return { skipped: true, anonymised: 0, failed: [] };
  }

  const candidates = await prisma.member.findMany({
    where: {
      meepleId: { not: null },
      meeple: { anonymizedAt: null },
      membershipEndsAt: {
        not: null,
        lt: retentionCutoff(retentionMonths, now),
      },
    },
    select: { meepleId: true },
  });

  const failed: RetentionRunSummary["failed"] = [];
  let anonymised = 0;

  for (const candidate of candidates) {
    const result = await anonymiseMeepleRecord(candidate.meepleId!, now);
    if ("error" in result) {
      failed.push({ meepleId: candidate.meepleId!, error: result.error });
      continue;
    }
    anonymised += 1;
  }

  return { skipped: false, anonymised, failed };
}
