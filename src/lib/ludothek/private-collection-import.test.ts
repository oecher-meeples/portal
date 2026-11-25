import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/utils/sleep", () => ({ sleep: () => Promise.resolve() }));

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

const fetchBggGameMock = vi.fn();
vi.mock("@/lib/bgg/client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/bgg/client")>(
      "@/lib/bgg/client",
    );
  return {
    ...actual,
    fetchBggGame: (...args: unknown[]) => fetchBggGameMock(...args),
  };
});

const findOrCreateBoardGameTitleMock = vi.fn();
vi.mock("@/lib/ludothek/board-games", () => ({
  findOrCreateBoardGameTitle: (...args: unknown[]) =>
    findOrCreateBoardGameTitleMock(...args),
}));

vi.mock("@/lib/ludothek/board-game-versions", () => ({
  bggDataToTitleInput: (bggId: number, data: unknown) => ({
    bggId,
    ...(data as object),
  }),
  toBoardGameTitleData: (input: unknown) => input,
  versionInputFromBgg: (version: unknown) => ({ fromBgg: version }),
}));

const upsertBoardGameVersionMock = vi.fn();
vi.mock("@/lib/ludothek/taxonomy/versions", () => ({
  upsertBoardGameVersion: (...args: unknown[]) =>
    upsertBoardGameVersionMock(...args),
}));

const translateBggGameDataMock = vi.fn();
vi.mock("@/lib/ludothek/board-games-bgg-import", () => ({
  translateBggGameData: (...args: unknown[]) =>
    translateBggGameDataMock(...args),
}));

const { runBggCollectionImport } = await import("./private-collection-import");
const { BggCollectionUnavailableError } = await import("@/lib/bgg/collection");
const { BggNotFoundError } = await import("@/lib/bgg/client");

const MEEPLE = {
  id: "meeple-1",
  bggUsername: "lea_bgg",
  neonAuthUserId: "user-1",
  privateCollectionSyncedAt: null,
};

