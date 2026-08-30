import { BankDataAccessKind } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import { ensureMeeple } from "@/lib/members/meeples";
import { decryptSecret } from "@/lib/utils/crypto";

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

/**
 * Gate for every place that decrypts a Meeple's bank data — `bank:read` is
 * deliberately separate from `members:manage` (see PERMISSIONS in
 * seed-roles.ts), so an admin dialog that edits other Meeple fields must not
 * fall back on its own permission to also unlock this.
 */
export async function requireBankReader() {
  const user = await requirePermission("bank:read");
  return ensureMeeple(user);
}

/**
 * Decrypts one Meeple's IBAN and logs the access. Shared by the dedicated
 * Bankdaten admin page and the Bankdaten section of the Mitglieder-edit
 * dialog — one implementation so both log identically.
 *
 * The IBAN itself lives on the linked `Member` since #328 — the log's
 * subject is still the `Meeple` (`meepleId`), the identity an admin actually
 * picks in the UI.
 */
export async function revealMeepleIban(
  meepleId: string,
  actorMeepleId: string,
): Promise<{ error: string } | { success: true; iban: string }> {
  const member = await prisma.member.findUnique({
    where: { meepleId },
    select: { ibanEncrypted: true },
  });

  if (!member?.ibanEncrypted) {
    return { error: "Für dieses Mitglied ist keine IBAN gespeichert." };
  }

  const iban = decryptSecret(member.ibanEncrypted);
  await logBankDataAccess({
    accessedByMeepleId: actorMeepleId,
    subjectMeepleId: meepleId,
    kind: BankDataAccessKind.SINGLE_REVEAL,
  });

  return { success: true as const, iban };
}
