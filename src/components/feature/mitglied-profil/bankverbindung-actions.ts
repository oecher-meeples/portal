"use server";

import { revalidatePath } from "next/cache";
import {
  requireBankReader,
  revealMeepleIban,
  revealPendingIbanChange,
} from "@/lib/members/bank-access-log";
import { prisma } from "@/lib/utils/prisma";
import {
  encryptSecret,
  ibanLast4,
  isValidIban,
  normaliseIban,
} from "@/lib/utils/crypto";

/** Dünner Wrapper um `revealMeepleIban` (#381) — auf der Profilseite eigens
 * gehalten statt aus `admin-bank/actions.ts` importiert: Feature-Ordner
 * importieren laut CLAUDE.md nie voneinander, die eigentliche Logik (samt
 * Access-Log) lebt bereits gemeinsam in `lib/members/bank-access-log.ts`. */
export async function revealMemberIban(meepleId: string) {
  const actor = await requireBankReader();
  return revealMeepleIban(meepleId, actor.id);
}

/** Dünner Wrapper um `revealPendingIbanChange` (#381), analog
 * {@link revealMemberIban} — für die offenen IBAN-Änderungsanträge unter
 * dem Bankverbindungs-Bereich. */
export async function revealPendingMemberIban(changeId: string) {
  const actor = await requireBankReader();
  return revealPendingIbanChange(changeId, actor.id);
}

/** Kassenwart-Direktbearbeitung (#381) — anders als der Selbst-/Guardian-Weg
 * (`requestIbanChange`, weiter über `PendingChange`/Vorstandsfreigabe) trägt
 * der Kassenwart selbst die Freigabe-Berechtigung, ein zusätzlicher Antrag
 * an sich selbst wäre unnötige Umständlichkeit. */
export async function updateMemberIban(
  memberId: string,
  input: { accountHolder: string; iban: string },
) {
  await requireBankReader();

  const trimmedHolder = input.accountHolder.trim();
  if (!trimmedHolder) {
    return { error: "Bitte den Kontoinhaber angeben." };
  }

  const normalised = normaliseIban(input.iban);
  if (!isValidIban(normalised)) {
    return { error: "Diese IBAN ist ungültig. Bitte prüfe die Eingabe." };
  }

  const member = await prisma.member.update({
    where: { id: memberId },
    data: {
      accountHolder: trimmedHolder,
      ibanEncrypted: encryptSecret(normalised),
      ibanLast4: ibanLast4(normalised),
    },
    select: { slug: true },
  });

  revalidatePath(`/mitglied/${member.slug}`);
  return { success: true as const };
}
