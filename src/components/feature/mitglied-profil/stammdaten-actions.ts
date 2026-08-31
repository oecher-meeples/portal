"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { isGuardianOf } from "@/lib/members/guardians";
import {
  requestStammdatenChange,
  type StammdatenDiff,
} from "@/lib/members/pending-changes";

/** Die vom Stammdaten-Bereich bearbeitbaren Felder (#380) — bewusst ohne
 * `email`: die läuft weiterhin über den eigenen `MEMBER_EMAIL`-Antragstyp mit
 * Bestätigungslink (#330), nicht über den generischen Stammdaten-Diff. */
export type StammdatenInput = {
  firstName: string | null;
  lastName: string | null;
  /** yyyy-mm-dd, wie ein `<input type="date">` es liefert. */
  birthDate: string | null;
  birthPlace: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  /** #388 — `TshirtSize.id` oder `null`, kein Freitext. */
  tshirtSizeId: string | null;
};

function toUpdateData(input: StammdatenInput) {
  return {
    firstName: input.firstName?.trim() || null,
    lastName: input.lastName?.trim() || null,
    birthDate: input.birthDate ? new Date(input.birthDate) : null,
    birthPlace: input.birthPlace?.trim() || null,
    street: input.street?.trim() || null,
    postalCode: input.postalCode?.trim() || null,
    city: input.city?.trim() || null,
    phone: input.phone?.trim() || null,
    tshirtSizeId: input.tshirtSizeId || null,
  };
}

async function revalidateProfile(memberId: string) {
  const member = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
    select: { slug: true },
  });
  revalidatePath(`/mitglied/${member.slug}`);
}

/** Direktbearbeitung für `members:manage` (#380) — kein Änderungsantrag. */
export async function updateMemberStammdaten(
  memberId: string,
  input: StammdatenInput,
) {
  await requirePermission("members:manage");

  await prisma.member.update({
    where: { id: memberId },
    data: toUpdateData(input),
  });
  await revalidateProfile(memberId);
  return { success: true as const };
}

/** Serverseitige Berechtigungsprüfung vor jedem Änderungsantrag auf ein
 * fremdes `Member` (#372) — niemals einem client-übergebenen `memberId`
 * blind vertrauen. */
async function assertMaySubmitFor(memberId: string) {
  const session = await requireMember();
  const targetMember = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
    select: { meepleId: true },
  });
  if (targetMember.meepleId === session.meeple.id) return;

  const ownMember = await prisma.member.findUnique({
    where: { meepleId: session.meeple.id },
    select: { id: true },
  });
  if (ownMember && (await isGuardianOf(ownMember.id, memberId))) return;

  throw new Error(
    "Du bist nicht berechtigt, einen Änderungsantrag für dieses Mitglied zu stellen.",
  );
}

/** Meeple-selbst/Erziehungsberechtigte: "Änderung beantragen" statt direkter
 * Bearbeitung (#380). */
export async function requestMemberStammdatenChange(
  memberId: string,
  diff: StammdatenDiff,
) {
  await assertMaySubmitFor(memberId);

  const result = await requestStammdatenChange(memberId, diff);
  if ("error" in result) return result;

  await revalidateProfile(memberId);
  return { success: true as const };
}
