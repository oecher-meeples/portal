import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { findSharedCollectionMeeples, hasWantToPlayMark } =
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

describe("findSharedCollectionMeeples (#632-Folge)", () => {
  it("only asks for want-to-play entries of opted-in, non-anonymised meeples", async () => {
    await findSharedCollectionMeeples("game-1", "wantToPlay");

    expect(prismaMock.privateGameCollectionEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          boardGameId: "game-1",
          wantToPlay: true,
          meeple: { shareWantToPlay: true, anonymizedAt: null },
        },
      }),
    );
  });

  it("asks for the for-trade flag and opt-in when requested, without manual marks", async () => {
    await findSharedCollectionMeeples("game-1", "forTrade");

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
  });

  it("maps and sorts by name", async () => {
    prismaMock.privateGameCollectionEntry.findMany.mockResolvedValue([
      row("m2", "Zoe"),
      row("m1", "Anna"),
    ] as never);

    const result = await findSharedCollectionMeeples("game-1", "forTrade");

    expect(result.map((m) => m.name)).toEqual(["Anna", "Zoe"]);
    expect(result[0]).toMatchObject({ meepleId: "m1" });
  });

  it("adds manual want-to-play marks and lists a meeple only once", async () => {
    prismaMock.privateGameCollectionEntry.findMany.mockResolvedValue([
      row("m1", "Anna"),
    ] as never);
    prismaMock.gameWantToPlay.findMany.mockResolvedValue([
      row("m1", "Anna"),
      row("m3", "Ben"),
    ] as never);

    const result = await findSharedCollectionMeeples("game-1", "wantToPlay");

    expect(result.map((m) => m.name)).toEqual(["Anna", "Ben"]);
    expect(prismaMock.gameWantToPlay.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { boardGameId: "game-1", meeple: { anonymizedAt: null } },
      }),
    );
  });
});

describe("hasWantToPlayMark", () => {
  it("is true when a mark exists", async () => {
    prismaMock.gameWantToPlay.count.mockResolvedValue(1);
    expect(await hasWantToPlayMark("m1", "game-1")).toBe(true);
  });

  it("is false without a mark", async () => {
    prismaMock.gameWantToPlay.count.mockResolvedValue(0);
    expect(await hasWantToPlayMark("m1", "game-1")).toBe(false);
  });
});
