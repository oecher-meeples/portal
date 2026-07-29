import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const {
  borrowGame,
  confirmHolding,
  GameDeinventarisedError,
  getGameZustand,
  getResponsibleMeeple,
  handOverGame,
  HoldingConflictError,
  isLoanHolding,
  moveStorageUnit,
  relocateGame,
  resolveScannedCode,
  returnGame,
} = await import("./holdings");

const GAME_ID = "game-1";
const UNIT_ID = "unit-1";
const MEEPLE_A = "meeple-a";
const MEEPLE_B = "meeple-b";

function openHolding(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "holding-1",
    boardGameId: GAME_ID,
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
  prismaMock.boardGame.findUnique.mockResolvedValue({
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

describe("borrowGame", () => {
  it("borrows a game out of a storage unit", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );

    await borrowGame({
      boardGameId: GAME_ID,
      meepleId: MEEPLE_A,
      recordedByMeepleId: MEEPLE_A,
    });

    expect(prismaMock.gameHolding.update).toHaveBeenCalledWith({
      where: { id: "holding-1" },
      data: { endedAt: expect.any(Date) },
    });
    expect(prismaMock.gameHolding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        boardGameId: GAME_ID,
        meepleId: MEEPLE_A,
        origin: "LOAN",
        recordedByMeepleId: MEEPLE_A,
        confirmedAt: expect.any(Date),
      }),
    });
  });

  it("allows borrowing a game whose completeness check is still pending", async () => {
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: GAME_ID,
      status: "ACTIVE",
      needsCompletenessCheck: true,
    } as never);
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );

    await expect(
      borrowGame({ boardGameId: GAME_ID, meepleId: MEEPLE_A, recordedByMeepleId: MEEPLE_A }),
    ).resolves.toBeDefined();
  });

  it("rejects borrowing a game that is already with a person", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ meepleId: MEEPLE_B }) as never,
    );

    await expect(
      borrowGame({ boardGameId: GAME_ID, meepleId: MEEPLE_A, recordedByMeepleId: MEEPLE_A }),
    ).rejects.toThrow(HoldingConflictError);
  });

  it("rejects borrowing a deinventarised game", async () => {
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: GAME_ID,
      status: "DEINVENTARISED",
    } as never);
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );

    await expect(
      borrowGame({ boardGameId: GAME_ID, meepleId: MEEPLE_A, recordedByMeepleId: MEEPLE_A }),
    ).rejects.toThrow(GameDeinventarisedError);
  });

  it("leaves the holding unconfirmed when the handing-out side records it", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );

    await borrowGame({
      boardGameId: GAME_ID,
      meepleId: MEEPLE_A,
      recordedByMeepleId: MEEPLE_B,
    });

    expect(prismaMock.gameHolding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ confirmedAt: null }),
    });
  });
});

describe("handOverGame (Weitergabe)", () => {
  it("hands the game to the next person and counts as a loan", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ meepleId: MEEPLE_A }) as never,
    );

    await handOverGame({
      boardGameId: GAME_ID,
      toMeepleId: MEEPLE_B,
      recordedByMeepleId: MEEPLE_B,
    });

    const created = prismaMock.gameHolding.create.mock.calls[0][0] as {
      data: { origin: string; meepleId: string };
    };
    expect(created.data.origin).toBe("HANDOVER");
    expect(isLoanHolding(created.data as never)).toBe(true);
  });

  it("rejects handing over a game that is currently in a unit", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );

    await expect(
      handOverGame({ boardGameId: GAME_ID, toMeepleId: MEEPLE_B, recordedByMeepleId: MEEPLE_B }),
    ).rejects.toThrow(HoldingConflictError);
  });
});

describe("returnGame (Rückgabe)", () => {
  it("returning into a unit is immediately confirmed", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ meepleId: MEEPLE_A }) as never,
    );

    await returnGame({
      boardGameId: GAME_ID,
      toUnitId: UNIT_ID,
      recordedByMeepleId: MEEPLE_A,
    });

    const created = prismaMock.gameHolding.create.mock.calls[0][0] as {
      data: { origin: string; unitId: string; confirmedAt: Date | null; meepleId?: string };
    };
    expect(created.data.origin).toBe("RETURN");
    expect(created.data.confirmedAt).toBeInstanceOf(Date);
  });

  it("a return to a person does not count as a loan and stays unconfirmed", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ meepleId: MEEPLE_A }) as never,
    );

    await returnGame({
      boardGameId: GAME_ID,
      toMeepleId: MEEPLE_B,
      recordedByMeepleId: MEEPLE_A,
    });

    const created = prismaMock.gameHolding.create.mock.calls[0][0] as {
      data: { origin: string; meepleId: string; confirmedAt: Date | null };
    };
    expect(created.data.origin).toBe("RETURN");
    expect(created.data.confirmedAt).toBeNull();
    expect(isLoanHolding(created.data as never)).toBe(false);
  });

  it("rejects returning a game that is already in a unit", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );

    await expect(
      returnGame({ boardGameId: GAME_ID, toUnitId: UNIT_ID, recordedByMeepleId: MEEPLE_A }),
    ).rejects.toThrow(HoldingConflictError);
  });

  it("allows returning a deinventarised game", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ meepleId: MEEPLE_A }) as never,
    );

    await expect(
      returnGame({ boardGameId: GAME_ID, toUnitId: UNIT_ID, recordedByMeepleId: MEEPLE_A }),
    ).resolves.toBeDefined();
    expect(prismaMock.boardGame.findUnique).not.toHaveBeenCalled();
  });
});

