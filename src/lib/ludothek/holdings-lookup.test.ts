import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  getGameZustand,
  getResponsibleMeeple,
  resolveScannedCode,
  walkUnitChain,
  formatLocationChain,
} = await import("./holdings");

const GAME_ID = "game-1";
const UNIT_ID = "unit-1";
const MEEPLE_A = "meeple-a";

function openHolding(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "holding-1",
    gameCopyId: GAME_ID,
    unitId: null,
    meepleId: null,
    origin: "INITIAL",
    startedAt: new Date(),
    endedAt: null,
    confirmedAt: null,
    recordedByMeepleId: MEEPLE_A,
    note: null,
    ...overrides,
  };
}

beforeEach(() => {
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
  prismaMock.gameCopy.findUnique.mockResolvedValue({
    id: GAME_ID,
    status: "ACTIVE",
  } as never);
  prismaMock.storageUnit.findUnique.mockResolvedValue({
    id: UNIT_ID,
    retiredAt: null,
  } as never);
  prismaMock.gameHolding.update.mockResolvedValue({} as never);
  prismaMock.gameHolding.create.mockResolvedValue({} as never);
});

describe("getResponsibleMeeple", () => {
  it("is the borrower for a direct loan", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ meepleId: MEEPLE_A }) as never,
    );

    expect(await getResponsibleMeeple({ id: GAME_ID })).toBe(MEEPLE_A);
  });

  it("is the keeper of the unit for a game in a box that sits with a person", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );
    prismaMock.storageUnit.findUnique.mockResolvedValue({
      id: UNIT_ID,
      keeperMeepleId: MEEPLE_A,
      parentUnitId: null,
    } as never);

    expect(await getResponsibleMeeple({ id: GAME_ID })).toBe(MEEPLE_A);
  });

  it("walks two levels: box in shelf with a keeper", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: "box-1" }) as never,
    );
    prismaMock.storageUnit.findUnique
      .mockResolvedValueOnce({
        id: "box-1",
        keeperMeepleId: null,
        parentUnitId: "shelf-1",
      } as never)
      .mockResolvedValueOnce({
        id: "shelf-1",
        keeperMeepleId: MEEPLE_A,
        parentUnitId: null,
      } as never);

    expect(await getResponsibleMeeple({ id: GAME_ID })).toBe(MEEPLE_A);
  });

  it("is null when no unit in the chain has a keeper", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );
    prismaMock.storageUnit.findUnique.mockResolvedValue({
      id: UNIT_ID,
      keeperMeepleId: null,
      parentUnitId: null,
    } as never);

    expect(await getResponsibleMeeple({ id: GAME_ID })).toBeNull();
  });
});

describe("getGameZustand", () => {
  it("is frei for a game in a unit at a keeper", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue({
      ...openHolding({ unitId: UNIT_ID }),
      unit: { id: UNIT_ID, code: "OM-BOX-0001" },
    } as never);

    expect(
      await getGameZustand({ id: GAME_ID, status: "ACTIVE" as never }),
    ).toBe("frei");
  });

  it("is ausgeliehen when a person holds it", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue({
      ...openHolding({ meepleId: MEEPLE_A }),
      unit: null,
    } as never);

    expect(
      await getGameZustand({ id: GAME_ID, status: "ACTIVE" as never }),
    ).toBe("ausgeliehen");
  });

  it("is wartung when the completeness check failed", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue({
      ...openHolding({ unitId: UNIT_ID }),
      unit: { id: UNIT_ID, code: "OM-BOX-0001" },
    } as never);

    expect(
      await getGameZustand({ id: GAME_ID, status: "MAINTENANCE" as never }),
    ).toBe("wartung");
  });

  it("is nicht-erfasst in Unsortiert", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue({
      ...openHolding({ unitId: "unsortiert" }),
      unit: { id: "unsortiert", code: "OM-BOX-0000" },
    } as never);

    expect(
      await getGameZustand({ id: GAME_ID, status: "ACTIVE" as never }),
    ).toBe("nicht-erfasst");
  });
});

