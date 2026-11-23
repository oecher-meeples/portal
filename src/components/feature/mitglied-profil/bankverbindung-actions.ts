"use server";

import { requireActionPermission } from "@/lib/auth/action-guards";
import { prisma } from "@/lib/utils/prisma";
import { revalidateMemberProfile } from "@/lib/members/revalidate-profile";
import { assertMaySubmitChangeFor } from "@/lib/members/guardians";
import { requestIbanChange } from "@/lib/members/pending-changes";
import {
  encryptSecret,
  ibanFirst2,
  ibanLast4,
  isValidIban,
  normaliseIban,
} from "@/lib/utils/crypto";

/** Kassenwart-Direktbearbeitung (#381) — anders als der Selbst-/Guardian-Weg
 * (`requestIbanChange`, weiter über `PendingChange`/Vorstandsfreigabe) trägt
 * der Kassenwart selbst die Freigabe-Berechtigung, ein zusätzlicher Antrag
 * an sich selbst wäre unnötige Umständlichkeit. */
export async function updateMemberIban(
  memberId: string,
  input: { accountHolder: string; iban: string },
) {
  await requireActionPermission("bank:read");

  const trimmedHolder = input.accountHolder.trim();
  if (!trimmedHolder) {
    return { error: "Bitte den Kontoinhaber angeben." };
  }

  const normalised = normaliseIban(input.iban);
  if (!isValidIban(normalised)) {
    return { error: "Diese IBAN ist ungültig. Bitte prüfe die Eingabe." };
  }

  await prisma.member.update({
    where: { id: memberId },
    data: {
      accountHolder: trimmedHolder,
      ibanEncrypted: encryptSecret(normalised),
      ibanFirst2: ibanFirst2(normalised),
      ibanLast4: ibanLast4(normalised),
    },
  });

  await revalidateMemberProfile({ memberId: memberId });
  return { success: true as const };
}

/** Meeple-selbst/Erziehungsberechtigte: "Änderung beantragen" statt direkter
 * Bearbeitung (#381) — geht über `PendingChange`/Kassenwart-Freigabe, siehe
 * {@link updateMemberIban}. */
export async function requestMemberIbanChange(
  memberId: string,
  input: { accountHolder: string; iban: string },
) {
  await assertMaySubmitChangeFor(memberId);

  const result = await requestIbanChange(memberId, input);
  if ("error" in result) return result;

  await revalidateMemberProfile({ memberId: memberId });
  return { success: true as const };
}
