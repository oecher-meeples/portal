import { prisma } from "@/lib/utils/prisma";
import { uniqueSlug } from "@/lib/utils/slug";
import { requiresEmail } from "@/lib/members/contribution";
import { memberFullName } from "@/lib/members/member-display-name";

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
  /** Vereinsbeitritt (Live-Review F1) — ohne Angabe heute. Die Spalte hat
   * seit #611 keinen Prisma-Default mehr (`null` = unbekannt, nur für den
   * Import), deshalb setzt die Einzelanlage den Wert hier ausdrücklich. */
  joinedAt?: Date | null;
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
  // MiniMeeple/JungMeeple (< 18, aus birthDate) dürfen ohne eigene E-Mail
  // angelegt werden — ein:e Erziehungsberechtigte:r handelt für sie.
  if (
    !email &&
    requiresEmail({
      birthDate: input.birthDate ?? null,
      selbstgewaehlterBeitrag: null,
      // Die Einzelanlage verknüpft Erziehungsberechtigte erst danach (#373).
      hasGuardian: false,
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
    const existing = await prisma.member.findUnique({ where: { email } });
    if (existing) {
      return {
        error: `Für ${email} existiert bereits ein Vereinsmitglied.`,
      };
    }
  }

  const highestNumber = await prisma.member.aggregate({
    _max: { memberNumber: true },
  });
  const memberNumber = (highestNumber._max.memberNumber ?? 0) + 1;

  const nameForSlug = memberFullName(input) || `mitglied-${memberNumber}`;
  const slug = await uniqueSlug(
    nameForSlug,
    async (candidate) =>
      (await prisma.member.findUnique({ where: { slug: candidate } })) !== null,
  );

  const member = await prisma.member.create({
    data: {
      memberNumber,
      slug,
      email: email || null,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      birthDate: input.birthDate ?? null,
      birthPlace: input.birthPlace?.trim() || null,
      street: input.street?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
      city: input.city?.trim() || null,
      phone: input.phone?.trim() || null,
      joinedAt: input.joinedAt ?? new Date(),
    },
  });

  return { success: true, memberId: member.id };
}
