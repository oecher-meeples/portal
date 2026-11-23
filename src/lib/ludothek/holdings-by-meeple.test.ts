import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { getActiveHoldingsByMeeple, getActiveHoldingsForMember } =
  await import("./holdings-by-meeple");

function member(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "member-1",
    firstName: null,
    lastName: null,
    email: "anna@example.com",
    street: null,
    postalCode: null,
    city: null,
    phone: null,
    meeple: {
      id: "meeple-anna",
      displayName: "Anna",
      neonAuthUserId: "auth-1",
    },
    ...overrides,
  };
}

function holding(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    gameCopyId: "copy-1",
    startedAt: new Date("2026-08-01"),
    confirmedAt: new Date("2026-08-01"),
    vereinsmitglied: member(),
    gameCopy: {
      condition: null,
      ruleBookLanguages: [],
      inventoryNumber: null,
      boardGame: { id: "bg-ark-nova", title: "Ark Nova", slug: "ark-nova" },
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
        where: { vereinsmitgliedId: { not: null }, endedAt: null },
      }),
    );
  });

  it("groups multiple copies of one member together", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([
      holding({ gameCopyId: "copy-1" }),
      holding({
        gameCopyId: "copy-2",
        gameCopy: {
          condition: null,
          ruleBookLanguages: [],
          inventoryNumber: null,
          boardGame: { id: "bg-wingspan", title: "Wingspan", slug: "wingspan" },
        },
      }),
    ] as never);

    const result = await getActiveHoldingsByMeeple();

    expect(result).toEqual([
      {
        vereinsmitgliedId: "member-1",
        memberName: "Anna",
        meepleId: "meeple-anna",
        profilePictureUrl: null,
        profilePictureVisibility: "INTERN",
        verfuegbar: true,
        street: null,
        postalCode: null,
        city: null,
        phone: null,
        holdings: [
          {
            gameCopyId: "copy-1",
            boardGameId: "bg-ark-nova",
            boardGameTitle: "Ark Nova",
            boardGameSlug: "ark-nova",
            startedAt: new Date("2026-08-01"),
            locationChain: "bei Anna",
            condition: null,
            ruleBookLanguages: [],
            inventoryNumber: null,
            isUnconfirmed: false,
          },
          {
            gameCopyId: "copy-2",
            boardGameId: "bg-wingspan",
            boardGameTitle: "Wingspan",
            boardGameSlug: "wingspan",
            startedAt: new Date("2026-08-01"),
            locationChain: "bei Anna",
            condition: null,
            ruleBookLanguages: [],
            inventoryNumber: null,
            isUnconfirmed: false,
          },
        ],
      },
    ]);
  });

  it("flags a holding as unbestätigt (#406)", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([
      holding({ confirmedAt: null }),
    ] as never);

    const result = await getActiveHoldingsByMeeple();

    expect(result[0].holdings[0].isUnconfirmed).toBe(true);
  });

  it("keeps distinct members separate, sorted by name", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([
      holding({
        vereinsmitglied: member({
          id: "member-2",
          meeple: { displayName: "Zoe", neonAuthUserId: "auth-2" },
        }),
      }),
      holding({ vereinsmitglied: member({ id: "member-1" }) }),
    ] as never);

    const result = await getActiveHoldingsByMeeple();

    expect(result.map((entry) => entry.memberName)).toEqual(["Anna", "Zoe"]);
  });

  it("includes a member who is only receiving a return for storage (#272)", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([
      holding({
        vereinsmitglied: member({
          id: "member-1",
          meeple: { displayName: "Kassenwart Anna", neonAuthUserId: "auth-1" },
        }),
      }),
    ] as never);

    const result = await getActiveHoldingsByMeeple();

    expect(result).toHaveLength(1);
    expect(result[0].vereinsmitgliedId).toBe("member-1");
  });

  it("marks a Member with no Meeple login as nicht verfügbar (#333)", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([
      holding({ vereinsmitglied: member({ meeple: null }) }),
    ] as never);

    const result = await getActiveHoldingsByMeeple();

    expect(result[0].verfuegbar).toBe(false);
  });

  it("returns an empty list when nothing is currently held by a person", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([]);

    const result = await getActiveHoldingsByMeeple();

    expect(result).toEqual([]);
  });
});

describe("getActiveHoldingsForMember (#383)", () => {
  it("scopes the query to a single member and its open holdings", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([
      {
        gameCopyId: "copy-1",
        startedAt: new Date("2026-08-01"),
        confirmedAt: new Date("2026-08-01"),
        gameCopy: {
          condition: null,
          ruleBookLanguages: [],
          inventoryNumber: null,
          boardGame: { id: "bg-ark-nova", title: "Ark Nova", slug: "ark-nova" },
        },
      },
    ] as never);

    const result = await getActiveHoldingsForMember("member-1");

    expect(prismaMock.gameHolding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vereinsmitgliedId: "member-1", endedAt: null },
      }),
    );
    expect(result).toEqual([
      {
        gameCopyId: "copy-1",
        boardGameId: "bg-ark-nova",
        boardGameTitle: "Ark Nova",
        boardGameSlug: "ark-nova",
        startedAt: new Date("2026-08-01"),
        locationChain: "",
        condition: null,
        ruleBookLanguages: [],
        inventoryNumber: null,
        isUnconfirmed: false,
      },
    ]);
  });

  it("returns an empty list without open holdings", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([]);

    expect(await getActiveHoldingsForMember("member-1")).toEqual([]);
  });
});
