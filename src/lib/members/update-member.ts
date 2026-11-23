import { prisma } from "@/lib/utils/prisma";
import { requiresEmail } from "@/lib/members/contribution";

export type UpdateMemberInput = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: Date | null;
  birthPlace?: string | null;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  phone?: string | null;
  /** Vereinsbeitritt (Live-Review F1) — ohne Angabe bleibt der bestehende Wert erhalten. */
  joinedAt?: Date | null;
};

export type UpdateMemberResult = { error: string } | { success: true };

/** Personendaten-Bearbeitung für eine bestehende `Member`-Zeile (#343) —
 * IBAN/Bankdaten bleiben ausgenommen (eigener Änderungsantrag-Flow, siehe
 * `pending-changes.ts`), ebenso Kündigungsstatus (eigene Dialoge). */
export async function updateMember(
  memberId: string,
  input: UpdateMemberInput,
): Promise<UpdateMemberResult> {
  const email = input.email.trim().toLowerCase();
  // MiniMeeple/JungMeeple (< 18, aus birthDate) dürfen ohne eigene E-Mail
  // geführt werden — ein:e Erziehungsberechtigte:r handelt für sie.
  if (
    !email &&
    requiresEmail({
      birthDate: input.birthDate ?? null,
      selbstgewaehlterBeitrag: null,
    })
  ) {
    return { error: "Bitte eine E-Mail-Adresse angeben." };
  }
  if (
    !input.street?.trim() ||
    !input.postalCode?.trim() ||
    !input.city?.trim()
  ) {
    return { error: "Bitte eine vollständige Adresse angeben." };
  }

  if (email) {
    const conflict = await prisma.member.findUnique({ where: { email } });
    if (conflict && conflict.id !== memberId) {
      return {
        error: `Für ${email} existiert bereits ein anderes Vereinsmitglied.`,
      };
    }
  }

  await prisma.member.update({
    where: { id: memberId },
    data: {
      email: email || null,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      birthDate: input.birthDate ?? null,
      birthPlace: input.birthPlace?.trim() || null,
      street: input.street?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
      city: input.city?.trim() || null,
      phone: input.phone?.trim() || null,
      ...(input.joinedAt ? { joinedAt: input.joinedAt } : {}),
    },
  });

  return { success: true };
}
