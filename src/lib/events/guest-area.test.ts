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
  getPresentGameCopyIds,
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

/** #273: `resolveEventUnitId()` looks up the event's slug, then the
 * `OM-EVENT-{slug}` storage unit by code. `eventUnitId: null` simulates
 * "nobody has checked anything into this event yet". */
function mockEventUnit(eventUnitId: string | null) {
  prismaMock.event.findUnique.mockResolvedValue({ slug: "spieletag" } as never);
  prismaMock.storageUnit.findUnique.mockResolvedValue(
    (eventUnitId ? { id: eventUnitId } : null) as never,
  );
}

beforeEach(() => {
  prismaMock.storageUnit.findMany.mockResolvedValue([]);
  prismaMock.gameHolding.findMany.mockResolvedValue([]);
  mockEventUnit(null);
});

describe("isGameInEventRoom (#273)", () => {
  it("is true for a game directly on the event unit (Stufe 1)", async () => {
    mockEventUnit("event-unit-1");
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "event-unit-1", parentUnitId: null },
    ] as never);
    prismaMock.gameHolding.findMany.mockResolvedValue([
      { gameCopyId: "game-1", unitId: "event-unit-1" },
    ] as never);

    expect(await isGameInEventRoom("game-1", "event-1")).toBe(true);
  });

  it("is true through a two-level chain (shelf hung under the event unit, Stufe 2)", async () => {
    mockEventUnit("event-unit-1");
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "event-unit-1", parentUnitId: null },
      { id: "shelf-1", parentUnitId: "event-unit-1" },
    ] as never);
    prismaMock.gameHolding.findMany.mockResolvedValue([
      { gameCopyId: "game-1", unitId: "shelf-1" },
    ] as never);

    expect(await isGameInEventRoom("game-1", "event-1")).toBe(true);
  });

  it("is false when the event has no unit yet (nobody checked in)", async () => {
    mockEventUnit(null);
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "shelf-2", parentUnitId: null },
    ] as never);
    prismaMock.gameHolding.findMany.mockResolvedValue([
      { gameCopyId: "game-1", unitId: "shelf-2" },
    ] as never);

    expect(await isGameInEventRoom("game-1", "event-1")).toBe(false);
  });

  it("is false for a copy sitting in an unrelated unit", async () => {
    mockEventUnit("event-unit-1");
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "event-unit-1", parentUnitId: null },
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
      ludothekGame({ id: "game-2", zustand: "ausgeliehen-verfuegbar" }),
      ludothekGame({
        id: "game-3",
        zustand: "frei",
        minPlayers: 5,
        maxPlayers: 8,
      }),
    ]);
    mockEventUnit("event-unit-1");
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "event-unit-1", parentUnitId: null },
    ] as never);
    prismaMock.gameHolding.findMany.mockResolvedValue([
      { gameCopyId: "game-1", unitId: "event-unit-1" },
      { gameCopyId: "game-3", unitId: "event-unit-1" },
    ] as never);

    const result = await getFreeGamesInRoom("event-1", { players: 3 });

    expect(result.map((g) => g.id)).toEqual(["game-1"]);
  });

  it("returns an empty list when the event has no unit yet", async () => {
    buildLudothekGamesMock.mockResolvedValue([ludothekGame()]);
    mockEventUnit(null);

    const result = await getFreeGamesInRoom("event-1", {});

    expect(result).toEqual([]);
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

describe("getGuestCopyAvailability (#273)", () => {
  const COPIES = [
    { id: "copy-1", zustand: "frei" as const },
    { id: "copy-2", zustand: "ausgeliehen-verfuegbar" as const },
  ];

  it("returns a plain count without an event", async () => {
    const result = await getGuestCopyAvailability(COPIES, null);

    expect(result).toEqual({ kind: "plain", total: 2 });
    expect(prismaMock.event.findUnique).not.toHaveBeenCalled();
  });

  it("returns a plain count of zero for an empty title", async () => {
    const result = await getGuestCopyAvailability([], "event-1");

    expect(result).toEqual({ kind: "plain", total: 0 });
  });

  it("computes X von Y for copies on the event's collection unit (Stufe 1)", async () => {
    mockEventUnit("event-unit-1");
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "event-unit-1", parentUnitId: null, label: "Spieletag" },
    ] as never);
    prismaMock.gameHolding.findMany.mockResolvedValue([
      { gameCopyId: "copy-1", unitId: "event-unit-1" },
      { gameCopyId: "copy-2", unitId: "event-unit-1" },
    ] as never);

    const result = await getGuestCopyAvailability(COPIES, "event-1");

    expect(result).toEqual({
      kind: "event",
      total: 2,
      inRoom: 2,
      available: 1,
      shelfLabels: ["Spieletag"],
    });
  });

  it("shows the shelf's own label once it was moved out of the collection unit (Stufe 2)", async () => {
    mockEventUnit("event-unit-1");
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "event-unit-1", parentUnitId: null, label: "Spieletag" },
      { id: "shelf-1", parentUnitId: "event-unit-1", label: "Regal A" },
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

  it("does not count copies outside the event unit's tree", async () => {
    mockEventUnit("event-unit-1");
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "event-unit-1", parentUnitId: null, label: "Spieletag" },
      { id: "shelf-2", parentUnitId: null, label: "Regal B" },
    ] as never);
    prismaMock.gameHolding.findMany.mockResolvedValue([
      { gameCopyId: "copy-1", unitId: "event-unit-1" },
      { gameCopyId: "copy-2", unitId: "shelf-2" },
    ] as never);

    const result = await getGuestCopyAvailability(COPIES, "event-1");

    expect(result).toEqual({
      kind: "event",
      total: 2,
      inRoom: 1,
      available: 1,
      shelfLabels: ["Spieletag"],
    });
  });

  it("falls back to a plain count when the event has no unit yet", async () => {
    mockEventUnit(null);
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "shelf-2", parentUnitId: null, label: "Regal B" },
    ] as never);
    prismaMock.gameHolding.findMany.mockResolvedValue([
      { gameCopyId: "copy-1", unitId: "shelf-2" },
    ] as never);

    const result = await getGuestCopyAvailability(COPIES, "event-1");

    expect(result).toEqual({ kind: "plain", total: 2 });
  });
});

describe("getPresentGameCopyIds (#273)", () => {
  it("returns an empty set when the event has no unit yet", async () => {
    mockEventUnit(null);

    const result = await getPresentGameCopyIds("event-1");

    expect(result).toEqual(new Set());
  });

  it("includes copies directly on the event unit and on a nested shelf", async () => {
    mockEventUnit("event-unit-1");
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { id: "event-unit-1", parentUnitId: null },
      { id: "shelf-1", parentUnitId: "event-unit-1" },
      { id: "shelf-2", parentUnitId: null },
    ] as never);
    prismaMock.gameHolding.findMany.mockResolvedValue([
      { gameCopyId: "copy-1", unitId: "event-unit-1" },
      { gameCopyId: "copy-2", unitId: "shelf-1" },
      { gameCopyId: "copy-3", unitId: "shelf-2" },
    ] as never);

    const result = await getPresentGameCopyIds("event-1");

    expect(result).toEqual(new Set(["copy-1", "copy-2"]));
  });
});
