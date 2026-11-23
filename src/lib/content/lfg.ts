import { prisma } from "@/lib/utils/prisma";
import { firstString } from "@/lib/utils/search-params";

export type LfgStatus = "offen" | "voll" | "abgelaufen" | "geschlossen";

export function isLfgExpired(
  post: { plannedAt: Date | null },
  now: Date = new Date(),
) {
  return post.plannedAt !== null && post.plannedAt.getTime() < now.getTime();
}

function stripToDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Zeitraum-Filter der LFG-Übersicht (#409) — bewusst getrennt von
 * `isLfgExpired()` (Status-Badge, exakter Zeitstempel-Vergleich): weil
 * `LfgPost.plannedAt` keine verlässliche Uhrzeit trägt, gilt ein für
 * *heute* geplantes Gesuch hier unabhängig vom gewählten Zustand als
 * "Abgelaufen" **und** als "Bevorstehend" — es wird durch diesen Filter nie
 * versteckt. Ohne Termin (`plannedAt === null`, "Termin offen") gilt nur als
 * "bevorstehend". */
export type LfgTimeframe = "abgelaufen" | "bevorstehend";

export function matchesLfgTimeframeFilter(
  post: { plannedAt: Date | null },
  timeframe: LfgTimeframe,
  now: Date = new Date(),
): boolean {
  if (post.plannedAt === null) return timeframe === "bevorstehend";

  const postDay = stripToDay(post.plannedAt);
  const today = stripToDay(now);
  if (postDay.getTime() === today.getTime()) return true;

  return timeframe === "abgelaufen" ? postDay < today : postDay > today;
}

/** Datei-Upload/-Download-Bereich (#283) — bewusst getrennt von
 * `isLfgExpired()` (Status-Badge, exakter Zeitstempel-Vergleich): der
 * Upload-Bereich erscheint, wenn `plannedAt`-Kalendertag ≤ heutiger
 * Kalendertag, unabhängig davon, ob `getLfgStatus()` das Gesuch noch als
 * "offen" oder schon als "abgelaufen" einstuft. Ohne Termin (`plannedAt ===
 * null`, "Termin offen") nie eligible — es gibt keinen Tag, den man mit
 * heute vergleichen könnte. */
export function isLfgAttachmentEligible(
  post: { plannedAt: Date | null },
  now: Date = new Date(),
): boolean {
  if (post.plannedAt === null) return false;
  return stripToDay(post.plannedAt).getTime() <= stripToDay(now).getTime();
}

/** Filter der LFG-Übersicht (#409), URL-Search-Param-basiert analog
 * `LudothekFilters`/`parseLudothekSearchParams`. */
export type LfgListFilters = {
  /** Spiel-Autocomplete — matcht `LfgPost.boardGameId` exakt. */
  boardGameId?: string;
  /** "Frei"/"Voll" — unabhängig vom Zeitraum-Filter, nutzt `getLfgStatus()`. */
  status?: "frei" | "voll";
  zeitraum?: LfgTimeframe;
};

export function parseLfgSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): LfgListFilters {
  const status = firstString(searchParams.status);
  const zeitraum = firstString(searchParams.zeitraum);
  return {
    boardGameId: firstString(searchParams.spiel) || undefined,
    status: status === "frei" || status === "voll" ? status : undefined,
    zeitraum:
      zeitraum === "abgelaufen" || zeitraum === "bevorstehend"
        ? zeitraum
        : undefined,
  };
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
