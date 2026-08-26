import { afterEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

afterEach(() => {
  vi.clearAllMocks();
});

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

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

const { searchEanForBoardGame } = await import("./ean-search");

describe("searchEanForBoardGame", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await searchEanForBoardGame("Ark Nova");

    expect(result).toEqual({ success: false, error: "Keine Berechtigung." });
    expect(searchEanByNameMock).not.toHaveBeenCalled();
  });

  it("returns the mapped search results", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
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
    prismaMock.rolePermission.count.mockResolvedValue(1);
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
    prismaMock.rolePermission.count.mockResolvedValue(1);
    searchEanByNameMock.mockRejectedValue(new Error("unexpected"));

    await expect(searchEanForBoardGame("Ark Nova")).rejects.toThrow(
      "unexpected",
    );
  });

  describe("BGG-Product-Code-Priorität (#205)", () => {
    it("returns the BGG product code directly, without calling UPCitemdb", async () => {
      getCurrentUserMock.mockResolvedValue({ id: "user-1" });
      prismaMock.rolePermission.count.mockResolvedValue(1);

      const result = await searchEanForBoardGame("Ark Nova", {
        bggProductCode: "FEU001",
        publisher: ["Feuerland Spiele"],
      });

      expect(searchEanByNameMock).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        results: [
          { ean: "FEU001", title: "Ark Nova", brand: "Feuerland Spiele" },
        ],
      });
    });

    it("falls back to UPCitemdb when no BGG product code is given", async () => {
      getCurrentUserMock.mockResolvedValue({ id: "user-1" });
      prismaMock.rolePermission.count.mockResolvedValue(1);
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
  });

  describe("Verlags-Sortierung der UPCitemdb-Kandidaten (#205)", () => {
    it("moves a hit with a matching brand to the front", async () => {
      getCurrentUserMock.mockResolvedValue({ id: "user-1" });
      prismaMock.rolePermission.count.mockResolvedValue(1);
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
      prismaMock.rolePermission.count.mockResolvedValue(1);
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
      prismaMock.rolePermission.count.mockResolvedValue(1);
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
});
