"use server";

import { BankDataAccessKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logBankDataAccess } from "@/lib/bank-access-log";
import { decryptSecret } from "@/lib/crypto";
import { ensureMeeple } from "@/lib/meeples";
import { requirePermission } from "@/lib/permissions";

/** The only columns the export ever contains. */
export const BANK_CSV_COLUMNS = [
  "Mitgliedsnummer",
  "Name",
  "Kontoinhaber",
  "IBAN",
] as const;

async function requireBankReader() {
  const user = await requirePermission("bank:read");
  return ensureMeeple(user);
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function revealIban(meepleId: string) {
  const actor = await requireBankReader();

  const subject = await prisma.meeple.findUnique({
    where: { id: meepleId },
    select: { id: true, ibanEncrypted: true },
  });

  if (!subject?.ibanEncrypted) {
    return { error: "Für dieses Mitglied ist keine IBAN gespeichert." };
  }

  const iban = decryptSecret(subject.ibanEncrypted);
  await logBankDataAccess({
    accessedByMeepleId: actor.id,
    subjectMeepleId: subject.id,
    kind: BankDataAccessKind.SINGLE_REVEAL,
  });

  return { success: true as const, iban };
}

export async function exportBankDataCsv() {
  const actor = await requireBankReader();

  const meeples = await prisma.meeple.findMany({
    where: { ibanEncrypted: { not: null }, anonymizedAt: null },
    orderBy: { memberNumber: "asc" },
    select: {
      memberNumber: true,
      displayName: true,
      accountHolder: true,
      ibanEncrypted: true,
    },
  });

  const rows = meeples.map((meeple) =>
    [
      meeple.memberNumber,
      meeple.displayName,
      meeple.accountHolder ?? meeple.displayName,
      decryptSecret(meeple.ibanEncrypted!),
    ]
      .map(csvCell)
      .join(";"),
  );

  await logBankDataAccess({
    accessedByMeepleId: actor.id,
    kind: BankDataAccessKind.CSV_EXPORT,
  });

  return {
    success: true as const,
    filename: "beitragseinzug.csv",
    csv: [BANK_CSV_COLUMNS.join(";"), ...rows].join("\r\n"),
    rowCount: rows.length,
  };
}
