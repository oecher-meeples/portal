"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";

/**
 * Eigenständige Sofort-Speichern-Action für den Marktplatz-Newsletter-Switch
 * (#278-Folge) — losgelöst von `updateOwnProfile()`, damit der Schalter von
 * mehreren Stellen aus (Profil-Newsletter-Karte, Marktplatz-Seite) bedienbar
 * ist, ohne das ganze Profilformular mitzuschicken/-zuspeichern.
 */
export async function setMarketNewsletterOptIn(enabled: boolean) {
  const meeple = await requireMeeple();

  await prisma.meeple.update({
    where: { id: meeple.id },
    data: { marketNewsletterOptIn: enabled },
  });

  revalidatePath("/profil");
  revalidatePath("/markt");
  return { success: true as const };
}
