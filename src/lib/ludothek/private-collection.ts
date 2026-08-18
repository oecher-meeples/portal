import {
  matchesDurationRange,
  matchesPlayerCount,
} from "@/lib/ludothek/browser";

export type PrivateCollectionResult = {
  id: string;
  title: string;
  imageUrl: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  ownerMeepleId: string;
  ownerDisplayName: string;
};

export type PrivateCollectionEntryInput = {
  id: string;
  meepleId: string;
  meeple: { displayName: string };
  boardGame: {
    title: string;
    imageUrl: string | null;
    minPlayers: number | null;
    maxPlayers: number | null;
    playTimeMinutes: number | null;
  };
};

/**
 * Internal-only crowdsourced results from members' private collections — never
 * fed through `toPublicGame`, never rendered in the guest area (see CONTEXT.md).
 */
export function buildPrivateCollectionResults(
  entries: PrivateCollectionEntryInput[],
  filters: {
    players?: number;
    durationFrom?: number;
    durationTo?: number;
  },
): PrivateCollectionResult[] {
  return entries
    .filter((entry) => matchesPlayerCount(entry.boardGame, filters.players))
    .filter((entry) =>
      matchesDurationRange(
        entry.boardGame,
        filters.durationFrom,
        filters.durationTo,
      ),
    )
    .map((entry) => ({
      id: entry.id,
      title: entry.boardGame.title,
      imageUrl: entry.boardGame.imageUrl,
      minPlayers: entry.boardGame.minPlayers,
      maxPlayers: entry.boardGame.maxPlayers,
      playTimeMinutes: entry.boardGame.playTimeMinutes,
      ownerMeepleId: entry.meepleId,
      ownerDisplayName: entry.meeple.displayName,
    }));
}
