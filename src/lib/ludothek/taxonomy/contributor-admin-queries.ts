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
      versionPublishers: {
        select: { version: { select: { boardGameId: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    bggId: row.bggId,
    roles: [
      ...new Set([
        ...row.boardGames.map((link) => link.role),
        ...(row.versionPublishers.length > 0 ? (["PUBLISHER"] as const) : []),
      ]),
    ],
    titleCount: new Set([
      ...row.boardGames.map((link) => link.boardGameId),
      ...row.versionPublishers.map((link) => link.version.boardGameId),
    ]).size,
  }));
}
