import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/members/meeples", () => ({
  requireMeeple: async () => ({ id: "meeple-1" }),
}));
vi.mock("@/lib/ludothek/private-event-loans", () => ({
  offerPrivateGameForEvent: vi.fn(),
  withdrawPrivateGameOffer: vi.fn(),
}));

const {
  removePrivateCollectionEntryAction,
  setPrivateCollectionEntryFlagAction,
} = await import("./private-collection-actions");

beforeEach(() => vi.clearAllMocks());

describe("removePrivateCollectionEntryAction", () => {
  it("only deletes entries of the current meeple", async () => {
    const result = await removePrivateCollectionEntryAction("entry-1");

    expect(result).toEqual({ success: true });
    expect(
      prismaMock.privateGameCollectionEntry.deleteMany,
    ).toHaveBeenCalledWith({ where: { id: "entry-1", meepleId: "meeple-1" } });
  });
});

describe("setPrivateCollectionEntryFlagAction", () => {
  it("sets forTrade on an own entry", async () => {
    await setPrivateCollectionEntryFlagAction("entry-1", "forTrade", true);

    expect(
      prismaMock.privateGameCollectionEntry.updateMany,
    ).toHaveBeenCalledWith({
      where: { id: "entry-1", meepleId: "meeple-1" },
      data: { forTrade: true },
    });
  });

  it("setzt wantToPlay in game_want_to_play über die boardGameId des eigenen Eintrags", async () => {
    prismaMock.privateGameCollectionEntry.findFirst.mockResolvedValue({
      boardGameId: "game-1",
    } as never);

    await setPrivateCollectionEntryFlagAction("entry-1", "wantToPlay", true);

    expect(
      prismaMock.privateGameCollectionEntry.findFirst,
    ).toHaveBeenCalledWith({
      where: { id: "entry-1", meepleId: "meeple-1" },
      select: { boardGameId: true },
    });
    expect(prismaMock.gameWantToPlay.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { meepleId: "meeple-1", boardGameId: "game-1" },
      }),
    );
    expect(
      prismaMock.privateGameCollectionEntry.updateMany,
    ).not.toHaveBeenCalled();
  });

  it("entfernt wantToPlay aus game_want_to_play", async () => {
    prismaMock.privateGameCollectionEntry.findFirst.mockResolvedValue({
      boardGameId: "game-1",
    } as never);

    await setPrivateCollectionEntryFlagAction("entry-1", "wantToPlay", false);

    expect(prismaMock.gameWantToPlay.deleteMany).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1", boardGameId: "game-1" },
    });
  });

  it("lehnt wantToPlay für einen fremden Eintrag ab", async () => {
    prismaMock.privateGameCollectionEntry.findFirst.mockResolvedValue(null);

    const result = await setPrivateCollectionEntryFlagAction(
      "foreign",
      "wantToPlay",
      true,
    );

    expect(result).toEqual({ error: "Eintrag nicht gefunden." });
    expect(prismaMock.gameWantToPlay.upsert).not.toHaveBeenCalled();
  });

  it("rejects an unknown flag name", async () => {
    const result = await setPrivateCollectionEntryFlagAction(
      "entry-1",
      "rating" as never,
      true,
    );

    expect(result).toEqual({ error: "Ungültige Markierung." });
    expect(
      prismaMock.privateGameCollectionEntry.updateMany,
    ).not.toHaveBeenCalled();
  });
});
