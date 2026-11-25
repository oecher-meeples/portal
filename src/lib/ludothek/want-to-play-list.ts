import { prisma } from "@/lib/utils/prisma";

export const WANT_TO_PLAY_PAGE_SIZE = 25;

export type WantToPlayCursor = { title: string; id: string };

export type WantToPlayItem = {
  /** Id des `GameWantToPlay`-Eintrags — Teil des Cursors. */
  id: string;
  boardGameId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
};

export type WantToPlayPage = {
  items: WantToPlayItem[];
  nextCursor: WantToPlayCursor | null;
};

/** Seite der Want-to-Play-Liste eines Meeples (#637), nach Titel sortiert,
 * Cursor `(Titel, Id)` — stabil auch bei gleichen Titeln und beim Entfernen
 * einzelner Einträge zwischen zwei Nachlade-Schritten. */
export async function listWantToPlay(
  meepleId: string,
  {
    after,
    take = WANT_TO_PLAY_PAGE_SIZE,
  }: { after?: WantToPlayCursor | null; take?: number } = {},
): Promise<WantToPlayPage> {
  const rows = await prisma.gameWantToPlay.findMany({
    where: {
      meepleId,
      ...(after && {
        OR: [
          { boardGame: { title: { gt: after.title } } },
          { boardGame: { title: after.title }, id: { gt: after.id } },
        ],
      }),
    },
    orderBy: [{ boardGame: { title: "asc" } }, { id: "asc" }],
    take: take + 1,
    select: {
      id: true,
      boardGame: {
        select: { id: true, slug: true, title: true, imageUrl: true },
      },
    },
  });

  const items = rows.slice(0, take).map(({ id, boardGame }) => ({
    id,
    boardGameId: boardGame.id,
    slug: boardGame.slug,
    title: boardGame.title,
    imageUrl: boardGame.imageUrl,
  }));
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      rows.length > take && last ? { title: last.title, id: last.id } : null,
  };
}

export function countWantToPlay(meepleId: string) {
  return prisma.gameWantToPlay.count({ where: { meepleId } });
}

/** Entfernt nur Einträge des übergebenen Meeples — fremde Einträge bleiben. */
export async function removeWantToPlay(meepleId: string, boardGameId: string) {
  await prisma.gameWantToPlay.deleteMany({ where: { meepleId, boardGameId } });
}

export async function clearWantToPlay(meepleId: string) {
  await prisma.gameWantToPlay.deleteMany({ where: { meepleId } });
}

/** Eigene „Want to Play"-Markierung setzen (idempotent) oder entfernen. */
export async function setWantToPlayMark(
  meepleId: string,
  boardGameId: string,
  marked: boolean,
) {
  if (marked) {
    await prisma.gameWantToPlay.upsert({
      where: { meepleId_boardGameId: { meepleId, boardGameId } },
      create: { meepleId, boardGameId },
      update: {},
    });
  } else {
    await removeWantToPlay(meepleId, boardGameId);
  }
}
