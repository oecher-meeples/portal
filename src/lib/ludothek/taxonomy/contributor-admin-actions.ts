"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";
import {
  normalizeTaxonomyName,
  taxonomyDedupKey,
} from "@/lib/ludothek/taxonomy/normalize";

function revalidateLudothek() {
  revalidatePath("/ludothek");
  revalidatePath("/admin/bestand");
  revalidatePath("/admin/mitwirkende");
}

export async function renameContributor(id: string, name: string) {
  const user = await requireGamesManagePermission();
  if (!user) return { error: "Keine Berechtigung." };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Bitte einen Namen angeben." };

  const contributor = await prisma.contributor.findUnique({ where: { id } });
  if (!contributor) return { error: "Eintrag nicht gefunden." };

  const normalizedName = normalizeTaxonomyName(trimmed);
  const dedupKey = taxonomyDedupKey(contributor.bggId, normalizedName);
  const clash = await prisma.contributor.findUnique({ where: { dedupKey } });
  if (clash && clash.id !== id) {
    return {
      error: `„${clash.name}“ existiert bereits. Bitte stattdessen zusammenführen.`,
    };
  }

  await prisma.contributor.update({
    where: { id },
    data: { name: trimmed, normalizedName, dedupKey },
  });
  revalidateLudothek();
  return { success: true as const };
}

/** Führt zwei Einträge zusammen. Erlaubt nur, wenn höchstens einer eine
 * BGG-ID hat — sonst wären zwei BGG-Identitäten verschmolzen. Der Eintrag mit
 * BGG-ID bleibt bestehen, sonst der Ziel-Eintrag. */
export async function mergeContributors(sourceId: string, targetId: string) {
  const user = await requireGamesManagePermission();
  if (!user) return { error: "Keine Berechtigung." };
  if (sourceId === targetId)
    return { error: "Bitte zwei verschiedene Einträge wählen." };

  const [source, target] = await Promise.all([
    prisma.contributor.findUnique({
      where: { id: sourceId },
      include: { boardGames: true },
    }),
    prisma.contributor.findUnique({ where: { id: targetId } }),
  ]);
  if (!source || !target) return { error: "Eintrag nicht gefunden." };
  if (source.bggId !== null && target.bggId !== null) {
    return {
      error:
        "Zusammenführen ist nur möglich, wenn höchstens ein Eintrag eine BGG-ID hat.",
    };
  }

  const keep = source.bggId !== null ? source : target;
  const drop = keep === source ? target : source;
  const dropLinks = await prisma.boardGameContributor.findMany({
    where: { contributorId: drop.id },
  });

  await prisma.$transaction(async (tx) => {
    if (dropLinks.length > 0) {
      await tx.boardGameContributor.createMany({
        data: dropLinks.map((link) => ({
          boardGameId: link.boardGameId,
          contributorId: keep.id,
          role: link.role,
        })),
        skipDuplicates: true,
      });
    }
    await tx.boardGameContributor.deleteMany({
      where: { contributorId: drop.id },
    });
    await tx.contributor.delete({ where: { id: drop.id } });
  });

  revalidateLudothek();
  return { success: true as const };
}

export async function deleteContributor(id: string) {
  const user = await requireGamesManagePermission();
  if (!user) return { error: "Keine Berechtigung." };

  const linkCount = await prisma.boardGameContributor.count({
    where: { contributorId: id },
  });
  if (linkCount > 0) {
    return {
      error:
        "Eintrag ist noch mit Titeln verknüpft und kann nicht gelöscht werden.",
    };
  }

  await prisma.contributor.delete({ where: { id } });
  revalidateLudothek();
  return { success: true as const };
}
