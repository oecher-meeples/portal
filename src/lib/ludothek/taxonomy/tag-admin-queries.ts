import type { TagType } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";

export type AdminTagRow = {
  id: string;
  type: TagType;
  /** BGG-Originalname, nicht umbenennbar. */
  name: string;
  displayName: string | null;
  bggId: number | null;
  titleCount: number;
};

export async function listTagsForAdmin(): Promise<AdminTagRow[]> {
  const rows = await prisma.tag.findMany({
    select: {
      id: true,
      type: true,
      name: true,
      displayName: true,
      bggId: true,
      _count: { select: { boardGames: true } },
    },
    orderBy: { name: "asc" },
  });

  return rows.map(({ _count, ...row }) => ({
    ...row,
    titleCount: _count.boardGames,
  }));
}
