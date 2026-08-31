import { prisma } from "@/lib/utils/prisma";

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
  if (!email) {
    return { error: "Bitte eine E-Mail-Adresse angeben." };
  }

  const conflict = await prisma.member.findUnique({ where: { email } });
  if (conflict && conflict.id !== memberId) {
    return {
      error: `Für ${email} existiert bereits ein anderes Vereinsmitglied.`,
    };
  }

  await prisma.member.update({
    where: { id: memberId },
    data: {
      email,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      birthDate: input.birthDate ?? null,
      birthPlace: input.birthPlace?.trim() || null,
      street: input.street?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
      city: input.city?.trim() || null,
      phone: input.phone?.trim() || null,
    },
  });

  return { success: true };
}
