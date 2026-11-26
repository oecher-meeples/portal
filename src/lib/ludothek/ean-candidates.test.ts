import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const searchGamesByNameMock = vi.fn();
vi.mock("@/lib/spielemeta/client", () => ({
  searchGamesByName: (...args: unknown[]) => searchGamesByNameMock(...args),
}));
const searchEanByNameMock = vi.fn();
vi.mock("@/lib/upc-lookup/client", () => ({
  searchEanByName: (...args: unknown[]) => searchEanByNameMock(...args),
}));

const { findFreeEans, matchesSearchedTitle } = await import("./ean-candidates");

beforeEach(() => {
  prismaMock.boardGameEan.findMany.mockResolvedValue([]);
  searchGamesByNameMock.mockResolvedValue([]);
  searchEanByNameMock.mockResolvedValue([]);
});

describe("findFreeEans", () => {
  it("returns every free ean of the hits", async () => {
    searchGamesByNameMock.mockResolvedValue([
      { ean: "4015566600225", title: "Catan" },
      { ean: "9783897775329", title: "Catan 2" },
    ]);
    expect(await findFreeEans(["Catan"])).toEqual([
      "4015566600225",
      "9783897775329",
    ]);
  });

  it("skips eans owned by another title", async () => {
    searchGamesByNameMock.mockResolvedValue([
      { ean: "4015566600225", title: "Catan" },
      { ean: "9783897775329", title: "Catan 2" },
    ]);
    prismaMock.boardGameEan.findMany.mockResolvedValue([
      { ean: "4015566600225", boardGame: { title: "Anderer" } },
    ] as never);
    expect(await findFreeEans(["Catan"])).toEqual(["9783897775329"]);
  });

  it("drops hits for other titles and expansions", async () => {
    searchGamesByNameMock.mockResolvedValue([
      { ean: "4015566600225", title: "Catan - Deutschlandedition" },
      { ean: "9783897775329", title: "Catan - Erweiterung" },
      { ean: "0850000576407", title: "Carcassonne" },
    ]);
    expect(await findFreeEans(["Catan"])).toEqual(["4015566600225"]);
  });

  it("tries alternate titles when the first has no hit", async () => {
    searchGamesByNameMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ean: "4015566600225", title: "Catan" }]);
    expect(await findFreeEans(["Settlers", "Catan"])).toEqual([
      "4015566600225",
    ]);
  });

  it("swallows source failures", async () => {
    searchGamesByNameMock.mockRejectedValue(new Error("down"));
    searchEanByNameMock.mockRejectedValue(new Error("down"));
    expect(await findFreeEans(["Catan"])).toEqual([]);
  });
});

describe("matchesSearchedTitle", () => {
  it("accepts editions that start with the title", () => {
    expect(matchesSearchedTitle("Catan - Deutschlandedition", "Catan")).toBe(
      true,
    );
    expect(
      matchesSearchedTitle("DIE SIEDLER VON CATAN", "Die Siedler von Catan"),
    ).toBe(true);
  });

  it("rejects other titles and expansions", () => {
    expect(matchesSearchedTitle("Carcassonne", "Catan")).toBe(false);
    expect(
      matchesSearchedTitle("Catan - Erweiterung 5-6 Spieler", "Catan"),
    ).toBe(false);
    expect(matchesSearchedTitle("Catan Expansion", "Catan")).toBe(false);
  });

  it("allows expansions when the searched title is one", () => {
    expect(
      matchesSearchedTitle(
        "Catan Seefahrer Erweiterung",
        "Catan Seefahrer Erweiterung",
      ),
    ).toBe(true);
  });
});
