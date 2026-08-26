import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const buildLudothekGamesMock = vi.fn();
vi.mock("@/lib/ludothek/query", () => ({
  buildLudothekGames: () => buildLudothekGamesMock(),
}));

const {
  unitOrAncestorAssigned,
  isGameInEventRoom,
  getAttendingExplainers,
  getFreeGamesInRoom,
  getGuestFleaMarketItems,
  getGuestCopyAvailability,
} = await import("./guest-area");

describe("unitOrAncestorAssigned", () => {
  it("is true when the unit itself is assigned", () => {
    const parentById = new Map<string, string | null>([["shelf-1", null]]);
    expect(
      unitOrAncestorAssigned("shelf-1", new Set(["shelf-1"]), parentById),
    ).toBe(true);
  });

  it("is true across two levels (box in an assigned shelf)", () => {
    const parentById = new Map<string, string | null>([
      ["box-1", "shelf-1"],
      ["shelf-1", null],
    ]);
    expect(
      unitOrAncestorAssigned("box-1", new Set(["shelf-1"]), parentById),
    ).toBe(true);
  });

  it("is false for an unassigned shelf", () => {
    const parentById = new Map<string, string | null>([["shelf-2", null]]);
    expect(
      unitOrAncestorAssigned("shelf-2", new Set(["shelf-1"]), parentById),
    ).toBe(false);
  });
});

beforeEach(() => {
  prismaMock.eventShelfAssignment.findMany.mockResolvedValue([]);
  prismaMock.storageUnit.findMany.mockResolvedValue([]);
  prismaMock.gameHolding.findMany.mockResolvedValue([]);
});

describe("isGameInEventRoom", () => {
  it("is true for a game directly in an assigned shelf", async () => {
    prismaMock.eventShelfAssignment.findMany.mockResolvedValue([
      { unitId: "shelf-1" },
    ] as never);
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "shelf-1", parentUnitId: null },
    ] as never);
    prismaMock.gameHolding.findMany.mockResolvedValue([
      { gameCopyId: "game-1", unitId: "shelf-1" },
    ] as never);

    expect(await isGameInEventRoom("game-1", "event-1")).toBe(true);
  });

  it("is true through a two-level chain (box in assigned shelf)", async () => {
    prismaMock.eventShelfAssignment.findMany.mockResolvedValue([
      { unitId: "shelf-1" },
    ] as never);
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "shelf-1", parentUnitId: null },
      { id: "box-1", parentUnitId: "shelf-1" },
    ] as never);
    prismaMock.gameHolding.findMany.mockResolvedValue([
      { gameCopyId: "game-1", unitId: "box-1" },
    ] as never);

    expect(await isGameInEventRoom("game-1", "event-1")).toBe(true);
  });

  it("is false for an unassigned shelf", async () => {
    prismaMock.eventShelfAssignment.findMany.mockResolvedValue([]);
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "shelf-2", parentUnitId: null },
    ] as never);
    prismaMock.gameHolding.findMany.mockResolvedValue([
      { gameCopyId: "game-1", unitId: "shelf-2" },
    ] as never);

    expect(await isGameInEventRoom("game-1", "event-1")).toBe(false);
  });
});

describe("getAttendingExplainers", () => {
  it("returns explainers only for the requested game and event", async () => {
    prismaMock.explainerAttendance.findMany.mockResolvedValue([
      {
        meeple: {
          id: "meeple-1",
          displayName: "Lea",
          explainerGames: [{ level: "BY_HEART" }],
        },
      },
    ] as never);

    const result = await getAttendingExplainers("game-1", "event-1");

    expect(result).toEqual([
      { meepleId: "meeple-1", displayName: "Lea", level: "BY_HEART" },
    ]);
    expect(prismaMock.explainerAttendance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventId: "event-1",
          meeple: { explainerGames: { some: { boardGameId: "game-1" } } },
        },
      }),
    );
  });
});

function ludothekGame(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "game-1",
    slug: "game-1",
    title: "Azul",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 2,
    mechanics: [],
    zustand: "frei",
    isLoanedOut: false,
    responsibleMeepleId: null,
    locationChain: "",
    ...overrides,
  };
}

