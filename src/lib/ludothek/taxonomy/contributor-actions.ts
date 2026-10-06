"use server";

import type { ContributorRole } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";

export async function listContributorNames(
  role: ContributorRole,
): Promise<string[]> {
  const user = await requireGamesManagePermission();
  if (!user) return [];

  const contributors = await prisma.contributor.findMany({
    where: { boardGames: { some: { role } } },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return [...new Set(contributors.map((c) => c.name))];
}
