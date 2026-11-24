"use server";

import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { requestEmailChange } from "@/lib/members/pending-changes";
import { revalidateMemberProfile } from "@/lib/members/revalidate-profile";
import { toResult } from "@/lib/utils/action-result";

/** E-Mail-Adresse ändern (#614) — immer nur das eigene Vereinsmitglied aus
 * der Session, nie eine client-übergebene ID. Stellt einen
 * `MEMBER_EMAIL`-Änderungsantrag mit Bestätigungslink an die neue Adresse;
 * wirksam (für Vereinsmitglied **und** Login) erst nach Vorstandsfreigabe. */
export async function requestOwnEmailChange(newEmail: string) {
  const { meeple } = await requireMember();
  const member = await prisma.member.findUnique({
    where: { meepleId: meeple.id },
    select: { id: true },
  });
  if (!member) {
    return { error: "Für dein Konto liegt keine Vereinsmitgliedschaft vor." };
  }

  const result = await toResult(() => requestEmailChange(member.id, newEmail));
  if ("error" in result) return result;
  if ("error" in result.value) return result.value;

  await revalidateMemberProfile({ memberId: member.id });
  return { success: true as const };
}