describe("relocateGame (Umlagern)", () => {
  it("moves the game to another unit without creating a stage on the mover", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );

    await relocateGame({
      boardGameId: GAME_ID,
      toUnitId: "unit-2",
      recordedByMeepleId: MEEPLE_A,
    });

    const created = prismaMock.gameHolding.create.mock.calls[0][0] as {
      data: { origin: string; unitId: string; meepleId?: string };
    };
    expect(created.data.origin).toBe("RELOCATION");
    expect(created.data.unitId).toBe("unit-2");
    expect(created.data.meepleId).toBeUndefined();
  });

  it("rejects relocating a game that is currently borrowed", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ meepleId: MEEPLE_A }) as never,
    );

    await expect(
      relocateGame({ boardGameId: GAME_ID, toUnitId: "unit-2", recordedByMeepleId: MEEPLE_A }),
    ).rejects.toThrow(HoldingConflictError);
  });
});

describe("confirmHolding", () => {
  it("confirms a handover when the receiver confirms", async () => {
    prismaMock.gameHolding.findUnique.mockResolvedValue(
      openHolding({ meepleId: MEEPLE_B, origin: "HANDOVER", confirmedAt: null }) as never,
    );
    prismaMock.gameHolding.update.mockResolvedValue({} as never);

    await confirmHolding({ holdingId: "holding-1", confirmingMeepleId: MEEPLE_B });

    expect(prismaMock.gameHolding.update).toHaveBeenCalledWith({
      where: { id: "holding-1" },
      data: { confirmedAt: expect.any(Date) },
    });
  });

  it("rejects confirmation by someone other than the receiver", async () => {
    prismaMock.gameHolding.findUnique.mockResolvedValue(
      openHolding({ meepleId: MEEPLE_B, origin: "HANDOVER", confirmedAt: null }) as never,
    );

    await expect(
      confirmHolding({ holdingId: "holding-1", confirmingMeepleId: MEEPLE_A }),
    ).rejects.toThrow(HoldingConflictError);
  });

  it("a Rückgabe can only be confirmed by einlagern, not by confirmHolding", async () => {
    prismaMock.gameHolding.findUnique.mockResolvedValue(
      openHolding({ meepleId: MEEPLE_B, origin: "RETURN", confirmedAt: null }) as never,
    );

    await expect(
      confirmHolding({ holdingId: "holding-1", confirmingMeepleId: MEEPLE_B }),
    ).rejects.toThrow(HoldingConflictError);
  });
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

    expect(await getGameZustand({ id: GAME_ID, status: "ACTIVE" as never })).toBe(
      "frei",
    );
  });

  it("is ausgeliehen when a person holds it", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue({
      ...openHolding({ meepleId: MEEPLE_A }),
      unit: null,
    } as never);

    expect(await getGameZustand({ id: GAME_ID, status: "ACTIVE" as never })).toBe(
      "ausgeliehen",
    );
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

    expect(await getGameZustand({ id: GAME_ID, status: "ACTIVE" as never })).toBe(
      "nicht-erfasst",
    );
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
    prismaMock.boardGame.findMany.mockResolvedValue([{ id: GAME_ID }] as never);

    const result = await resolveScannedCode("OM-BOX-0001");

    expect(result.kind).toBe("unit");
  });

  it("resolves an ean with zero matches to unknown", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([]);

    expect(await resolveScannedCode("5901234123457")).toEqual({
      kind: "unknown",
      raw: "5901234123457",
    });
  });

  it("resolves an ean with one match", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([{ id: GAME_ID }] as never);

    const result = await resolveScannedCode("5901234123457");

    expect(result.kind).toBe("games");
    if (result.kind === "games") {
      expect(result.games).toHaveLength(1);
    }
  });

  it("resolves an ean with several matches", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([
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
    expect(prismaMock.boardGame.findMany).not.toHaveBeenCalled();
  });
});

describe("moveStorageUnit", () => {
  it("closes the previous move and opens a new one", async () => {
    prismaMock.storageUnit.findUnique.mockResolvedValue({
      id: UNIT_ID,
      retiredAt: null,
    } as never);
    prismaMock.storageUnitMove.updateMany.mockResolvedValue({ count: 1 } as never);
    prismaMock.storageUnitMove.create.mockResolvedValue({} as never);
    prismaMock.storageUnit.update.mockResolvedValue({} as never);

    await moveStorageUnit({
      unitId: UNIT_ID,
      recordedByMeepleId: MEEPLE_A,
      keeperMeepleId: MEEPLE_B,
    });

    expect(prismaMock.storageUnitMove.updateMany).toHaveBeenCalledWith({
      where: { unitId: UNIT_ID, endedAt: null },
      data: { endedAt: expect.any(Date) },
    });
    expect(prismaMock.storageUnitMove.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ unitId: UNIT_ID, keeperMeepleId: MEEPLE_B }),
    });
  });
});
