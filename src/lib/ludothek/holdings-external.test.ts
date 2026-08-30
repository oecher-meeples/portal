import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { confirmExternalReturn, handOverToExternal, rebookHoldingToMember } =
  await import("./holdings-external");
const { HoldingConflictError } = await import("./errors");

const GAME_ID = "game-1";
const MEEPLE_A = "meeple-a";
const MEMBER_A = "member-a";
const ANONYMER_MEEPLE_MEMBER = "member-anonym";

function openHolding(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "holding-1",
    gameCopyId: GAME_ID,
    unitId: null,
    vereinsmitgliedId: null,
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
  prismaMock.gameHolding.update.mockResolvedValue({} as never);
  prismaMock.gameHolding.create.mockResolvedValue({} as never);
});

describe("handOverToExternal (#333b)", () => {
  it("closes the acting Member's holding and opens one on the collective account, immediately confirmed", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ vereinsmitgliedId: MEMBER_A }) as never,
    );

    await handOverToExternal({
      gameCopyId: GAME_ID,
      externalName: "  Erika Musterfrau  ",
      anonymerMeepleVereinsmitgliedId: ANONYMER_MEEPLE_MEMBER,
      recordedByMeepleId: MEEPLE_A,
    });

    expect(prismaMock.gameHolding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        vereinsmitgliedId: ANONYMER_MEEPLE_MEMBER,
        origin: "HANDOVER",
        confirmedAt: expect.any(Date),
        note: "An extern weitergegeben: Erika Musterfrau",
      }),
    });
  });

  it("rejects an empty name", async () => {
    await expect(
      handOverToExternal({
        gameCopyId: GAME_ID,
        externalName: "   ",
        anonymerMeepleVereinsmitgliedId: ANONYMER_MEEPLE_MEMBER,
        recordedByMeepleId: MEEPLE_A,
      }),
    ).rejects.toThrow(HoldingConflictError);
  });

  it("rejects handing over a game that is currently in a unit", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: "unit-1" }) as never,
    );

    await expect(
      handOverToExternal({
        gameCopyId: GAME_ID,
        externalName: "Erika Musterfrau",
        anonymerMeepleVereinsmitgliedId: ANONYMER_MEEPLE_MEMBER,
        recordedByMeepleId: MEEPLE_A,
      }),
    ).rejects.toThrow(HoldingConflictError);
  });
});

describe("rebookHoldingToMember (Spielewart-Umbuchen)", () => {
  it("moves the holding onto the given Member, immediately confirmed", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ vereinsmitgliedId: ANONYMER_MEEPLE_MEMBER }) as never,
    );

    await rebookHoldingToMember({
      gameCopyId: GAME_ID,
      toVereinsmitgliedId: MEMBER_A,
      recordedByMeepleId: MEEPLE_A,
    });

    expect(prismaMock.gameHolding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        vereinsmitgliedId: MEMBER_A,
        origin: "HANDOVER",
        confirmedAt: expect.any(Date),
      }),
    });
  });

  it("rejects rebooking a holding that is currently in a unit", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: "unit-1" }) as never,
    );

    await expect(
      rebookHoldingToMember({
        gameCopyId: GAME_ID,
        toVereinsmitgliedId: MEMBER_A,
        recordedByMeepleId: MEEPLE_A,
      }),
    ).rejects.toThrow(HoldingConflictError);
  });
});

describe("confirmExternalReturn (#333c/d)", () => {
  it("confirms a return whose previous holder had no reachable Meeple login", async () => {
    prismaMock.gameHolding.findUnique.mockResolvedValue(
      openHolding({
        vereinsmitgliedId: MEMBER_A,
        origin: "RETURN",
        confirmedAt: null,
        startedAt: new Date("2026-08-01T10:00:00Z"),
      }) as never,
    );
    prismaMock.gameHolding.findFirst.mockResolvedValue({
      id: "holding-0",
      endedAt: new Date("2026-08-01T10:00:00Z"),
      vereinsmitglied: { meeple: null },
    } as never);

    await confirmExternalReturn({
      holdingId: "holding-1",
      confirmingVereinsmitgliedId: MEMBER_A,
    });

    expect(prismaMock.gameHolding.update).toHaveBeenCalledWith({
      where: { id: "holding-1" },
      data: { confirmedAt: expect.any(Date) },
    });
  });

  it("rejects confirming a return whose previous holder had a reachable Meeple login", async () => {
    prismaMock.gameHolding.findUnique.mockResolvedValue(
      openHolding({
        vereinsmitgliedId: MEMBER_A,
        origin: "RETURN",
        confirmedAt: null,
      }) as never,
    );
    prismaMock.gameHolding.findFirst.mockResolvedValue({
      id: "holding-0",
      vereinsmitglied: { meeple: { neonAuthUserId: "auth-1" } },
    } as never);

    await expect(
      confirmExternalReturn({
        holdingId: "holding-1",
        confirmingVereinsmitgliedId: MEMBER_A,
      }),
    ).rejects.toThrow(HoldingConflictError);
  });

  it("rejects confirmation by someone other than the receiver", async () => {
    prismaMock.gameHolding.findUnique.mockResolvedValue(
      openHolding({
        vereinsmitgliedId: MEMBER_A,
        origin: "RETURN",
        confirmedAt: null,
      }) as never,
    );

    await expect(
      confirmExternalReturn({
        holdingId: "holding-1",
        confirmingVereinsmitgliedId: "someone-else",
      }),
    ).rejects.toThrow(HoldingConflictError);
  });

  it("rejects a non-RETURN holding", async () => {
    prismaMock.gameHolding.findUnique.mockResolvedValue(
      openHolding({
        vereinsmitgliedId: MEMBER_A,
        origin: "HANDOVER",
        confirmedAt: null,
      }) as never,
    );

    await expect(
      confirmExternalReturn({
        holdingId: "holding-1",
        confirmingVereinsmitgliedId: MEMBER_A,
      }),
    ).rejects.toThrow(HoldingConflictError);
  });
});
