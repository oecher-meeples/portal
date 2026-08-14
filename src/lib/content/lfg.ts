import { prisma } from "@/lib/utils/prisma";

export type LfgStatus = "offen" | "voll" | "abgelaufen" | "geschlossen";

export function isLfgExpired(
  post: { plannedAt: Date | null },
  now: Date = new Date(),
) {
  return post.plannedAt !== null && post.plannedAt.getTime() < now.getTime();
}

export function getLfgStatus(
  post: {
    maxParticipants: number;
    plannedAt: Date | null;
    closedAt: Date | null;
  },
  participantCount: number,
  now: Date = new Date(),
): LfgStatus {
  if (post.closedAt) return "geschlossen";
  if (isLfgExpired(post, now)) return "abgelaufen";
  if (participantCount >= post.maxParticipants) return "voll";
  return "offen";
}

/** Anzeigename eines Teilnehmenden — für anonyme Gäste (#145) immer generiert
 * aus dem Namen, der sie hinzugefügt hat, nie Freitext. */
export function getLfgParticipantDisplayName(participant: {
  meepleId: string | null;
  meepleDisplayName?: string | null;
  addedByDisplayName: string;
}): string {
  if (participant.meepleId === null) {
    return `Gast von ${participant.addedByDisplayName}`;
  }
  return participant.meepleDisplayName ?? "";
}

export type OpenLfgPostForBoardGame = {
  id: string;
  title: string;
  dateNote: string | null;
  plannedAt: Date | null;
  location: string | null;
  maxParticipants: number;
  participantCount: number;
};

/** Open (see {@link getLfgStatus}) Gesuche linked to a board game — for the
 * "Offene Gesuche" section on the game detail page (#34). */
export async function getOpenLfgPostsForBoardGame(
  boardGameId: string,
): Promise<OpenLfgPostForBoardGame[]> {
  const posts = await prisma.lfgPost.findMany({
    where: { boardGameId, closedAt: null },
    include: { _count: { select: { participants: true } } },
    orderBy: { createdAt: "desc" },
  });

  return posts
    .filter((post) => getLfgStatus(post, post._count.participants) === "offen")
    .map((post) => ({
      id: post.id,
      title: post.title,
      dateNote: post.dateNote,
      plannedAt: post.plannedAt,
      location: post.location,
      maxParticipants: post.maxParticipants,
      participantCount: post._count.participants,
    }));
}

/** Board game ids with at least one open (see {@link getLfgStatus}) Gesuch —
 * batched for the Ludothek "Zeige nur Spielergesuche"-Filter (#144), no new
 * status concept, reuses `getLfgStatus` like `getOpenLfgPostsForBoardGame`. */
export async function getBoardGameIdsWithOpenLfgPosts(
  boardGameIds: string[],
): Promise<Set<string>> {
  if (boardGameIds.length === 0) return new Set();

  const posts = await prisma.lfgPost.findMany({
    where: {
      boardGameId: { in: boardGameIds },
      closedAt: null,
    },
    include: { _count: { select: { participants: true } } },
  });

  return new Set(
    posts
      .filter((post) => getLfgStatus(post, post._count.participants) === "offen")
      .map((post) => post.boardGameId)
      .filter((id): id is string => id !== null),
  );
}