describe("resolveScannedCode", () => {
  it("resolves an unknown unit code to unknown", async () => {
    prismaMock.storageUnit.findUnique.mockResolvedValue(null);

    expect(await resolveScannedCode("OM-BOX-9999")).toEqual({
      kind: "unknown",
      raw: "OM-BOX-9999",
    });
  });

  it("resolves a unit code to its contents", async () => {
    prismaMock.storageUnit.findUnique.mockResolvedValue({
      id: UNIT_ID,
      code: "OM-BOX-0001",
    } as never);
    prismaMock.gameCopy.findMany.mockResolvedValue([{ id: GAME_ID }] as never);

    const result = await resolveScannedCode("OM-BOX-0001");

    expect(result.kind).toBe("unit");
  });

  it("resolves an ean with zero matches to unknown", async () => {
    prismaMock.gameCopy.findMany.mockResolvedValue([]);

    expect(await resolveScannedCode("5901234123457")).toEqual({
      kind: "unknown",
      raw: "5901234123457",
    });
  });

  it("resolves an ean with one match", async () => {
    prismaMock.gameCopy.findMany.mockResolvedValue([{ id: GAME_ID }] as never);

    const result = await resolveScannedCode("5901234123457");

    expect(result.kind).toBe("games");
    if (result.kind === "games") {
      expect(result.games).toHaveLength(1);
    }
  });

  it("resolves an ean with several matches", async () => {
    prismaMock.gameCopy.findMany.mockResolvedValue([
      { id: "game-1" },
      { id: "game-2" },
    ] as never);

    const result = await resolveScannedCode("5901234123457");

    expect(result.kind).toBe("games");
    if (result.kind === "games") {
      expect(result.games).toHaveLength(2);
    }
  });

  it("resolves nonsense input to unknown without querying the database", async () => {
    const result = await resolveScannedCode("hallo welt");

    expect(result).toEqual({ kind: "unknown", raw: "hallo welt" });
    expect(prismaMock.gameCopy.findMany).not.toHaveBeenCalled();
  });
});

describe("walkUnitChain", () => {
  it("walks up to the root when no unit has a keeper", () => {
    const unitById = new Map([
      [
        "karton",
        { label: "Karton 3", parentUnitId: "regal", keeperMeepleId: null },
      ],
      ["regal", { label: "Regal A", parentUnitId: null, keeperMeepleId: null }],
    ]);

    expect(walkUnitChain("karton", unitById)).toEqual({
      unitChain: "Regal A → Karton 3",
      keeperMeepleId: null,
    });
  });

  it("stops at the first keeper and reports it, without ancestor units", () => {
    const unitById = new Map([
      [
        "karton",
        { label: "Karton 3", parentUnitId: "regal", keeperMeepleId: null },
      ],
      [
        "regal",
        {
          label: "Regal A",
          parentUnitId: "dachboden",
          keeperMeepleId: "meeple-a",
        },
      ],
      [
        "dachboden",
        { label: "Dachboden", parentUnitId: null, keeperMeepleId: null },
      ],
    ]);

    expect(walkUnitChain("karton", unitById)).toEqual({
      unitChain: "Regal A → Karton 3",
      keeperMeepleId: "meeple-a",
    });
  });

  it("returns an empty chain and no keeper for an unknown unit id", () => {
    expect(walkUnitChain("missing", new Map())).toEqual({
      unitChain: "",
      keeperMeepleId: null,
    });
  });
});

describe("formatLocationChain", () => {
  it("leads with the responsible person, then the storage chain (#121)", () => {
    expect(
      formatLocationChain({
        responsibleName: "Alex",
        unitChain: "Regal A → Karton 3",
      }),
    ).toBe("bei Alex → Regal A → Karton 3");
  });

  it("shows just the person when there is no storage chain", () => {
    expect(
      formatLocationChain({ responsibleName: "Alex", unitChain: "" }),
    ).toBe("bei Alex");
  });

  it("shows just the storage chain when there is no responsible person", () => {
    expect(
      formatLocationChain({ responsibleName: null, unitChain: "Regal A" }),
    ).toBe("Regal A");
  });

  it("returns an empty string when there is neither", () => {
    expect(formatLocationChain({ responsibleName: null, unitChain: "" })).toBe(
      "",
    );
  });
});
