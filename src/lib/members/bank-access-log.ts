import { BankDataAccessKind, PendingChangeKind } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import { ensureMeeple } from "@/lib/members/meeples";
import { decryptSecret } from "@/lib/utils/crypto";
import { checkAndRecordCountLimit } from "@/lib/utils/rate-limit";
import {
  IBAN_REVEAL_MAX_CALLS,
  IBAN_REVEAL_WINDOW_SECONDS,
} from "@/lib/auth/rate-limit-alerts";

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
  const limit = await checkAndRecordCountLimit(
    `iban-reveal:${actorMeepleId}`,
    IBAN_REVEAL_MAX_CALLS,
    IBAN_REVEAL_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return {
      error:
        "Zu viele IBAN-Abrufe in kurzer Zeit. Bitte versuche es später erneut.",
    };
  }

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

/**
 * Decrypts the not-yet-approved IBAN of an open `PendingChange` and logs the
 * access identically to {@link revealMeepleIban} (#356) — a Kassenwart
 * shouldn't have to approve a change blind. `newValue` has been encrypted at
 * rest since #357.
 */
export async function revealPendingIbanChange(
  changeId: string,
  actorMeepleId: string,
): Promise<{ error: string } | { success: true; iban: string }> {
  const limit = await checkAndRecordCountLimit(
    `iban-reveal:${actorMeepleId}`,
    IBAN_REVEAL_MAX_CALLS,
    IBAN_REVEAL_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return {
      error:
        "Zu viele IBAN-Abrufe in kurzer Zeit. Bitte versuche es später erneut.",
    };
  }

  const change = await prisma.pendingChange.findUnique({
    where: { id: changeId },
    select: {
      kind: true,
      newValue: true,
      member: { select: { meepleId: true } },
    },
  });
  if (!change || change.kind !== PendingChangeKind.IBAN) {
    return { error: "Änderungsantrag nicht gefunden." };
  }

  const iban = decryptSecret(change.newValue);
  await logBankDataAccess({
    accessedByMeepleId: actorMeepleId,
    subjectMeepleId: change.member.meepleId,
    kind: BankDataAccessKind.SINGLE_REVEAL,
  });

  return { success: true as const, iban };
}
