"use server";

import { BankDataAccessKind } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import {
  logBankDataAccess,
  requireBankReader,
  revealMeepleIban,
  revealPendingIbanChange,
} from "@/lib/members/bank-access-log";
import { decryptSecret } from "@/lib/utils/crypto";
import { escapeCsvField } from "@/lib/utils/csv";
import { memberDisplayName } from "@/lib/members/member-display-name";
import { BANK_CSV_COLUMNS } from "@/components/feature/admin-bank/csv-columns";

function csvCell(value: string | number) {
  return escapeCsvField(value, ";");
}

export async function revealIban(meepleId: string) {
  const actor = await requireBankReader();
  return revealMeepleIban(meepleId, actor.id);
}

export async function revealPendingIban(changeId: string) {
  const actor = await requireBankReader();
  return revealPendingIbanChange(changeId, actor.id);
}

export async function exportBankDataCsv() {
  const actor = await requireBankReader();

  // #395: Datenminimierung auf tatsächlich einzuziehende Zustände.
  // "Gekündigt" (resignedAt gesetzt, membershipEndsAt in der Zukunft) bleibt
  // beitragspflichtig bis Jahreswechsel und damit im Export — die Grenze ist
  // das Zustandsdatum selbst, nicht ob der Jahreswechsel-Cron ein
  // "Ausgetreten"-Meeple (membershipEndsAt in der Vergangenheit) bereits
  // verarbeitet hat (z. B. wegen offener Ausleihen noch nicht).
  const now = new Date();
  const members = await prisma.member.findMany({
    where: {
      ibanEncrypted: { not: null },
      AND: [
        { OR: [{ meepleId: null }, { meeple: { anonymizedAt: null } }] },
        {
          OR: [{ membershipEndsAt: null }, { membershipEndsAt: { gte: now } }],
        },
      ],
    },
    orderBy: { memberNumber: "asc" },
    select: {
      memberNumber: true,
      firstName: true,
      lastName: true,
      email: true,
      accountHolder: true,
      ibanEncrypted: true,
      meeple: { select: { displayName: true } },
    },
  });

  const rows = members.map((member) => {
    const name = memberDisplayName(member);
    return [
      member.memberNumber,
      name,
      member.accountHolder ?? name,
      decryptSecret(member.ibanEncrypted!),
    ]
      .map(csvCell)
      .join(";");
  });

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