beforeEach(() => {
  prismaMock.$transaction.mockImplementation(((
    fn: (tx: typeof prismaMock) => unknown,
  ) => fn(prismaMock)) as never);
  vi.clearAllMocks();
  prismaMock.role.count.mockResolvedValue(0);
  // Default: title not yet in the catalog — most tests exercise the "new
  // title" path unless they explicitly configure an existing one.
  prismaMock.boardGame.findUnique.mockResolvedValue(null);
  // Default: pass the raw fetched data through untranslated — individual
  // tests only care that it's forwarded, not about the translation itself.
  translateBggGameDataMock.mockImplementation((data: unknown) =>
    Promise.resolve({ data, descriptionTranslationFailed: false }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("runBggCollectionImport (#255, #632)", () => {
  it("surfaces a friendly error when the collection is unavailable", async () => {
    fetchBggCollectionMock.mockRejectedValue(
      new BggCollectionUnavailableError("lea_bgg"),
    );

    const result = await runBggCollectionImport(MEEPLE);

    expect(result).toEqual({
      error: expect.stringContaining("lea_bgg"),
    });
  });

  it("reuses an already-catalogued title without an extra BGG fetch", async () => {
    fetchBggCollectionMock.mockResolvedValue([
      {
        bggId: 13,
        title: "Catan",
        rating: 8,
        forTrade: true,
        wantToPlay: false,
      },
    ]);
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "game-1",
      description: "Siedeln",
      minPlayers: 3,
      maxPlayers: 4,
    } as never);

    const result = await runBggCollectionImport(MEEPLE);

    expect(fetchBggGameMock).not.toHaveBeenCalled();
    expect(findOrCreateBoardGameTitleMock).not.toHaveBeenCalled();
    expect(
      prismaMock.privateGameCollectionEntry.deleteMany,
    ).toHaveBeenCalledWith({ where: { meepleId: "meeple-1" } });
    expect(prismaMock.privateGameCollectionEntry.create).toHaveBeenCalledWith({
      data: {
        meepleId: "meeple-1",
        boardGameId: "game-1",
        versionId: null,
        syncedAt: expect.any(Date),
        rating: 8,
        forTrade: true,
        wantToPlay: false,
      },
    });
    expect(result).toEqual({ success: true, imported: 1 });
  });

  it("fetches full BGG metadata for a genuinely new title, same as a club import", async () => {
    fetchBggCollectionMock.mockResolvedValue([
      {
        bggId: 316554,
        title: "Ark Nova",
        rating: null,
        forTrade: false,
        wantToPlay: true,
      },
    ]);
    fetchBggGameMock.mockResolvedValue({
      title: "Ark Nova",
      minPlayers: 1,
      maxPlayers: 4,
      mechanics: ["Engine Building"],
    });
    findOrCreateBoardGameTitleMock.mockResolvedValue({ id: "game-2" });

    const result = await runBggCollectionImport(MEEPLE);

    expect(fetchBggGameMock).toHaveBeenCalledWith(316554);
    expect(findOrCreateBoardGameTitleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bggId: 316554,
        title: "Ark Nova",
        mechanics: ["Engine Building"],
      }),
    );
    expect(prismaMock.privateGameCollectionEntry.create).toHaveBeenCalledWith({
      data: {
        meepleId: "meeple-1",
        boardGameId: "game-2",
        versionId: null,
        syncedAt: expect.any(Date),
        rating: null,
        forTrade: false,
        wantToPlay: true,
      },
    });
    expect(result).toEqual({ success: true, imported: 1 });
  });

  it("falls back to title + bggId when the single-item BGG fetch fails, without aborting the import", async () => {
    fetchBggCollectionMock.mockResolvedValue([
      {
        bggId: 13,
        title: "Catan",
        rating: null,
        forTrade: false,
        wantToPlay: false,
      },
    ]);
    fetchBggGameMock.mockRejectedValue(new BggNotFoundError(13));
    findOrCreateBoardGameTitleMock.mockResolvedValue({ id: "game-1" });

    const result = await runBggCollectionImport(MEEPLE);

    expect(findOrCreateBoardGameTitleMock).toHaveBeenCalledWith({
      title: "Catan",
      bggId: 13,
    });
    expect(result).toEqual({ success: true, imported: 1 });
  });

  it("repairs a previously incomplete stub (failed earlier import) instead of leaving it empty (#278)", async () => {
    fetchBggCollectionMock.mockResolvedValue([
      {
        bggId: 420805,
        title: "Black Forest",
        rating: null,
        forTrade: false,
        wantToPlay: false,
      },
    ]);
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "game-3",
      title: "Black Forest",
      imageUrl: null,
      description: null,
      minPlayers: null,
      maxPlayers: null,
    } as never);
    fetchBggGameMock.mockResolvedValue({
      title: "Black Forest",
      minPlayers: 1,
      maxPlayers: 4,
      mechanics: ["Worker Placement"],
    });
    findOrCreateBoardGameTitleMock.mockResolvedValue({ id: "game-3" });

    const result = await runBggCollectionImport(MEEPLE);

    expect(fetchBggGameMock).toHaveBeenCalledWith(420805);
    // Die Aufwertung des Stubs übernimmt `findOrCreateBoardGameTitle`.
    expect(findOrCreateBoardGameTitleMock).toHaveBeenCalledWith(
      expect.objectContaining({ minPlayers: 1, maxPlayers: 4 }),
    );
    expect(result).toEqual({ success: true, imported: 1 });
  });

  it("keeps the existing stub when the repair fetch fails again", async () => {
    fetchBggCollectionMock.mockResolvedValue([
      {
        bggId: 420805,
        title: "Black Forest",
        rating: null,
        forTrade: false,
        wantToPlay: false,
      },
    ]);
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "game-3",
      title: "Black Forest",
      imageUrl: null,
      description: null,
      minPlayers: null,
      maxPlayers: null,
    } as never);
    fetchBggGameMock.mockRejectedValue(new BggNotFoundError(420805));

    const result = await runBggCollectionImport(MEEPLE);

    expect(prismaMock.boardGame.update).not.toHaveBeenCalled();
    expect(prismaMock.privateGameCollectionEntry.create).toHaveBeenCalledWith({
      data: {
        meepleId: "meeple-1",
        boardGameId: "game-3",
        versionId: null,
        syncedAt: expect.any(Date),
        rating: null,
        forTrade: false,
        wantToPlay: false,
      },
    });
    expect(result).toEqual({ success: true, imported: 1 });
  });

  it("stores the version chosen on BGG with its publishers and links the entry to it", async () => {
    const version = {
      bggVersionId: 278264,
      name: "English first edition",
      yearPublished: 2017,
      publisher: ["Serious Poulp"],
      publisherLinks: [{ bggId: 17654, name: "Serious Poulp" }],
      productCode: null,
      languages: ["English"],
    };
    fetchBggCollectionMock.mockResolvedValue([
      {
        bggId: 180263,
        title: "The 7th Continent",
        rating: null,
        forTrade: false,
        wantToPlay: false,
        version,
      },
    ]);
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "game-1",
    } as never);
    upsertBoardGameVersionMock.mockResolvedValue({ id: "version-1" });

    await runBggCollectionImport(MEEPLE);

    expect(upsertBoardGameVersionMock).toHaveBeenCalledWith(
      prismaMock,
      "game-1",
      { fromBgg: version },
    );
    expect(prismaMock.privateGameCollectionEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ versionId: "version-1" }),
    });
  });

  it("does not create a GameCopy for imported titles", async () => {
    fetchBggCollectionMock.mockResolvedValue([
      {
        bggId: 13,
        title: "Catan",
        rating: null,
        forTrade: false,
        wantToPlay: false,
      },
    ]);
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "game-1",
    } as never);

    await runBggCollectionImport(MEEPLE);

    expect(prismaMock.gameCopy.create).not.toHaveBeenCalled();
  });
});
