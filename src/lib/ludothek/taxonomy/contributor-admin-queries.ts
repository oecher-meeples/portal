import type { ContributorRole } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";

export type AdminContributorRow = {
  id: string;
  name: string;
  bggId: number | null;
  roles: ContributorRole[];
  titleCount: number;
};

export async function listContributorsForAdmin(): Promise<
  AdminContributorRow[]
> {
  const rows = await prisma.contributor.findMany({
    select: {
      id: true,
      name: true,
      bggId: true,
      boardGames: { select: { role: true, boardGameId: true } },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    bggId: row.bggId,
    roles: [...new Set(row.boardGames.map((link) => link.role))],
    titleCount: new Set(row.boardGames.map((link) => link.boardGameId)).size,
  }));
}
