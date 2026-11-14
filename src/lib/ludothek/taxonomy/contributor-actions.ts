"use server";

import type { ContributorRole } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";
import {
  normalizeTaxonomyName,
  taxonomyDedupKey,
} from "@/lib/ludothek/taxonomy/normalize";

export async function listContributorNames(
  role: ContributorRole,
): Promise<string[]> {
  const user = await requireGamesManagePermission();
  if (!user) return [];

  const contributors = await prisma.contributor.findMany({
    // Verlage hängen an Editionen, Autoren/Illustratoren am Titel.
    where:
      role === "PUBLISHER"
        ? { versionPublishers: { some: {} } }
        : { boardGames: { some: { role } } },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return [...new Set(contributors.map((c) => c.name))];
}

/** Legt einen Mitwirkenden ohne `bggId` an, falls der Name noch nicht
 * existiert — für den "+"-Button im Spiel-Editor bei unbekannten Namen. Die
 * passende Rolle ergibt sich erst beim Speichern des Titels über die
 * `BoardGameContributor`-Verknüpfung, hier wird nur der Stammdatensatz
 * angelegt. */
export async function createContributor(name: string) {
  const user = await requireGamesManagePermission();
  if (!user) return { error: "Keine Berechtigung." };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Bitte einen Namen angeben." };

  const normalizedName = normalizeTaxonomyName(trimmed);
  const dedupKey = taxonomyDedupKey(null, normalizedName);
  const existing = await prisma.contributor.findUnique({ where: { dedupKey } });
  if (existing) return { success: true as const };

  await prisma.contributor.create({
    data: { name: trimmed, normalizedName, dedupKey },
  });
  return { success: true as const };
}
