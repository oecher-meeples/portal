import { afterEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";
import {
  filterLudothekGames,
  parseLudothekSearchParams,
  type LudothekGame,
} from "./browser";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { getGameCopyIdsInUnitTree, resolveUnitFilter } =
  await import("./unit-contents");

afterEach(() => {
  vi.clearAllMocks();
});

/** Regal mit Kiste darin, daneben ein zweites Regal. */
function mockUnitTree() {
  prismaMock.storageUnit.findMany.mockResolvedValue([
    { id: "shelf-1", parentUnitId: null },
    { id: "box-1", parentUnitId: "shelf-1" },
    { id: "shelf-2", parentUnitId: null },
  ] as never);
  prismaMock.gameHolding.findMany.mockResolvedValue([
    { gameCopyId: "copy-on-shelf", unitId: "shelf-1" },
    { gameCopyId: "copy-in-box", unitId: "box-1" },
    { gameCopyId: "copy-elsewhere", unitId: "shelf-2" },
  ] as never);
}

describe("getGameCopyIdsInUnitTree (#550)", () => {
  it("includes copies on the unit itself and in units standing in it", async () => {
    mockUnitTree();

    expect(await getGameCopyIdsInUnitTree("shelf-1")).toEqual(
      new Set(["copy-on-shelf", "copy-in-box"]),
    );
  });

  it("only includes the box's own copies for a box", async () => {
    mockUnitTree();

    expect(await getGameCopyIdsInUnitTree("box-1")).toEqual(
      new Set(["copy-in-box"]),
    );
  });
});

describe("resolveUnitFilter (#550)", () => {
  it("resolves a unit short id to the unit and its contents", async () => {
    mockUnitTree();
    prismaMock.storageUnit.findUnique.mockResolvedValue({
      id: "shelf-1",
      label: "Regal Keller",
      code: "OM-SHELF-0001",
    } as never);

    const result = await resolveUnitFilter("shelf-0001");

    expect(prismaMock.storageUnit.findUnique).toHaveBeenCalledWith({
      where: { code: "OM-SHELF-0001" },
      select: { id: true, label: true, code: true },
    });
    expect(result).toEqual({
      unit: { id: "shelf-1", label: "Regal Keller", code: "OM-SHELF-0001" },
      gameCopyIds: new Set(["copy-on-shelf", "copy-in-box"]),
    });
  });

  it("returns null for an unknown unit", async () => {
    prismaMock.storageUnit.findUnique.mockResolvedValue(null);

    expect(await resolveUnitFilter("box-9999")).toBeNull();
  });

  it.each(["inv-12", "OM-BOX-0001", "kiste"])(
    "returns null for %s without querying",
    async (slug) => {
      expect(await resolveUnitFilter(slug)).toBeNull();
      expect(prismaMock.storageUnit.findUnique).not.toHaveBeenCalled();
    },
  );
});

// Filter-Seite des Einheiten-Filters — hier statt in browser.test.ts, das an
// der 400-Zeilen-Grenze liegt. Nur `id` zählt für diesen Filter.
describe("filterLudothekGames — ?einheit= (#550)", () => {
  const inBox = { id: "copy-in-box" } as LudothekGame;
  const elsewhere = { id: "copy-elsewhere" } as LudothekGame;

  it("keeps only copies in the unit tree", () => {
    expect(
      filterLudothekGames(
        [inBox, elsewhere],
        { unit: "box-0001" },
        { unitGameCopyIds: new Set(["copy-in-box"]) },
      ),
    ).toEqual([inBox]);
  });

  it("shows nothing for an unknown unit", () => {
    expect(filterLudothekGames([inBox], { unit: "box-9999" }, {})).toEqual([]);
  });

  it("parses ?einheit= for guests too", () => {
    expect(
      parseLudothekSearchParams({ einheit: "shelf-0002" }, { internal: false })
        .unit,
    ).toBe("shelf-0002");
  });
});
