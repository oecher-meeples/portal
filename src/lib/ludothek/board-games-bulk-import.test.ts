import { afterEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

afterEach(() => {
  vi.clearAllMocks();
});

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/utils/sleep", () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
}));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

const searchBggGamesExactMock = vi.fn();
vi.mock("@/lib/bgg/client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/bgg/client")>(
      "@/lib/bgg/client",
    );
  return {
    ...actual,
    searchBggGamesExact: (...args: unknown[]) =>
      searchBggGamesExactMock(...args),
  };
});

const previewBggImportMock = vi.fn();
vi.mock("@/lib/ludothek/board-games-bgg-import", () => ({
  previewBggImport: (...args: unknown[]) => previewBggImportMock(...args),
}));

const createBoardGameMock = vi.fn();
vi.mock("@/lib/ludothek/board-games", () => ({
  createBoardGame: (...args: unknown[]) => createBoardGameMock(...args),
}));

const { sleep } = await import("@/lib/utils/sleep");
const { bulkImportBoardGames } = await import("./board-games-bulk-import");

const VALID_BGG_DATA = {
  title: "Ark Nova",
  minPlayers: 1,
  maxPlayers: 4,
  playTimeMinutes: 150,
  weight: 3.7,
  imageUrl: "https://cf.geekdo-images.com/full.jpg",
  description: "Baue einen modernen Zoo.",
  mechanics: ["Kartenspiel"],
  alternateNames: ["Ark Nova (Deutsch)"],
  explainerVideoUrl: null,
  germanExplainerVideos: [],
  englishExplainerVideos: [],
  author: [],
  yearPublished: null,
  versions: [],
};

function beforeEachSetup() {
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  prismaMock.rolePermission.count.mockResolvedValue(1);
  prismaMock.boardGame.findUnique.mockResolvedValue(null);
}

describe("bulkImportBoardGames", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await bulkImportBoardGames(["Ark Nova"]);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(searchBggGamesExactMock).not.toHaveBeenCalled();
  });

  it("imports a title with exactly one exact-search hit", async () => {
    beforeEachSetup();
    searchBggGamesExactMock.mockResolvedValue([
      { bggId: 342942, title: "Ark Nova", yearPublished: 2021 },
    ]);
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: VALID_BGG_DATA,
    });
    createBoardGameMock.mockResolvedValue({ success: true, id: "copy-1" });

    const result = await bulkImportBoardGames(["Ark Nova"]);

    expect(searchBggGamesExactMock).toHaveBeenCalledWith("Ark Nova");
    expect(previewBggImportMock).toHaveBeenCalledWith(342942);
    expect(createBoardGameMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Ark Nova",
        bggId: 342942,
        mechanics: ["Kartenspiel"],
        alternateNames: ["Ark Nova (Deutsch)"],
      }),
    );
    expect(result).toEqual({
      success: true,
      results: [
        {
          name: "Ark Nova",
          status: "imported",
          bggId: 342942,
          title: "Ark Nova",
        },
      ],
    });
  });

  it("puts a name with zero exact hits into the review list", async () => {
    beforeEachSetup();
    searchBggGamesExactMock.mockResolvedValue([]);

    const result = await bulkImportBoardGames(["Unbekanntes Spiel"]);

    expect(result).toEqual({
      success: true,
      results: [
        { name: "Unbekanntes Spiel", status: "needs-review", candidates: [] },
      ],
    });
    expect(previewBggImportMock).not.toHaveBeenCalled();
  });

  it("puts a name with multiple exact hits into the review list", async () => {
    beforeEachSetup();
    const candidates = [
      { bggId: 1, title: "Catan", yearPublished: 1995 },
      { bggId: 2, title: "Catan", yearPublished: 2015 },
    ];
    searchBggGamesExactMock.mockResolvedValue(candidates);

    const result = await bulkImportBoardGames(["Catan"]);

    expect(result).toEqual({
      success: true,
      results: [{ name: "Catan", status: "needs-review", candidates }],
    });
    expect(previewBggImportMock).not.toHaveBeenCalled();
  });

  it("skips a title whose bggId already exists in the Bestand", async () => {
    beforeEachSetup();
    searchBggGamesExactMock.mockResolvedValue([
      { bggId: 342942, title: "Ark Nova", yearPublished: 2021 },
    ]);
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "existing-1",
      title: "Ark Nova",
    } as never);

    const result = await bulkImportBoardGames(["Ark Nova"]);

    expect(result).toEqual({
      success: true,
      results: [
        {
          name: "Ark Nova",
          status: "skipped-duplicate",
          bggId: 342942,
          title: "Ark Nova",
        },
      ],
    });
    expect(previewBggImportMock).not.toHaveBeenCalled();
  });

  it("marks a row as failed when the BGG preview fails", async () => {
    beforeEachSetup();
    searchBggGamesExactMock.mockResolvedValue([
      { bggId: 342942, title: "Ark Nova", yearPublished: 2021 },
    ]);
    previewBggImportMock.mockResolvedValue({
      success: false,
      error: "BoardGameGeek ist aktuell nicht erreichbar.",
    });

    const result = await bulkImportBoardGames(["Ark Nova"]);

    expect(result).toEqual({
      success: true,
      results: [
        {
          name: "Ark Nova",
          status: "failed",
          error: "BoardGameGeek ist aktuell nicht erreichbar.",
        },
      ],
    });
    expect(createBoardGameMock).not.toHaveBeenCalled();
  });

  it("marks a row as failed when createBoardGame itself errors", async () => {
    beforeEachSetup();
    searchBggGamesExactMock.mockResolvedValue([
      { bggId: 342942, title: "Ark Nova", yearPublished: 2021 },
    ]);
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: VALID_BGG_DATA,
    });
    createBoardGameMock.mockResolvedValue({
      error: "Bitte einen Titel angeben.",
    });

    const result = await bulkImportBoardGames(["Ark Nova"]);

    expect(result).toEqual({
      success: true,
      results: [
        {
          name: "Ark Nova",
          status: "failed",
          error: "Bitte einen Titel angeben.",
        },
      ],
    });
  });

  it("processes multiple names sequentially, throttled via sleep() between BGG calls", async () => {
    beforeEachSetup();
    searchBggGamesExactMock.mockResolvedValue([]);

    await bulkImportBoardGames(["Ark Nova", "Wingspan"]);

    expect(sleep).toHaveBeenCalled();
    expect(searchBggGamesExactMock).toHaveBeenNthCalledWith(1, "Ark Nova");
    expect(searchBggGamesExactMock).toHaveBeenNthCalledWith(2, "Wingspan");
  });

  it("ignores blank lines", async () => {
    beforeEachSetup();
    searchBggGamesExactMock.mockResolvedValue([]);

    const result = await bulkImportBoardGames(["Ark Nova", "   ", ""]);

    if ("error" in result) throw new Error("expected success");
    expect(result.results).toHaveLength(1);
    expect(searchBggGamesExactMock).toHaveBeenCalledTimes(1);
  });
});
