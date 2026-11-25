import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { findSharedCollectionMeeples } =
  await import("./shared-collection-meeples");

function row(id: string, displayName: string) {
  return {
    meeple: {
      id,
      displayName,
      profilePictureUrl: null,
      profilePictureVisibility: "INTERN",
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.privateGameCollectionEntry.findMany.mockResolvedValue([]);
  prismaMock.gameWantToPlay.findMany.mockResolvedValue([]);
});

describe("findSharedCollectionMeeples (#637)", () => {
  it("liest Want to Play nur aus game_want_to_play, ohne Freigabe-Filter", async () => {
    prismaMock.gameWantToPlay.findMany.mockResolvedValue([
      row("m2", "Zoe"),
      row("m1", "Anna"),
    ] as never);

    const result = await findSharedCollectionMeeples("game-1", "wantToPlay");

    expect(prismaMock.gameWantToPlay.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { boardGameId: "game-1", meeple: { anonymizedAt: null } },
      }),
    );
    expect(
      prismaMock.privateGameCollectionEntry.findMany,
    ).not.toHaveBeenCalled();
    expect(result.map((m) => m.name)).toEqual(["Anna", "Zoe"]);
    expect(result[0]).toMatchObject({ meepleId: "m1" });
  });

  it("fragt For Trade mit Freigabe an", async () => {
    prismaMock.privateGameCollectionEntry.findMany.mockResolvedValue([
      row("m2", "Zoe"),
      row("m1", "Anna"),
    ] as never);

    const result = await findSharedCollectionMeeples("game-1", "forTrade");

    expect(prismaMock.privateGameCollectionEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          boardGameId: "game-1",
          forTrade: true,
          meeple: { shareForTrade: true, anonymizedAt: null },
        },
      }),
    );
    expect(prismaMock.gameWantToPlay.findMany).not.toHaveBeenCalled();
    expect(result.map((m) => m.name)).toEqual(["Anna", "Zoe"]);
  });
});

describe("findWantToPlayCatalogTitle (#637)", () => {
  it("sucht nur Titel mit Want-to-Play-Eintrag eines nicht anonymisierten Meeples", async () => {
    const { findWantToPlayCatalogTitle } =
      await import("./shared-collection-meeples");
    prismaMock.boardGame.findFirst.mockResolvedValue(null);

    expect(await findWantToPlayCatalogTitle("wunschspiel")).toBeNull();
    expect(prismaMock.boardGame.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: "wunschspiel",
          wantToPlayMarks: { some: { meeple: { anonymizedAt: null } } },
        },
      }),
    );
  });
});
