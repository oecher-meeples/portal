"use server";

import { prisma } from "@/lib/utils/prisma";
import { resolveScannedCode } from "@/lib/ludothek/holdings";
import {
  getAttendingExplainers,
  isGameInEventRoom,
} from "@/lib/events/guest-area";
import { isEventCurrentlyRunning } from "@/lib/events/upcoming";

export type GuestGameMatch = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
};

export type GuestGameLookupResult =
  { kind: "games"; games: GuestGameMatch[] } | { kind: "unknown" };

/**
 * Unauthenticated EAN lookup for the guest area (ADR 0005) — reuses the same
 * scan resolution as the internal scan, but only ever surfaces game matches,
 * never storage-unit contents (that's an internal concept guests don't see).
 */
export async function lookupGuestGame(
  raw: string,
): Promise<GuestGameLookupResult> {
  const resolved = await resolveScannedCode(raw);

  if (resolved.kind !== "games") {
    return { kind: "unknown" };
  }

  return {
    kind: "games",
    games: resolved.games.map((game) => ({
      id: game.id,
      slug: game.slug,
      title: game.boardGame.title,
      imageUrl: game.boardGame.imageUrl,
    })),
  };
}

export type GuestGameDetail = {
  id: string;
  title: string;
  imageUrl: string | null;
  description: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  explainerVideoUrl: string | null;
  isInRoom: boolean;
  attendingExplainers: {
    meepleId: string;
    displayName: string;
    level: string;
  }[];
};

export async function getGuestGameDetail(
  eventId: string,
  gameCopyId: string,
): Promise<GuestGameDetail | null> {
  if (!(await isEventCurrentlyRunning(eventId))) return null;

  const copy = await prisma.gameCopy.findUnique({
    where: { id: gameCopyId },
    include: { boardGame: true },
  });
  if (!copy) return null;

  const [isInRoom, attendingExplainers] = await Promise.all([
    isGameInEventRoom(copy.id, eventId),
    getAttendingExplainers(copy.boardGameId, eventId),
  ]);

  return {
    id: copy.id,
    title: copy.boardGame.title,
    imageUrl: copy.boardGame.imageUrl,
    description: copy.boardGame.description,
    minPlayers: copy.boardGame.minPlayers,
    maxPlayers: copy.boardGame.maxPlayers,
    playTimeMinutes: copy.boardGame.playTimeMinutes,
    explainerVideoUrl: copy.boardGame.explainerVideoUrl,
    isInRoom,
    attendingExplainers,
  };
}
