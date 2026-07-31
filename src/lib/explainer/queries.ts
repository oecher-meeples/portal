import type { ExplainerExperienceLevel } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";

export type ExplainerEntry = {
  meepleId: string;
  displayName: string;
  level: ExplainerExperienceLevel;
};

/** Erklärbären for one Spiel, sorted by name — used on the Ludothek detail page. */
export async function getExplainersForGame(
  boardGameId: string,
): Promise<ExplainerEntry[]> {
  const entries = await prisma.explainerGame.findMany({
    where: { boardGameId },
    orderBy: { meeple: { displayName: "asc" } },
    include: { meeple: { select: { id: true, displayName: true } } },
  });

  return entries.map((entry) => ({
    meepleId: entry.meeple.id,
    displayName: entry.meeple.displayName,
    level: entry.level,
  }));
}
