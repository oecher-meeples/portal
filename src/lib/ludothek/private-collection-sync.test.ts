import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getCurrentMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", () => ({
  getCurrentMeeple: () => getCurrentMeepleMock(),
}));

const fetchBggCollectionMock = vi.fn();
vi.mock("@/lib/bgg/collection", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bgg/collection")>(
    "@/lib/bgg/collection",
  );
  return {
    ...actual,
    fetchBggCollection: (...args: unknown[]) => fetchBggCollectionMock(...args),
  };
});

const findOrCreateBoardGameTitleMock = vi.fn();
vi.mock("@/lib/ludothek/board-games", () => ({
  findOrCreateBoardGameTitle: (...args: unknown[]) =>
    findOrCreateBoardGameTitleMock(...args),
}));

const { syncPrivateBggCollection } = await import("./private-collection-sync");
const { BggCollectionUnavailableError } = await import("@/lib/bgg/collection");

const MEEPLE = { id: "meeple-1", bggUsername: "lea_bgg" };

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentMeepleMock.mockResolvedValue(MEEPLE);
});

describe("syncPrivateBggCollection (#255)", () => {
  it("rejects when not logged in", async () => {
    getCurrentMeepleMock.mockResolvedValue(null);

    const result = await syncPrivateBggCollection();

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(fetchBggCollectionMock).not.toHaveBeenCalled();
  });

  it("rejects when no bggUsername is set", async () => {
    getCurrentMeepleMock.mockResolvedValue({
      id: "meeple-1",
      bggUsername: null,
    });

    const result = await syncPrivateBggCollection();

    expect(result).toEqual({
      error: "Bitte zuerst einen BGG-Benutzernamen im Profil hinterlegen.",
    });
  });

  it("surfaces a friendly error when the collection is unavailable", async () => {
    fetchBggCollectionMock.mockRejectedValue(
      new BggCollectionUnavailableError("lea_bgg"),
    );

    const result = await syncPrivateBggCollection();

    expect(result).toEqual({
      error: expect.stringContaining("lea_bgg"),
    });
  });

  it("resolves each title via findOrCreateBoardGameTitle and upserts a collection entry (existing title)", async () => {
    fetchBggCollectionMock.mockResolvedValue([{ bggId: 13, title: "Catan" }]);
    findOrCreateBoardGameTitleMock.mockResolvedValue({ id: "game-1" });

    const result = await syncPrivateBggCollection();

    expect(findOrCreateBoardGameTitleMock).toHaveBeenCalledWith({
      title: "Catan",
      bggId: 13,
    });
    expect(prismaMock.privateGameCollectionEntry.upsert).toHaveBeenCalledWith({
      where: {
        meepleId_boardGameId: { meepleId: "meeple-1", boardGameId: "game-1" },
      },
      update: { syncedAt: expect.any(Date) },
      create: {
        meepleId: "meeple-1",
        boardGameId: "game-1",
        syncedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({ success: true, imported: 1 });
  });

  it("does not create a GameCopy for imported titles", async () => {
    fetchBggCollectionMock.mockResolvedValue([{ bggId: 13, title: "Catan" }]);
    findOrCreateBoardGameTitleMock.mockResolvedValue({ id: "game-1" });

    await syncPrivateBggCollection();

    expect(prismaMock.gameCopy.create).not.toHaveBeenCalled();
  });
});
