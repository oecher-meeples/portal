import { describe, expect, it } from "vitest";
import { buildPrivateCollectionResults } from "./private-collection";

function entry(
  overrides: Partial<{
    id: string;
    title: string;
    imageUrl: string | null;
    minPlayers: number | null;
    maxPlayers: number | null;
    playTimeMinutes: number | null;
    meepleId: string;
    meeple: { displayName: string };
  }> = {},
) {
  const {
    title = "Dune: Imperium",
    imageUrl = null,
    minPlayers = 1,
    maxPlayers = 4,
    playTimeMinutes = 60,
    ...rest
  } = overrides;

  return {
    id: "entry-1",
    meepleId: "meeple-1",
    meeple: { displayName: "Lea Demo" },
    boardGame: { title, imageUrl, minPlayers, maxPlayers, playTimeMinutes },
    ...rest,
  };
}

describe("buildPrivateCollectionResults", () => {
  it("resolves the owner's display name", () => {
    const results = buildPrivateCollectionResults([entry()], {});

    expect(results).toEqual([
      {
        id: "entry-1",
        title: "Dune: Imperium",
        imageUrl: null,
        minPlayers: 1,
        maxPlayers: 4,
        playTimeMinutes: 60,
        ownerMeepleId: "meeple-1",
        ownerDisplayName: "Lea Demo",
      },
    ]);
  });

  it("filters by player count", () => {
    const solo = entry({ id: "solo", minPlayers: 1, maxPlayers: 1 });
    const party = entry({ id: "party", minPlayers: 5, maxPlayers: 8 });

    expect(
      buildPrivateCollectionResults([solo, party], { players: "1-2" }).map(
        (r) => r.id,
      ),
    ).toEqual(["solo"]);
    expect(
      buildPrivateCollectionResults([solo, party], { players: "5+" }).map(
        (r) => r.id,
      ),
    ).toEqual(["party"]);
  });

  it("filters by duration", () => {
    const short = entry({ id: "short", playTimeMinutes: 20 });
    const long = entry({ id: "long", playTimeMinutes: 180 });

    expect(
      buildPrivateCollectionResults([short, long], { duration: "short" }).map(
        (r) => r.id,
      ),
    ).toEqual(["short"]);
    expect(
      buildPrivateCollectionResults([short, long], { duration: "long" }).map(
        (r) => r.id,
      ),
    ).toEqual(["long"]);
  });

  it("returns everything when no filter is set", () => {
    const results = buildPrivateCollectionResults(
      [entry({ id: "a" }), entry({ id: "b" })],
      {},
    );

    expect(results.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