describe("getFreeGamesInRoom", () => {
  it("combines zustand and player-count filters with the in-room check", async () => {
    buildLudothekGamesMock.mockResolvedValue([
      ludothekGame({
        id: "game-1",
        zustand: "frei",
        minPlayers: 2,
        maxPlayers: 4,
      }),
      ludothekGame({ id: "game-2", zustand: "ausgeliehen" }),
      ludothekGame({
        id: "game-3",
        zustand: "frei",
        minPlayers: 5,
        maxPlayers: 8,
      }),
    ]);
    prismaMock.eventShelfAssignment.findMany.mockResolvedValue([
      { unitId: "shelf-1" },
    ] as never);
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "shelf-1", parentUnitId: null },
    ] as never);
    prismaMock.gameHolding.findMany.mockResolvedValue([
      { gameCopyId: "game-1", unitId: "shelf-1" },
      { gameCopyId: "game-3", unitId: "shelf-1" },
    ] as never);

    const result = await getFreeGamesInRoom("event-1", { players: 3 });

    expect(result.map((g) => g.id)).toEqual(["game-1"]);
  });
});

describe("getGuestFleaMarketItems", () => {
  it("never includes PENDING items", async () => {
    prismaMock.fleaMarketItem.findMany.mockResolvedValue([
      {
        id: "item-1",
        title: "Azul",
        description: null,
        priceEuros: 20,
        status: "FOR_SALE",
      },
    ] as never);

    const result = await getGuestFleaMarketItems("event-1");

    expect(result).toEqual([
      {
        id: "item-1",
        title: "Azul",
        description: null,
        priceEuros: 20,
        status: "FOR_SALE",
      },
    ]);
    expect(prismaMock.fleaMarketItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId: "event-1", status: { in: ["FOR_SALE", "RESERVED"] } },
      }),
    );
  });

  it("queries only FOR_SALE and RESERVED, excluding SOLD", async () => {
    prismaMock.fleaMarketItem.findMany.mockResolvedValue([]);

    await getGuestFleaMarketItems("event-1");

    const call = prismaMock.fleaMarketItem.findMany.mock.calls[0][0] as {
      where: { status: { in: string[] } };
    };
    expect(call.where.status.in).not.toContain("SOLD");
    expect(call.where.status.in).not.toContain("PENDING");
  });
});

describe("getGuestCopyAvailability", () => {
  const COPIES = [
    { id: "copy-1", zustand: "frei" as const },
    { id: "copy-2", zustand: "ausgeliehen" as const },
  ];

  it("returns a plain count without an event", async () => {
    const result = await getGuestCopyAvailability(COPIES, null);

    expect(result).toEqual({ kind: "plain", total: 2 });
    expect(prismaMock.eventShelfAssignment.findMany).not.toHaveBeenCalled();
  });

  it("returns a plain count of zero for an empty title", async () => {
    const result = await getGuestCopyAvailability([], "event-1");

    expect(result).toEqual({ kind: "plain", total: 0 });
  });

  it("computes X von Y for copies assigned to a shelf at the running event", async () => {
    prismaMock.eventShelfAssignment.findMany.mockResolvedValue([
      { unitId: "shelf-1", unit: { label: "Regal A" } },
    ] as never);
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "shelf-1", parentUnitId: null },
    ] as never);
    prismaMock.gameHolding.findMany.mockResolvedValue([
      { gameCopyId: "copy-1", unitId: "shelf-1" },
      { gameCopyId: "copy-2", unitId: "shelf-1" },
    ] as never);

    const result = await getGuestCopyAvailability(COPIES, "event-1");

    expect(result).toEqual({
      kind: "event",
      total: 2,
      inRoom: 2,
      available: 1,
      shelfLabels: ["Regal A"],
    });
  });

  it("does not count copies outside the event's shelf assignment", async () => {
    prismaMock.eventShelfAssignment.findMany.mockResolvedValue([
      { unitId: "shelf-1", unit: { label: "Regal A" } },
    ] as never);
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "shelf-1", parentUnitId: null },
      { id: "shelf-2", parentUnitId: null },
    ] as never);
    prismaMock.gameHolding.findMany.mockResolvedValue([
      { gameCopyId: "copy-1", unitId: "shelf-1" },
      { gameCopyId: "copy-2", unitId: "shelf-2" },
    ] as never);

    const result = await getGuestCopyAvailability(COPIES, "event-1");

    expect(result).toEqual({
      kind: "event",
      total: 2,
      inRoom: 1,
      available: 1,
      shelfLabels: ["Regal A"],
    });
  });

  it("falls back to a plain count when no copy is assigned to the event", async () => {
    prismaMock.eventShelfAssignment.findMany.mockResolvedValue([
      { unitId: "shelf-1", unit: { label: "Regal A" } },
    ] as never);
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "shelf-2", parentUnitId: null },
    ] as never);
    prismaMock.gameHolding.findMany.mockResolvedValue([
      { gameCopyId: "copy-1", unitId: "shelf-2" },
    ] as never);

    const result = await getGuestCopyAvailability(COPIES, "event-1");

    expect(result).toEqual({ kind: "plain", total: 2 });
  });
});
