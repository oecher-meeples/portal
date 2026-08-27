import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { getActiveHoldingsByMeeple } = await import("./holdings-by-meeple");

function holding(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    gameCopyId: "copy-1",
    startedAt: new Date("2026-08-01"),
    meeple: { id: "meeple-1", displayName: "Anna" },
    gameCopy: {
      condition: null,
      ruleBookLanguages: [],
      inventoryNumber: null,
      boardGame: { id: "bg-ark-nova", title: "Ark Nova" },
    },
    ...overrides,
  };
}

describe("getActiveHoldingsByMeeple", () => {
  it("filters to open person-holdings only", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([holding()] as never);

    await getActiveHoldingsByMeeple();

    expect(prismaMock.gameHolding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { meepleId: { not: null }, endedAt: null },
      }),
    );
  });

  it("groups multiple copies of one meeple together", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([
      holding({ gameCopyId: "copy-1" }),
      holding({
        gameCopyId: "copy-2",
        gameCopy: {
          condition: null,
          ruleBookLanguages: [],
          inventoryNumber: null,
          boardGame: { id: "bg-wingspan", title: "Wingspan" },
        },
      }),
    ] as never);

    const result = await getActiveHoldingsByMeeple();

    expect(result).toEqual([
      {
        meepleId: "meeple-1",
        meepleName: "Anna",
        holdings: [
          {
            gameCopyId: "copy-1",
            boardGameId: "bg-ark-nova",
            boardGameTitle: "Ark Nova",
            startedAt: new Date("2026-08-01"),
            locationChain: "bei Anna",
            condition: null,
            ruleBookLanguages: [],
            inventoryNumber: null,
          },
          {
            gameCopyId: "copy-2",
            boardGameId: "bg-wingspan",
            boardGameTitle: "Wingspan",
            startedAt: new Date("2026-08-01"),
            locationChain: "bei Anna",
            condition: null,
            ruleBookLanguages: [],
            inventoryNumber: null,
          },
        ],
      },
    ]);
  });

  it("keeps distinct meeples separate, sorted by name", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([
      holding({ meeple: { id: "meeple-2", displayName: "Zoe" } }),
      holding({ meeple: { id: "meeple-1", displayName: "Anna" } }),
    ] as never);

    const result = await getActiveHoldingsByMeeple();

    expect(result.map((entry) => entry.meepleName)).toEqual(["Anna", "Zoe"]);
  });

  it("includes a meeple who is only receiving a return for storage (#272)", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([
      holding({ meeple: { id: "meeple-1", displayName: "Kassenwart Anna" } }),
    ] as never);

    const result = await getActiveHoldingsByMeeple();

    expect(result).toHaveLength(1);
    expect(result[0].meepleId).toBe("meeple-1");
  });

  it("returns an empty list when nothing is currently held by a person", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([]);

    const result = await getActiveHoldingsByMeeple();

    expect(result).toEqual([]);
  });
});
