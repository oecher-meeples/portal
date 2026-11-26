import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPermissionKeys, prismaMock } from "@/lib/__mocks__/prisma";

afterEach(() => {
  vi.clearAllMocks();
});

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/utils/sleep", () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
}));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/auth/action-guards", async () =>
  (await import("@/lib/__mocks__/action-guards")).currentUserGuards(),
);

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

const markTakenEansMock = vi.fn();
const findFreeEansMock = vi.fn();
vi.mock("@/lib/ludothek/ean-candidates", () => ({
  markTakenEans: (...args: unknown[]) => markTakenEansMock(...args),
  findFreeEans: (...args: unknown[]) => findFreeEansMock(...args),
}));

const lookupEanTitleMock = vi.fn();
vi.mock("@/lib/upc-lookup/client", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/upc-lookup/client")
  >("@/lib/upc-lookup/client");
  return {
    ...actual,
    lookupEanTitle: (...args: unknown[]) => lookupEanTitleMock(...args),
  };
});

const { bulkImportBoardGames } = await import("./board-games-bulk-import");

// A real EAN-13 (valid checksum) — needed since `isValidEan()` gates the
// EAN-resolution path.
const VALID_EAN = "4001504311896";

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
  designers: [],
  illustrators: [],
  mechanicLinks: [],
  categoryLinks: [],
  author: [],
  yearPublished: null,
  versions: [],
};

function beforeEachSetup() {
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  mockPermissionKeys("all");
  prismaMock.boardGame.findUnique.mockResolvedValue(null);
  getSuggestedInventoryNumberMock.mockResolvedValue("1");
}

beforeEach(() => {
  markTakenEansMock.mockImplementation(async (results: unknown[]) => results);
  findFreeEansMock.mockResolvedValue([]);
});

// Split out of board-games-bulk-import.test.ts (#668) — 400-line limit.
describe("bulkImportBoardGames — EAN stored with the title (#668)", () => {
  it("searches an EAN for a title import and stores every free hit (#668)", async () => {
    beforeEachSetup();
    findFreeEansMock.mockResolvedValue([VALID_EAN, "9783897775329"]);
    searchBggGamesExactMock.mockResolvedValue([
      { bggId: 342942, title: "Ark Nova", yearPublished: 2021 },
    ]);
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: VALID_BGG_DATA,
    });
    createBoardGameMock.mockResolvedValue({
      success: true,
      boardGameSlug: "ark-nova",
    });

    await bulkImportBoardGames(["Ark Nova"]);

    expect(findFreeEansMock).toHaveBeenCalledWith(
      ["Ark Nova", "Ark Nova (Deutsch)"],
      expect.any(Object),
    );
    expect(createBoardGameMock).toHaveBeenCalledWith(
      expect.objectContaining({ eans: [VALID_EAN, "9783897775329"] }),
    );
  });

  it("imports without an EAN when none is unambiguous", async () => {
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
      boardGameSlug: "ark-nova",
    });

    await bulkImportBoardGames(["Ark Nova"]);

    expect(createBoardGameMock).toHaveBeenCalledWith(
      expect.objectContaining({ eans: [] }),
    );
  });

  it("stores the scanned EAN with the imported title", async () => {
    beforeEachSetup();
    lookupEanTitleMock.mockResolvedValue("Ark Nova");
    searchBggGamesExactMock.mockResolvedValue([
      { bggId: 342942, title: "Ark Nova", yearPublished: 2021 },
    ]);
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: VALID_BGG_DATA,
    });
    createBoardGameMock.mockResolvedValue({
      success: true,
      boardGameSlug: "ark-nova",
    });

    await bulkImportBoardGames([VALID_EAN]);

    expect(createBoardGameMock).toHaveBeenCalledWith(
      expect.objectContaining({ eans: [VALID_EAN] }),
    );
    expect(findFreeEansMock).not.toHaveBeenCalled();
  });

  it("drops a scanned EAN that already belongs to another title", async () => {
    beforeEachSetup();
    markTakenEansMock.mockImplementation(async (results: object[]) =>
      results.map((r) => ({ ...r, takenBy: "Anderer Titel" })),
    );
    lookupEanTitleMock.mockResolvedValue("Ark Nova");
    searchBggGamesExactMock.mockResolvedValue([
      { bggId: 342942, title: "Ark Nova", yearPublished: 2021 },
    ]);
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: VALID_BGG_DATA,
    });
    createBoardGameMock.mockResolvedValue({
      success: true,
      boardGameSlug: "ark-nova",
    });

    const result = await bulkImportBoardGames([VALID_EAN]);

    expect(createBoardGameMock).toHaveBeenCalledWith(
      expect.objectContaining({ eans: [] }),
    );
    expect(result).toMatchObject({
      results: [{ status: "imported" }],
    });
  });
});
