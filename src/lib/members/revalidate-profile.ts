import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";

/**
 * Invalidiert die Profilseite `/profil/[slug]` eines Vereinsmitglieds —
 * nach jeder Aktion, die dort Angezeigtes ändert. Der Slug ist nicht an der
 * Aufrufstelle bekannt, daher per `memberId` oder `meepleId` nachgeschlagen;
 * ohne verknüpftes Mitglied ist nichts zu invalidieren.
 */
export async function revalidateMemberProfile(
  by: { memberId: string } | { meepleId: string },
) {
  const member = await prisma.member.findUnique({
    where: "memberId" in by ? { id: by.memberId } : { meepleId: by.meepleId },
    select: { slug: true },
  });
  if (member) revalidatePath(`/profil/${member.slug}`);
}
