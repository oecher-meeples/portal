import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPermissionKeys, prismaMock } from "@/lib/__mocks__/prisma";

afterEach(() => {
  vi.clearAllMocks();
});

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/auth/action-guards", async () =>
  (await import("@/lib/__mocks__/action-guards")).currentUserGuards(),
);

const searchEanByNameMock = vi.fn();
vi.mock("@/lib/upc-lookup/client", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/upc-lookup/client")
  >("@/lib/upc-lookup/client");
  return {
    ...actual,
    searchEanByName: (...args: unknown[]) => searchEanByNameMock(...args),
  };
});

const searchGamesByNameMock = vi.fn();
vi.mock("@/lib/spielemeta/client", () => ({
  searchGamesByName: (...args: unknown[]) => searchGamesByNameMock(...args),
}));

const { searchEanForBoardGame } = await import("./ean-search");

beforeEach(() => {
  prismaMock.boardGameEan.findMany.mockResolvedValue([]);
  searchGamesByNameMock.mockResolvedValue([]);
});

describe("searchEanForBoardGame", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys([]);

    const result = await searchEanForBoardGame("Ark Nova");

    expect(result).toEqual({ success: false, error: "Keine Berechtigung." });
    expect(searchEanByNameMock).not.toHaveBeenCalled();
  });

  it("returns the mapped search results", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    searchEanByNameMock.mockResolvedValue([
      { ean: "0850000576407", title: "Ark Nova", brand: "Capstone Games" },
    ]);

    const result = await searchEanForBoardGame("Ark Nova");

    expect(searchEanByNameMock).toHaveBeenCalledWith("Ark Nova");
    expect(result).toEqual({
      success: true,
      results: [
        { ean: "0850000576407", title: "Ark Nova", brand: "Capstone Games" },
      ],
    });
  });

  it("translates an UpcLookupError into a speaking error", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    const { UpcLookupError } = await import("@/lib/upc-lookup/client");
    searchEanByNameMock.mockRejectedValue(new UpcLookupError("boom", 403));

    const result = await searchEanForBoardGame("Ark Nova");

    expect(result).toEqual({
      success: false,
      error:
        "Die EAN-Suche ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
    });
  });

  it("rethrows unexpected errors", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    searchEanByNameMock.mockRejectedValue(new Error("unexpected"));

    await expect(searchEanForBoardGame("Ark Nova")).rejects.toThrow(
      "unexpected",
    );
  });

  describe("BGG-Product-Code-Priorität (#205)", () => {
    it("returns a valid BGG product code directly, without calling UPCitemdb", async () => {
      getCurrentUserMock.mockResolvedValue({ id: "user-1" });
      mockPermissionKeys("all");

      const result = await searchEanForBoardGame("Ark Nova", {
        bggProductCode: "0850000576407",
        publisher: ["Feuerland Spiele"],
      });

      expect(searchEanByNameMock).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        results: [
          {
            ean: "0850000576407",
            title: "Ark Nova",
            brand: "Feuerland Spiele",
          },
        ],
      });
    });

    it("falls back to UPCitemdb when no BGG product code is given", async () => {
      getCurrentUserMock.mockResolvedValue({ id: "user-1" });
      mockPermissionKeys("all");
      searchEanByNameMock.mockResolvedValue([
        { ean: "0850000576407", title: "Ark Nova" },
      ]);

      const result = await searchEanForBoardGame("Ark Nova", {
        bggProductCode: null,
      });

      expect(searchEanByNameMock).toHaveBeenCalledWith("Ark Nova");
      expect(result.success && result.results).toEqual([
        { ean: "0850000576407", title: "Ark Nova" },
      ]);
    });

    it("falls back to UPCitemdb when the BGG product code is not a valid EAN (#322)", async () => {
      getCurrentUserMock.mockResolvedValue({ id: "user-1" });
      mockPermissionKeys("all");
      searchEanByNameMock.mockResolvedValue([
        { ean: "0850000576407", title: "Ark Nova", brand: "Feuerland Spiele" },
      ]);

      const result = await searchEanForBoardGame("Ark Nova", {
        // Real-world case (#322): BGG's German-edition product code, not a
        // valid EAN (contains letters, wrong length).
        bggProductCode: "FEU001",
        publisher: ["Feuerland Spiele"],
      });

      expect(searchEanByNameMock).toHaveBeenCalledWith("Ark Nova");
      expect(result.success && result.results).toEqual([
        { ean: "0850000576407", title: "Ark Nova", brand: "Feuerland Spiele" },
      ]);
    });
  });

  describe("Verlags-Sortierung der UPCitemdb-Kandidaten (#205)", () => {
    it("moves a hit with a matching brand to the front", async () => {
      getCurrentUserMock.mockResolvedValue({ id: "user-1" });
      mockPermissionKeys("all");
      searchEanByNameMock.mockResolvedValue([
        { ean: "US0001", title: "Ark Nova (US)", brand: "Capstone Games" },
        { ean: "DE0001", title: "Ark Nova (DE)", brand: "Feuerland Spiele" },
      ]);

      const result = await searchEanForBoardGame("Ark Nova", {
        publisher: ["Feuerland Spiele"],
      });

      expect(result.success && result.results.map((r) => r.ean)).toEqual([
        "DE0001",
        "US0001",
      ]);
    });

    it("matches case-insensitively and via substring", async () => {
      getCurrentUserMock.mockResolvedValue({ id: "user-1" });
      mockPermissionKeys("all");
      searchEanByNameMock.mockResolvedValue([
        { ean: "US0001", title: "Ark Nova (US)", brand: "Capstone Games" },
        { ean: "DE0001", title: "Ark Nova (DE)", brand: "feuerland" },
      ]);

      const result = await searchEanForBoardGame("Ark Nova", {
        publisher: ["Feuerland Spiele"],
      });

      expect(result.success && result.results.map((r) => r.ean)).toEqual([
        "DE0001",
        "US0001",
      ]);
    });

    it("leaves the order unchanged without a publisher to sort by", async () => {
      getCurrentUserMock.mockResolvedValue({ id: "user-1" });
      mockPermissionKeys("all");
      searchEanByNameMock.mockResolvedValue([
        { ean: "US0001", title: "Ark Nova (US)", brand: "Capstone Games" },
        { ean: "DE0001", title: "Ark Nova (DE)", brand: "Feuerland Spiele" },
      ]);

      const result = await searchEanForBoardGame("Ark Nova");

      expect(result.success && result.results.map((r) => r.ean)).toEqual([
        "US0001",
        "DE0001",
      ]);
    });
  });

  describe("Spielemeta als primäre Quelle (#668)", () => {
    function allowed() {
      getCurrentUserMock.mockResolvedValue({ id: "user-1" });
      mockPermissionKeys("all");
    }

    it("uses spielemeta before UPCitemdb", async () => {
      allowed();
      searchGamesByNameMock.mockResolvedValue([
        { ean: "4015566600225", title: "Catan", brand: "Kosmos", year: 2020 },
      ]);

      const result = await searchEanForBoardGame("Catan");

      expect(result).toEqual({
        success: true,
        results: [
          { ean: "4015566600225", title: "Catan", brand: "Kosmos", year: 2020 },
        ],
      });
      expect(searchEanByNameMock).not.toHaveBeenCalled();
    });

    it("prefers a valid BGG product code over spielemeta", async () => {
      allowed();

      await searchEanForBoardGame("Catan", { bggProductCode: "4015566600225" });

      expect(searchGamesByNameMock).not.toHaveBeenCalled();
    });

    it("falls back to UPCitemdb when spielemeta has no hits", async () => {
      allowed();
      searchEanByNameMock.mockResolvedValue([
        { ean: "0850000576407", title: "Ark Nova" },
      ]);

      const result = await searchEanForBoardGame("Ark Nova");

      expect(searchGamesByNameMock).toHaveBeenCalledWith("Ark Nova");
      expect(result.success && result.results).toHaveLength(1);
    });

    it("falls back to UPCitemdb when spielemeta fails", async () => {
      allowed();
      searchGamesByNameMock.mockRejectedValue(new Error("401"));
      searchEanByNameMock.mockResolvedValue([
        { ean: "0850000576407", title: "Ark Nova" },
      ]);

      const result = await searchEanForBoardGame("Ark Nova");

      expect(result.success && result.results[0].ean).toBe("0850000576407");
    });

    it("sorts spielemeta hits by matching publisher", async () => {
      allowed();
      searchGamesByNameMock.mockResolvedValue([
        { ean: "4015566600225", title: "Catan (A)", brand: "Anderer" },
        { ean: "9783897775329", title: "Catan (K)", brand: "Kosmos" },
      ]);

      const result = await searchEanForBoardGame("Catan", {
        publisher: ["Kosmos"],
      });

      expect(result.success && result.results.map((r) => r.ean)).toEqual([
        "9783897775329",
        "4015566600225",
      ]);
    });

    it("marks eans owned by another title", async () => {
      allowed();
      searchGamesByNameMock.mockResolvedValue([
        { ean: "4015566600225", title: "Catan" },
        { ean: "9783897775329", title: "Catan Edition" },
      ]);
      prismaMock.boardGameEan.findMany.mockResolvedValue([
        { ean: "4015566600225", boardGame: { title: "Catan Basis" } },
      ] as never);

      const result = await searchEanForBoardGame("Catan", {
        excludeBoardGameId: "own",
      });

      expect(result.success && result.results).toEqual([
        { ean: "4015566600225", title: "Catan", takenBy: "Catan Basis" },
        { ean: "9783897775329", title: "Catan Edition" },
      ]);
      expect(prismaMock.boardGameEan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ boardGameId: { not: "own" } }),
        }),
      );
    });
  });
});
