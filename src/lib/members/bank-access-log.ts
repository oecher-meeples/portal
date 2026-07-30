import { BankDataAccessKind } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";

/** Retention agreed in docs/adr/0003. */
export const BANK_LOG_RETENTION_MONTHS = 24;

export function bankLogCutoff(now: Date = new Date()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - BANK_LOG_RETENTION_MONTHS);
  return cutoff;
}

export function logBankDataAccess({
  accessedByMeepleId,
  subjectMeepleId,
  kind,
}: {
  accessedByMeepleId: string;
  subjectMeepleId?: string | null;
  kind: BankDataAccessKind;
}) {
  return prisma.bankDataAccessLog.create({
    data: {
      accessedByMeepleId,
      subjectMeepleId: subjectMeepleId ?? null,
      kind,
    },
  });
}

export async function deleteExpiredBankDataAccessLogs(now: Date = new Date()) {
  const { count } = await prisma.bankDataAccessLog.deleteMany({
    where: { at: { lt: bankLogCutoff(now) } },
  });
  return { deleted: count };
}
