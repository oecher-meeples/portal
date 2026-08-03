import {
  matchesDurationFilter,
  matchesPlayerFilter,
  type DurationFilter,
  type PlayerCountFilter,
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
  title: string;
  imageUrl: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  meepleId: string;
  meeple: { displayName: string };
};

/**
 * Internal-only crowdsourced results from members' private collections — never
 * fed through `toPublicGame`, never rendered in the guest area (see CONTEXT.md).
 */
export function buildPrivateCollectionResults(
  entries: PrivateCollectionEntryInput[],
  filters: { players?: PlayerCountFilter; duration?: DurationFilter },
): PrivateCollectionResult[] {
  return entries
    .filter((entry) => !filters.players || matchesPlayerFilter(entry, filters.players))
    .filter(
      (entry) => !filters.duration || matchesDurationFilter(entry, filters.duration),
    )
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      imageUrl: entry.imageUrl,
      minPlayers: entry.minPlayers,
      maxPlayers: entry.maxPlayers,
      playTimeMinutes: entry.playTimeMinutes,
      ownerMeepleId: entry.meepleId,
      ownerDisplayName: entry.meeple.displayName,
    }));
}
