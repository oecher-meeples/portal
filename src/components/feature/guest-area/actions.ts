"use server";

import { prisma } from "@/lib/prisma";
import { resolveScannedCode } from "@/lib/ludothek/holdings";
import {
  getAttendingExplainers,
  isGameInEventRoom,
} from "@/lib/events/guest-area";

export type GuestGameMatch = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
};

export type GuestGameLookupResult =
  | { kind: "games"; games: GuestGameMatch[] }
  | { kind: "unknown" };

/**
 * Unauthenticated EAN lookup for the guest area (ADR 0005) — reuses the same
 * scan resolution as the internal scan, but only ever surfaces game matches,
 * never storage-unit contents (that's an internal concept guests don't see).
 */
export async function lookupGuestGame(raw: string): Promise<GuestGameLookupResult> {
  const resolved = await resolveScannedCode(raw);

  if (resolved.kind !== "games") {
    return { kind: "unknown" };
  }

  return {
    kind: "games",
    games: resolved.games.map((game) => ({
      id: game.id,
      slug: game.slug,
      title: game.title,
      imageUrl: game.imageUrl,
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
  boardGameId: string,
): Promise<GuestGameDetail | null> {
  const game = await prisma.boardGame.findUnique({ where: { id: boardGameId } });
  if (!game) return null;

  const [isInRoom, attendingExplainers] = await Promise.all([
    isGameInEventRoom(boardGameId, eventId),
    getAttendingExplainers(boardGameId, eventId),
  ]);

  return {
    id: game.id,
    title: game.title,
    imageUrl: game.imageUrl,
    description: game.description,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    playTimeMinutes: game.playTimeMinutes,
    explainerVideoUrl: game.explainerVideoUrl,
    isInRoom,
    attendingExplainers,
  };
}
