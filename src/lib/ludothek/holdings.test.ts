import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  borrowGame,
  GameDeinventarisedError,
  handOverGame,
  HoldingConflictError,
  isLoanHolding,
  relocateGame,
  returnGame,
} = await import("./holdings");

const GAME_ID = "game-1";
const UNIT_ID = "unit-1";
const MEEPLE_A = "meeple-a";
const MEEPLE_B = "meeple-b";
const MEMBER_A = "member-a";
const MEMBER_B = "member-b";

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

describe("borrowGame", () => {
  it("borrows a game out of a storage unit (isSelf)", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );

    await borrowGame({
      gameCopyId: GAME_ID,
      vereinsmitgliedId: MEMBER_A,
      recordedByMeepleId: MEEPLE_A,
      isSelf: true,
    });

    expect(prismaMock.gameHolding.update).toHaveBeenCalledWith({
      where: { id: "holding-1" },
      data: { endedAt: expect.any(Date) },
    });
    expect(prismaMock.gameHolding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        gameCopyId: GAME_ID,
        vereinsmitgliedId: MEMBER_A,
        origin: "LOAN",
        recordedByMeepleId: MEEPLE_A,
        confirmedAt: expect.any(Date),
      }),
    });
  });

  it("allows borrowing a game whose completeness check is still pending", async () => {
    prismaMock.gameCopy.findUnique.mockResolvedValue({
      id: GAME_ID,
      status: "ACTIVE",
      needsCompletenessCheck: true,
    } as never);
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );

    await expect(
      borrowGame({
        gameCopyId: GAME_ID,
        vereinsmitgliedId: MEMBER_A,
        recordedByMeepleId: MEEPLE_A,
        isSelf: true,
      }),
    ).resolves.toBeDefined();
  });

  it("rejects borrowing a game that is already with a person", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ vereinsmitgliedId: MEMBER_B }) as never,
    );

    await expect(
      borrowGame({
        gameCopyId: GAME_ID,
        vereinsmitgliedId: MEMBER_A,
        recordedByMeepleId: MEEPLE_A,
        isSelf: true,
      }),
    ).rejects.toThrow(HoldingConflictError);
  });

  it("rejects borrowing a deinventarised game", async () => {
    prismaMock.gameCopy.findUnique.mockResolvedValue({
      id: GAME_ID,
      status: "DEINVENTARISED",
    } as never);
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );

    await expect(
      borrowGame({
        gameCopyId: GAME_ID,
        vereinsmitgliedId: MEMBER_A,
        recordedByMeepleId: MEEPLE_A,
        isSelf: true,
      }),
    ).rejects.toThrow(GameDeinventarisedError);
  });

  it("leaves the holding unconfirmed when the handing-out side records it for someone else", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );

    await borrowGame({
      gameCopyId: GAME_ID,
      vereinsmitgliedId: MEMBER_A,
      recordedByMeepleId: MEEPLE_B,
      isSelf: false,
    });

    expect(prismaMock.gameHolding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ confirmedAt: null }),
    });
  });

  it("confirms immediately when the recording Meeple holds games:manage (#274 Spielewart-Pfad, #333a)", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );
    prismaMock.meeple.findUnique.mockResolvedValue({
      neonAuthUserId: "auth-b",
    } as never);
    prismaMock.rolePermission.count.mockResolvedValue(1);

    await borrowGame({
      gameCopyId: GAME_ID,
      vereinsmitgliedId: MEMBER_A,
      recordedByMeepleId: MEEPLE_B,
      isSelf: false,
    });

    expect(prismaMock.rolePermission.count).toHaveBeenCalledWith({
      where: {
        permission: { key: "games:manage" },
        role: { users: { some: { neonAuthUserId: "auth-b" } } },
      },
    });
    expect(prismaMock.gameHolding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ confirmedAt: expect.any(Date) }),
    });
  });

  it("stays unconfirmed when the recording Meeple lacks games:manage", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );
    prismaMock.meeple.findUnique.mockResolvedValue({
      neonAuthUserId: "auth-b",
    } as never);
    prismaMock.rolePermission.count.mockResolvedValue(0);

    await borrowGame({
      gameCopyId: GAME_ID,
      vereinsmitgliedId: MEMBER_A,
      recordedByMeepleId: MEEPLE_B,
      isSelf: false,
    });

    expect(prismaMock.gameHolding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ confirmedAt: null }),
    });
  });
});

