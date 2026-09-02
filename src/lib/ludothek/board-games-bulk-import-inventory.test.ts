import { afterEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

// Split out of board-games-bulk-import.test.ts (#289) — the
// Inventarnummer-Trennzeichen coverage pushed the original file past the
// 400-line limit.

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

const getSuggestedInventoryNumberMock = vi.fn();
vi.mock("@/lib/ludothek/game-copies", () => ({
  getSuggestedInventoryNumber: () => getSuggestedInventoryNumberMock(),
}));

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
  getSuggestedInventoryNumberMock.mockResolvedValue("1");
}

describe("bulkImportBoardGames — Inventarnummer-Trennzeichen (#289)", () => {
  it("splits a line into inventoryNumber and entry, applying the given number directly", async () => {
    beforeEachSetup();
    searchBggGamesExactMock.mockResolvedValue([
      { bggId: 342942, title: "Ark Nova", yearPublished: 2021 },
    ]);
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: VALID_BGG_DATA,
    });
    createBoardGameMock.mockResolvedValue({
      success: true,
      id: "copy-1",
      boardGameSlug: "ark-nova",
    });

    await bulkImportBoardGames(["OM-0142;Ark Nova"], ";");

    expect(searchBggGamesExactMock).toHaveBeenCalledWith("Ark Nova");
    expect(createBoardGameMock).toHaveBeenCalledWith(
      expect.objectContaining({ inventoryNumber: "OM-0142" }),
    );
    expect(getSuggestedInventoryNumberMock).not.toHaveBeenCalled();
  });

  it("falls back to the auto-suggested number when no delimiter is chosen", async () => {
    beforeEachSetup();
    getSuggestedInventoryNumberMock.mockResolvedValue("7");
    searchBggGamesExactMock.mockResolvedValue([
      { bggId: 342942, title: "Ark Nova", yearPublished: 2021 },
    ]);
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: VALID_BGG_DATA,
    });
    createBoardGameMock.mockResolvedValue({
      success: true,
      id: "copy-1",
      boardGameSlug: "ark-nova",
    });

    await bulkImportBoardGames(["Ark Nova"]);

    expect(createBoardGameMock).toHaveBeenCalledWith(
      expect.objectContaining({ inventoryNumber: "7" }),
    );
  });

  it("treats a line without the chosen delimiter as a plain entry", async () => {
    beforeEachSetup();
    getSuggestedInventoryNumberMock.mockResolvedValue("3");
    searchBggGamesExactMock.mockResolvedValue([
      { bggId: 342942, title: "Ark Nova", yearPublished: 2021 },
    ]);
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: VALID_BGG_DATA,
    });
    createBoardGameMock.mockResolvedValue({
      success: true,
      id: "copy-1",
      boardGameSlug: "ark-nova",
    });

    await bulkImportBoardGames(["Ark Nova"], ";");

    expect(searchBggGamesExactMock).toHaveBeenCalledWith("Ark Nova");
    expect(createBoardGameMock).toHaveBeenCalledWith(
      expect.objectContaining({ inventoryNumber: "3" }),
    );
  });

  it("asks for a new suggestion per new copy, sequentially, avoiding duplicates within one batch", async () => {
    beforeEachSetup();
    getSuggestedInventoryNumberMock
      .mockResolvedValueOnce("5")
      .mockResolvedValueOnce("6");
    searchBggGamesExactMock
      .mockResolvedValueOnce([
        { bggId: 1, title: "Ark Nova", yearPublished: 2021 },
      ])
      .mockResolvedValueOnce([
        { bggId: 2, title: "Wingspan", yearPublished: 2019 },
      ]);
    previewBggImportMock
      .mockResolvedValueOnce({
        success: true,
        data: { ...VALID_BGG_DATA, title: "Ark Nova" },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { ...VALID_BGG_DATA, title: "Wingspan" },
      });
    createBoardGameMock
      .mockResolvedValueOnce({
        success: true,
        id: "copy-1",
        boardGameSlug: "ark-nova",
      })
      .mockResolvedValueOnce({
        success: true,
        id: "copy-2",
        boardGameSlug: "wingspan",
      });

    await bulkImportBoardGames(["Ark Nova", "Wingspan"]);

    expect(getSuggestedInventoryNumberMock).toHaveBeenCalledTimes(2);
    expect(createBoardGameMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ inventoryNumber: "5" }),
    );
    expect(createBoardGameMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ inventoryNumber: "6" }),
    );
  });
});
