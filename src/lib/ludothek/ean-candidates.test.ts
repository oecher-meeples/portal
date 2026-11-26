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

const { findFreeEans } = await import("./ean-candidates");

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
