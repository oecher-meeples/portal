"use server";

import { prisma } from "@/lib/utils/prisma";
import { requireMember } from "@/lib/auth/session";
import {
  toContactDialogMeeple,
  meepleEmail,
  type ContactDialogMeeple,
} from "@/lib/members/contact";

/**
 * Selbstlade-Pfad für `ContactDialog` (`components/entities/`), wenn die
 * Anzeigestelle nur eine `meepleId` kennt statt bereits geladener
 * Meeple-Felder — der Dialog ruft das erst beim Öffnen auf, nicht eager
 * beim Rendern der Zeile. Nur für eingeloggte Meeple: Kontaktdaten sind
 * grundsätzlich kein Gast-Feature, ein Gast-Sonderfall (z. B. Erklärbär-
 * Anwesenheit im Gast-Bereich, #389 "Events"-Freigabe) baut sich weiterhin
 * selbst ein vorab aufbereitetes `meeple`-Prop statt dieses Pfads.
 */
export async function fetchContactDialogMeeple(
  meepleId: string,
): Promise<ContactDialogMeeple | null> {
  await requireMember();

  const meeple = await prisma.meeple.findUnique({
    where: { id: meepleId },
    select: {
      telegramHandle: true,
      signalHandle: true,
      discordHandle: true,
      address: true,
      shareAddress: true,
      profilePictureUrl: true,
      profilePictureVisibility: true,
      member: { select: { email: true } },
    },
  });
  if (!meeple) return null;

  return toContactDialogMeeple(
    { ...meeple, email: meepleEmail(meeple) },
    { kind: "meeple" },
  );
}
