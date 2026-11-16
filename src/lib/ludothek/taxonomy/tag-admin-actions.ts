"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";

/** Setzt den deutschen Anzeigenamen eines Tags. Leer → `null`, die Anzeige
 * fällt dann auf den BGG-Namen zurück. Name, Typ und BGG-ID bleiben fix. */
export async function updateTagDisplayName(id: string, displayName: string) {
  const user = await requireGamesManagePermission();
  if (!user) return { error: "Keine Berechtigung." };

  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) return { error: "Eintrag nicht gefunden." };

  await prisma.tag.update({
    where: { id },
    data: { displayName: displayName.trim() || null },
  });
  revalidatePath("/ludothek");
  revalidatePath("/admin/bestand");
  revalidatePath("/admin/tags");
  return { success: true as const };
}
