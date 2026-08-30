import { prisma } from "@/lib/utils/prisma";

/**
 * Displayname des dauerhaften Sammelkontos "Anonymer Meeple" (#333) — Ziel
 * jeder "an extern weitergegeben"-Aktion, deren Empfänger:in kein eigenes
 * Vereinsmitglied ist (siehe `holdings-external.ts::handOverToExternal`).
 * Geteilt zwischen Seed-Skript und Anwendung, statt einer eigenen Flag-Spalte
 * auf `Meeple`/`Member` — es gibt bewusst genau ein Sammelkonto, kein
 * nummeriertes Kontingent (siehe Kommentar in `prisma/seed.ts`).
 */
export const ANONYMER_MEEPLE_NAME = "Anonymer Meeple";

/** Resolves the collective account's `Member` id — the target for
 * `handOverToExternal()` and the source for `rebookHoldingToMember()`. */
export async function findAnonymerMeepleMember() {
  return prisma.member.findFirst({
    where: {
      meeple: { displayName: ANONYMER_MEEPLE_NAME, neonAuthUserId: null },
    },
    select: { id: true, meepleId: true },
  });
}
