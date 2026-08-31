import { prisma } from "@/lib/utils/prisma";
import { uniqueSlug } from "@/lib/utils/slug";

export type CreateMemberInput = {
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

export type CreateMemberResult =
  { error: string } | { success: true; memberId: string };

/**
 * Legt ein neues `Member` an (#342) — bislang entstanden Zeilen nur per
 * Migration oder dem Sammelkonto-Seed, es gab keinen Admin-Weg für ein neu
 * beigetretenes Mitglied. Mitgliedsnummer nach demselben Schema wie
 * `ensureAnonymerMeeple()` im Seed: höchste bestehende Nummer + 1, nicht
 * lückenfüllend — vermeidet Race-Conditions mit gleichzeitig laufenden
 * Anlage-Vorgängen besser als ein Lücken-Scan.
 */
export async function createMember(
  input: CreateMemberInput,
): Promise<CreateMemberResult> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    return { error: "Bitte eine E-Mail-Adresse angeben." };
  }

  const existing = await prisma.member.findUnique({ where: { email } });
  if (existing) {
    return {
      error: `Für ${email} existiert bereits ein Vereinsmitglied.`,
    };
  }

  const highestNumber = await prisma.member.aggregate({
    _max: { memberNumber: true },
  });
  const memberNumber = (highestNumber._max.memberNumber ?? 0) + 1;

  const nameForSlug =
    [input.firstName, input.lastName].filter(Boolean).join(" ").trim() ||
    `mitglied-${memberNumber}`;
  const slug = await uniqueSlug(
    nameForSlug,
    async (candidate) =>
      (await prisma.member.findUnique({ where: { slug: candidate } })) !== null,
  );

  const member = await prisma.member.create({
    data: {
      memberNumber,
      slug,
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

  return { success: true, memberId: member.id };
}
