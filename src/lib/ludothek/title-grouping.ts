import type { GameZustand } from "@/lib/ludothek/holdings";

/** Best-Zustand-Priorität für die aggregierte Titel-Pille (Plan-Schritt 8):
 * "frei" schlägt "ausgeliehen" schlägt "wartung" schlägt "nicht-erfasst" —
 * ein Titel gilt als frei, sobald irgendein Exemplar frei ist. */
const ZUSTAND_PRIORITY: Record<GameZustand, number> = {
  frei: 0,
  ausgeliehen: 1,
  wartung: 2,
  "nicht-erfasst": 3,
};

export type LudothekTitleGroup<
  G extends { id: string; boardGameId: string; zustand?: GameZustand },
> = G & {
  /** Number of physical copies of this title in the (already filtered) input. */
  copyCount: number;
  /** GameCopy ids of every copy folded into this row — needed once actions
   * (Schritt 10–12) must pick one of several exemplare. */
  copyIds: string[];
};

/**
 * Groups per-copy rows into one row per title (Plan-Schritt 8) — Grid,
 * Liste and Kompakt all render one card/row per `boardGameId` instead of one
 * per `GameCopy`. Titles keep the order of their first-seen copy. Because
 * the input is already filtered per copy, a title survives here exactly
 * when at least one of its copies matched the active filters — the "any
 * exemplar matches" rule falls out for free.
 *
 * Guest rows (`PublicLudothekGame`) have no `zustand` at all — the
 * representative copy is then just the first one, no priority to compare.
 */
export function groupGamesByTitle<
  G extends { id: string; boardGameId: string; zustand?: GameZustand },
>(games: G[]): LudothekTitleGroup<G>[] {
  const byTitle = new Map<string, G[]>();
  for (const game of games) {
    const existing = byTitle.get(game.boardGameId);
    if (existing) existing.push(game);
    else byTitle.set(game.boardGameId, [game]);
  }

  return [...byTitle.values()].map((copies) => {
    const representative = copies.reduce((best, candidate) => {
      if (best.zustand === undefined || candidate.zustand === undefined) {
        return best;
      }
      return ZUSTAND_PRIORITY[candidate.zustand] <
        ZUSTAND_PRIORITY[best.zustand]
        ? candidate
        : best;
    });
    return {
      ...representative,
      copyCount: copies.length,
      copyIds: copies.map((c) => c.id),
    };
  });
}
