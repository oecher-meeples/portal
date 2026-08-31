"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { optionalHandle, optionalText } from "@/lib/utils/optional-text";

export type MeepleDatenInput = {
  bggUsername?: string | null;
  bgaUsername?: string | null;
  telegramHandle?: string | null;
  signalHandle?: string | null;
  discordHandle?: string | null;
  address?: string | null;
  shareAddress?: boolean;
  doorbellNote?: string | null;
};

/** Serverseitige Prüfung: der Meeple selbst oder `members:manage` (#382) —
 * niemals einem client-übergebenen `meepleId` blind vertrauen. */
async function assertMayEdit(meepleId: string) {
  const session = await requireMember();
  if (session.meeple.id === meepleId) return;
  await requirePermission("members:manage");
}

/** Direktes Speichern, kein Änderungsantrag (#382 — anders als der
 * Stammdaten-Bereich, #380): diese Felder sind freiwillige, nicht
 * DSGVO-kritische Angaben für andere Meeple, keine Vereins-Stammdaten. */
export async function updateMeepleDaten(
  meepleId: string,
  input: MeepleDatenInput,
) {
  await assertMayEdit(meepleId);

  await prisma.meeple.update({
    where: { id: meepleId },
    data: {
      bggUsername: optionalText(input.bggUsername),
      bgaUsername: optionalText(input.bgaUsername),
      telegramHandle: optionalHandle(input.telegramHandle),
      signalHandle: optionalHandle(input.signalHandle),
      discordHandle: optionalHandle(input.discordHandle),
      address: optionalText(input.address),
      shareAddress: input.shareAddress ?? false,
      doorbellNote: optionalText(input.doorbellNote),
    },
  });

  const member = await prisma.member.findUnique({
    where: { meepleId },
    select: { slug: true },
  });
  if (member) revalidatePath(`/profil/${member.slug}`);
  return { success: true as const };
}