describe("handOverGame (Weitergabe)", () => {
  it("hands the game to the next person and counts as a loan", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ vereinsmitgliedId: MEMBER_A }) as never,
    );

    await handOverGame({
      gameCopyId: GAME_ID,
      toVereinsmitgliedId: MEMBER_B,
      recordedByMeepleId: MEEPLE_B,
      isSelf: true,
    });

    const created = prismaMock.gameHolding.create.mock.calls[0][0] as {
      data: { origin: string; vereinsmitgliedId: string };
    };
    expect(created.data.origin).toBe("HANDOVER");
    expect(isLoanHolding(created.data as never)).toBe(true);
  });

  it("rejects handing over a game that is currently in a unit", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );

    await expect(
      handOverGame({
        gameCopyId: GAME_ID,
        toVereinsmitgliedId: MEMBER_B,
        recordedByMeepleId: MEEPLE_B,
        isSelf: true,
      }),
    ).rejects.toThrow(HoldingConflictError);
  });

  it("confirms immediately when a games:manage Meeple hands the game to someone else (#274)", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ vereinsmitgliedId: MEMBER_A }) as never,
    );
    prismaMock.meeple.findUnique.mockResolvedValue({
      neonAuthUserId: "auth-warden",
    } as never);
    prismaMock.rolePermission.count.mockResolvedValue(1);

    await handOverGame({
      gameCopyId: GAME_ID,
      toVereinsmitgliedId: MEMBER_B,
      recordedByMeepleId: "spielewart-1",
      isSelf: false,
    });

    expect(prismaMock.gameHolding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ confirmedAt: expect.any(Date) }),
    });
  });
});

describe("returnGame (Rückgabe)", () => {
  it("returning into a unit is immediately confirmed", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ vereinsmitgliedId: MEMBER_A }) as never,
    );

    await returnGame({
      gameCopyId: GAME_ID,
      toUnitId: UNIT_ID,
      recordedByMeepleId: MEEPLE_A,
    });

    const created = prismaMock.gameHolding.create.mock.calls[0][0] as {
      data: {
        origin: string;
        unitId: string;
        confirmedAt: Date | null;
        vereinsmitgliedId?: string;
      };
    };
    expect(created.data.origin).toBe("RETURN");
    expect(created.data.confirmedAt).toBeInstanceOf(Date);
  });

  it("a return to a person does not count as a loan and stays unconfirmed", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ vereinsmitgliedId: MEMBER_A }) as never,
    );

    await returnGame({
      gameCopyId: GAME_ID,
      toVereinsmitgliedId: MEMBER_B,
      recordedByMeepleId: MEEPLE_A,
    });

    const created = prismaMock.gameHolding.create.mock.calls[0][0] as {
      data: {
        origin: string;
        vereinsmitgliedId: string;
        confirmedAt: Date | null;
      };
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
      returnGame({
        gameCopyId: GAME_ID,
        toUnitId: UNIT_ID,
        recordedByMeepleId: MEEPLE_A,
      }),
    ).rejects.toThrow(HoldingConflictError);
  });

  it("allows returning a deinventarised game", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ vereinsmitgliedId: MEMBER_A }) as never,
    );

    await expect(
      returnGame({
        gameCopyId: GAME_ID,
        toUnitId: UNIT_ID,
        recordedByMeepleId: MEEPLE_A,
      }),
    ).resolves.toBeDefined();
    expect(prismaMock.gameCopy.findUnique).not.toHaveBeenCalled();
  });
});

describe("relocateGame (Umlagern)", () => {
  it("moves the game to another unit without creating a stage on the mover", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ unitId: UNIT_ID }) as never,
    );

    await relocateGame({
      gameCopyId: GAME_ID,
      toUnitId: "unit-2",
      recordedByMeepleId: MEEPLE_A,
    });

    const created = prismaMock.gameHolding.create.mock.calls[0][0] as {
      data: { origin: string; unitId: string; vereinsmitgliedId?: string };
    };
    expect(created.data.origin).toBe("RELOCATION");
    expect(created.data.unitId).toBe("unit-2");
    expect(created.data.vereinsmitgliedId).toBeUndefined();
  });

  it("rejects relocating a game that is currently borrowed", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(
      openHolding({ vereinsmitgliedId: MEMBER_A }) as never,
    );

    await expect(
      relocateGame({
        gameCopyId: GAME_ID,
        toUnitId: "unit-2",
        recordedByMeepleId: MEEPLE_A,
      }),
    ).rejects.toThrow(HoldingConflictError);
  });
});
