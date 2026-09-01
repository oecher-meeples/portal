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
const fetchBggGameMock = vi.fn();
vi.mock("@/lib/bgg/client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/bgg/client")>(
      "@/lib/bgg/client",
    );
  return {
    ...actual,
    searchBggGamesExact: (...args: unknown[]) =>
      searchBggGamesExactMock(...args),
    fetchBggGame: (...args: unknown[]) => fetchBggGameMock(...args),
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

const getSuggestedInventoryNumberMock = vi.fn().mockResolvedValue("1");
vi.mock("@/lib/ludothek/game-copies", () => ({
  getSuggestedInventoryNumber: () => getSuggestedInventoryNumberMock(),
}));

const { resolveBulkImportCandidate, fetchBulkImportCandidateDetails } =
  await import("./board-games-bulk-import");

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

describe("resolveBulkImportCandidate (#186-Folge)", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await resolveBulkImportCandidate("Catan", 13);

    expect(result).toEqual({
      name: "Catan",
      status: "failed",
      error: "Keine Berechtigung.",
    });
    expect(previewBggImportMock).not.toHaveBeenCalled();
  });

  it("imports the chosen candidate directly, skipping the search step", async () => {
    beforeEachSetup();
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: VALID_BGG_DATA,
    });
    createBoardGameMock.mockResolvedValue({
      success: true,
      id: "copy-1",
      boardGameSlug: "ark-nova",
    });

    const result = await resolveBulkImportCandidate("Catan", 13);

    expect(searchBggGamesExactMock).not.toHaveBeenCalled();
    expect(previewBggImportMock).toHaveBeenCalledWith(13);
    expect(result).toEqual({
      name: "Catan",
      status: "imported",
      bggId: 13,
      title: "Ark Nova",
      slug: "ark-nova",
    });
  });

  it("reports a duplicate when the chosen candidate's bggId already exists", async () => {
    beforeEachSetup();
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "existing-1",
      title: "Catan",
    } as never);

    const result = await resolveBulkImportCandidate("Catan", 13);

    expect(result).toEqual({
      name: "Catan",
      status: "skipped-duplicate",
      bggId: 13,
      title: "Catan",
    });
    expect(previewBggImportMock).not.toHaveBeenCalled();
  });

  it("marks it as failed when the preview fails", async () => {
    beforeEachSetup();
    previewBggImportMock.mockResolvedValue({
      success: false,
      error: "BoardGameGeek ist aktuell nicht erreichbar.",
    });

    const result = await resolveBulkImportCandidate("Catan", 13);

    expect(result).toEqual({
      name: "Catan",
      status: "failed",
      error: "BoardGameGeek ist aktuell nicht erreichbar.",
    });
  });
});

describe("fetchBulkImportCandidateDetails (#186-Folge)", () => {
  it("returns an empty map without the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await fetchBulkImportCandidateDetails([13]);

    expect(result).toEqual({});
    expect(fetchBggGameMock).not.toHaveBeenCalled();
  });

  it("resolves author and publisher per candidate", async () => {
    beforeEachSetup();
    fetchBggGameMock.mockResolvedValue({
      ...VALID_BGG_DATA,
      author: ["Uwe Rosenberg"],
      versions: [
        {
          yearPublished: 1995,
          publisher: ["Kosmos"],
          productCode: null,
          languages: [],
        },
      ],
    });

    const result = await fetchBulkImportCandidateDetails([13]);

    expect(result).toEqual({
      13: { author: ["Uwe Rosenberg"], publisher: ["Kosmos"] },
    });
  });

  it("deduplicates repeated bggIds into a single request", async () => {
    beforeEachSetup();
    fetchBggGameMock.mockResolvedValue(VALID_BGG_DATA);

    await fetchBulkImportCandidateDetails([13, 13]);

    expect(fetchBggGameMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to empty arrays when one candidate's lookup fails", async () => {
    beforeEachSetup();
    fetchBggGameMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({
        ...VALID_BGG_DATA,
        author: ["Uwe Rosenberg"],
      });

    const result = await fetchBulkImportCandidateDetails([1, 2]);

    expect(result).toEqual({
      1: { author: [], publisher: [] },
      2: { author: ["Uwe Rosenberg"], publisher: [] },
    });
  });
});
