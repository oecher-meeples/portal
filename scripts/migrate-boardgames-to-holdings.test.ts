import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "../src/lib/__mocks__/prisma";

vi.mock("../src/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { migrateBoardGamesToHoldings } =
  await import("./migrate-boardgames-to-holdings");

const SYSTEM_MEEPLE = { id: "meeple-system", displayName: "Admin" };
const UNSORTIERT = { id: "unit-unsortiert", code: "OM-BOX-0000" };

function baseGame(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "game-1",
    slug: "arche-nova",
    title: "Arche Nova",
    bggId: null,
    ean: null,
    minPlayers: null,
    maxPlayers: null,
    playTimeMinutes: null,
    weight: null,
    imageUrl: null,
    description: null,
    mechanics: [],
    quantity: 1,
    location: null,
    condition: null,
    status: "ACTIVE",
    _count: { holdings: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  prismaMock.meeple.findFirst.mockResolvedValue(SYSTEM_MEEPLE as never);
  prismaMock.storageUnit.upsert.mockResolvedValue(UNSORTIERT as never);
  prismaMock.storageUnit.findMany.mockResolvedValue([]);
  prismaMock.boardGame.findFirst.mockResolvedValue(null);
  prismaMock.storageUnit.findFirst.mockResolvedValue(null);
  let unitCounter = 0;
  prismaMock.storageUnit.create.mockImplementation(
    (args) =>
      Promise.resolve({
        id: `unit-${++unitCounter}`,
        ...(args as { data: object }).data,
      }) as never,
  );
  let gameCounter = 0;
  prismaMock.boardGame.create.mockImplementation(
    (args) =>
      Promise.resolve({
        id: `game-copy-${++gameCounter}`,
        ...(args as { data: object }).data,
      }) as never,
  );
  prismaMock.boardGame.update.mockResolvedValue({} as never);
  prismaMock.gameHolding.create.mockResolvedValue({} as never);
});

describe("migrateBoardGamesToHoldings", () => {
  it("gives every game without a holding exactly one open holding into Unsortiert", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([baseGame()] as never);

    const result = await migrateBoardGamesToHoldings();

    expect(result.holdingsCreated).toBe(1);
    expect(prismaMock.gameHolding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        boardGameId: "game-1",
        unitId: "unit-unsortiert",
        origin: "INITIAL",
        recordedByMeepleId: "meeple-system",
      }),
    });
  });

  it("splits a quantity:3 game into three records with unique slugs", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([
      baseGame({ quantity: 3 }),
    ] as never);

    const result = await migrateBoardGamesToHoldings();

    expect(result.copiesCreated).toBe(2);
    expect(prismaMock.boardGame.create).toHaveBeenCalledTimes(2);
    const slugs = prismaMock.boardGame.create.mock.calls.map(
      (call) => (call[0] as { data: { slug: string } }).data.slug,
    );
    expect(new Set(slugs).size).toBe(2);
    expect(prismaMock.boardGame.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: { quantity: 1 },
    });
    expect(prismaMock.gameHolding.create).toHaveBeenCalledTimes(3);
  });

  it("creates only one box for games sharing the same location freetext", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([
      baseGame({ id: "game-a", slug: "game-a", location: "Keller links" }),
      baseGame({ id: "game-b", slug: "game-b", location: "Keller links" }),
    ] as never);

    const result = await migrateBoardGamesToHoldings();

    expect(result.unitsCreated).toBe(1);
    expect(prismaMock.storageUnit.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.gameHolding.create).toHaveBeenCalledTimes(2);
    const unitIds = prismaMock.gameHolding.create.mock.calls.map(
      (call) => (call[0] as { data: { unitId: string } }).data.unitId,
    );
    expect(unitIds[0]).toBe(unitIds[1]);
  });

  it("does nothing on a second run once every game already has a holding", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([
      baseGame({ _count: { holdings: 1 } }),
    ] as never);

    const result = await migrateBoardGamesToHoldings();

    expect(result).toEqual({
      holdingsCreated: 0,
      copiesCreated: 0,
      unitsCreated: 0,
    });
    expect(prismaMock.gameHolding.create).not.toHaveBeenCalled();
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
  });

  it("writes nothing in dry-run mode", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([baseGame()] as never);

    const result = await migrateBoardGamesToHoldings({ dryRun: true });

    expect(result).toEqual({
      holdingsCreated: 0,
      copiesCreated: 0,
      unitsCreated: 0,
    });
    expect(prismaMock.gameHolding.create).not.toHaveBeenCalled();
    expect(prismaMock.meeple.findFirst).not.toHaveBeenCalled();
  });
});
