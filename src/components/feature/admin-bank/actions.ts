"use server";

import { BankDataAccessKind } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import {
  logBankDataAccess,
  requireBankReader,
  revealMeepleIban,
} from "@/lib/members/bank-access-log";
import { decryptSecret } from "@/lib/utils/crypto";
import { escapeCsvField } from "@/lib/utils/csv";

/** The only columns the export ever contains. */
export const BANK_CSV_COLUMNS = [
  "Mitgliedsnummer",
  "Name",
  "Kontoinhaber",
  "IBAN",
] as const;

function csvCell(value: string | number) {
  return escapeCsvField(value, ";");
}

export async function revealIban(meepleId: string) {
  const actor = await requireBankReader();
  return revealMeepleIban(meepleId, actor.id);
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
