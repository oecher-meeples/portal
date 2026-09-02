"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/utils/prisma";
import { assertMaySubmitChangeFor } from "@/lib/members/guardians";
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
  /** yyyy-mm-dd (Live-Review F1) — Vereinsbeitritt, getrennt vom
   * Portal-Konto-Anlagedatum. */
  joinedAt: string | null;
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
    // `joinedAt` ist NOT NULL — ein geleertes Feld lässt den bestehenden Wert
    // unangetastet statt fälschlich `null` zu setzen.
    ...(input.joinedAt ? { joinedAt: new Date(input.joinedAt) } : {}),
  };
}

async function revalidateProfile(memberId: string) {
  const member = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
    select: { slug: true },
  });
  revalidatePath(`/profil/${member.slug}`);
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

/** Meeple-selbst/Erziehungsberechtigte: "Änderung beantragen" statt direkter
 * Bearbeitung (#380). */
export async function requestMemberStammdatenChange(
  memberId: string,
  diff: StammdatenDiff,
) {
  await assertMaySubmitChangeFor(memberId);

  const result = await requestStammdatenChange(memberId, diff);
  if ("error" in result) return result;

  await revalidateProfile(memberId);
  return { success: true as const };
}
