import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

class RedirectError extends Error {}

const requireMeeplePermissionMock = vi.fn();
const getMembershipStateMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return {
    ...actual,
    requireMeeplePermission: requireMeeplePermissionMock,
    getMembershipState: getMembershipStateMock,
  };
});
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const gameCopyFindUniqueMock = vi.fn();
const gameHoldingFindFirstMock = vi.fn();
const meepleFindManyMock = vi.fn();
const memberFindUniqueMock = vi.fn();
vi.mock("@/lib/utils/prisma", () => ({
  prisma: {
    gameCopy: {
      findUnique: (...args: unknown[]) => gameCopyFindUniqueMock(...args),
    },
    gameHolding: {
      findFirst: (...args: unknown[]) => gameHoldingFindFirstMock(...args),
    },
    meeple: { findMany: (...args: unknown[]) => meepleFindManyMock(...args) },
    member: {
      findUnique: (...args: unknown[]) => memberFindUniqueMock(...args),
    },
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (target: string) => {
    throw new RedirectError(target);
  },
}));

const borrowGameMock = vi.fn();
const handOverGameMock = vi.fn();
const returnGameMock = vi.fn();
const relocateGameMock = vi.fn();
const confirmHoldingMock = vi.fn();
const moveStorageUnitMock = vi.fn();
const resolveScannedCodeMock = vi.fn();

vi.mock("@/lib/ludothek/holdings", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/ludothek/holdings")
  >("@/lib/ludothek/holdings");
  return {
    ...actual,
    borrowGame: (...args: unknown[]) => borrowGameMock(...args),
    handOverGame: (...args: unknown[]) => handOverGameMock(...args),
    returnGame: (...args: unknown[]) => returnGameMock(...args),
    relocateGame: (...args: unknown[]) => relocateGameMock(...args),
    confirmHolding: (...args: unknown[]) => confirmHoldingMock(...args),
    moveStorageUnit: (...args: unknown[]) => moveStorageUnitMock(...args),
    resolveScannedCode: (...args: unknown[]) => resolveScannedCodeMock(...args),
  };
});

const {
  scanAcceptHandover,
  scanAcceptReturn,
  scanBorrowGame,
  scanConfirmHolding,
  scanEinlagernUnit,
  scanGetGameContext,
  scanGiveToMeeple,
  scanListMeeples,
  scanPlaceGameInUnit,
  scanRelocateGame,
  scanResolveCode,
  scanReturnToMeeple,
  scanReturnToUnit,
} = await import("./holding-actions");

const SELF = { id: "meeple-self", anonymizedAt: null };
const OWN_MEMBER = { id: "member-self" };

beforeEach(() => {
  vi.clearAllMocks();
  requireMeeplePermissionMock.mockResolvedValue(SELF);
  getMembershipStateMock.mockReturnValue("aktiv");
  // Own-Member lookup (requireActingMeeple) resolves by default; individual
  // tests override for a target-Meeple lookup (requireMemberForMeeple).
  memberFindUniqueMock.mockImplementation(
    ({ where }: { where: { meepleId: string } }) =>
      where.meepleId === SELF.id
        ? Promise.resolve(OWN_MEMBER)
        : Promise.resolve(null),
  );
  borrowGameMock.mockResolvedValue({ id: "holding-new" });
  handOverGameMock.mockResolvedValue({ id: "holding-new" });
  returnGameMock.mockResolvedValue({ id: "holding-new" });
  relocateGameMock.mockResolvedValue({ id: "holding-new" });
  confirmHoldingMock.mockResolvedValue({ id: "holding-new" });
  moveStorageUnitMock.mockResolvedValue({ id: "unit-1" });
});

describe("without a session", () => {
  it("books nothing", async () => {
    requireMeeplePermissionMock.mockRejectedValue(new RedirectError("/login"));

    await expect(scanBorrowGame("game-1")).rejects.toThrow(RedirectError);
    expect(borrowGameMock).not.toHaveBeenCalled();
  });
});

describe("scanBorrowGame (Ausbuchen)", () => {
  it("books out to the acting meeple's own linked Member, isSelf true", async () => {
    await scanBorrowGame("game-1");

    expect(borrowGameMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      vereinsmitgliedId: "member-self",
      recordedByMeepleId: "meeple-self",
      isSelf: true,
    });
  });

  it("blocks a resigned (ausgetreten) meeple from borrowing", async () => {
    getMembershipStateMock.mockReturnValue("ausgetreten");

    const result = await scanBorrowGame("game-1");

    expect(result).toEqual({
      error: "Ausgetretene Mitglieder können keine Spiele mehr annehmen.",
    });
    expect(borrowGameMock).not.toHaveBeenCalled();
  });

  it("rejects a Meeple with no linked Vereinsmitglied instead of silently 500ing", async () => {
    memberFindUniqueMock.mockResolvedValue(null);

    const result = await scanBorrowGame("game-1");

    expect(result).toEqual({
      error:
        "Dieses Konto ist mit keinem Vereinsmitglied verknüpft — Ausleihen/Rückgeben ist nur für Vereinsmitglieder möglich.",
    });
    expect(borrowGameMock).not.toHaveBeenCalled();
  });
});

describe("scanAcceptHandover / scanConfirmHolding (annehmen)", () => {
  it("blocks a resigned meeple from accepting a handover", async () => {
    getMembershipStateMock.mockReturnValue("ausgetreten");

    const result = await scanAcceptHandover("game-1");

    expect(result).toEqual({
      error: "Ausgetretene Mitglieder können keine Spiele mehr annehmen.",
    });
    expect(handOverGameMock).not.toHaveBeenCalled();
  });

  it("blocks a resigned meeple from confirming a holding", async () => {
    getMembershipStateMock.mockReturnValue("ausgetreten");

    const result = await scanConfirmHolding("holding-1");

    expect(result).toEqual({
      error: "Ausgetretene Mitglieder können keine Spiele mehr annehmen.",
    });
    expect(confirmHoldingMock).not.toHaveBeenCalled();
  });

  it("blocks a resigned meeple from accepting a return", async () => {
    getMembershipStateMock.mockReturnValue("ausgetreten");

    const result = await scanAcceptReturn("game-1");

    expect(result).toEqual({
      error: "Ausgetretene Mitglieder können keine Spiele mehr annehmen.",
    });
    expect(returnGameMock).not.toHaveBeenCalled();
  });

  it("scanConfirmHolding confirms using the acting Meeple's own Member id", async () => {
    await scanConfirmHolding("holding-1");

    expect(confirmHoldingMock).toHaveBeenCalledWith({
      holdingId: "holding-1",
      confirmingVereinsmitgliedId: "member-self",
    });
  });
});

describe("giving actions stay allowed for a resigned meeple", () => {
  it("allows handing a game over to someone else, resolving their Member id", async () => {
    getMembershipStateMock.mockReturnValue("ausgetreten");
    memberFindUniqueMock.mockImplementation(
      ({ where }: { where: { meepleId: string } }) =>
        Promise.resolve(
          where.meepleId === "meeple-other" ? { id: "member-other" } : null,
        ),
    );

    const result = await scanGiveToMeeple("game-1", "meeple-other");

    expect(result).toEqual({ success: true, value: { id: "holding-new" } });
    expect(handOverGameMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      toVereinsmitgliedId: "member-other",
      recordedByMeepleId: "meeple-self",
      isSelf: false,
    });
  });

  it("allows returning someone else's loan into a unit — no ownership check", async () => {
    getMembershipStateMock.mockReturnValue("ausgetreten");

    const result = await scanReturnToUnit("game-1", "unit-1");

    expect(result).toEqual({ success: true, value: { id: "holding-new" } });
    expect(returnGameMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      toUnitId: "unit-1",
      recordedByMeepleId: "meeple-self",
    });
  });

  it("allows relocating a unit", async () => {
    getMembershipStateMock.mockReturnValue("ausgetreten");

    await scanRelocateGame("game-1", "unit-2");

    expect(relocateGameMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      toUnitId: "unit-2",
      recordedByMeepleId: "meeple-self",
    });
  });

  it("allows einlagern (moving a storage unit)", async () => {
    getMembershipStateMock.mockReturnValue("ausgetreten");

    await scanEinlagernUnit("unit-1", { locationNote: "Keller" });

    expect(moveStorageUnitMock).toHaveBeenCalledWith({
      unitId: "unit-1",
      recordedByMeepleId: "meeple-self",
      locationNote: "Keller",
    });
  });
});

describe("scanReturnToMeeple", () => {
  it("records a return to a person, distinct from a handover", async () => {
    memberFindUniqueMock.mockImplementation(
      ({ where }: { where: { meepleId: string } }) =>
        Promise.resolve(
          where.meepleId === "meeple-other" ? { id: "member-other" } : null,
        ),
    );

    await scanReturnToMeeple("game-1", "meeple-other");

    expect(returnGameMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      toVereinsmitgliedId: "member-other",
      recordedByMeepleId: "meeple-self",
    });
    expect(handOverGameMock).not.toHaveBeenCalled();
  });
});

describe("scanPlaceGameInUnit", () => {
  it("relocates when the game is already in a unit", async () => {
    gameHoldingFindFirstMock.mockResolvedValue({ unitId: "unit-old" });

    await scanPlaceGameInUnit("game-1", "unit-new");

    expect(relocateGameMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      toUnitId: "unit-new",
      recordedByMeepleId: "meeple-self",
    });
    expect(returnGameMock).not.toHaveBeenCalled();
  });

  it("returns when the game was with a person", async () => {
    gameHoldingFindFirstMock.mockResolvedValue({
      unitId: null,
      vereinsmitgliedId: "member-other",
    });

    await scanPlaceGameInUnit("game-1", "unit-new");

    expect(returnGameMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      toUnitId: "unit-new",
      recordedByMeepleId: "meeple-self",
    });
    expect(relocateGameMock).not.toHaveBeenCalled();
  });

  it("rejects a game without an open holding instead of guessing", async () => {
    gameHoldingFindFirstMock.mockResolvedValue(null);

    const result = await scanPlaceGameInUnit("game-1", "unit-new");

    expect(result).toEqual({
      error: "Exemplar game-1 hat keinen offenen Aufenthalt.",
    });
  });
});

describe("scanGetGameContext", () => {
  it("returns null for an unknown game", async () => {
    gameCopyFindUniqueMock.mockResolvedValue(null);
    gameHoldingFindFirstMock.mockResolvedValue(null);

    expect(await scanGetGameContext("game-x")).toBeNull();
  });

  it("marks isSelf and verfuegbar when the acting meeple holds the game", async () => {
    gameCopyFindUniqueMock.mockResolvedValue({
      id: "game-1",
      status: "ACTIVE",
      boardGame: { title: "Arche Nova" },
    });
    gameHoldingFindFirstMock.mockResolvedValue({
      id: "holding-1",
      confirmedAt: null,
      origin: "LOAN",
      unitId: null,
      vereinsmitgliedId: "member-self",
      unit: null,
      vereinsmitglied: {
        firstName: null,
        lastName: null,
        email: "self@example.com",
        meeple: { displayName: "Self", neonAuthUserId: "auth-self" },
      },
    });

    const context = await scanGetGameContext("game-1");

    expect(context?.isSelf).toBe(true);
    expect(context?.holding?.vereinsmitgliedId).toBe("member-self");
    expect(context?.holding?.verfuegbar).toBe(true);
  });

  it("marks nicht verfügbar when the holding Member has no Meeple login", async () => {
    gameCopyFindUniqueMock.mockResolvedValue({
      id: "game-1",
      status: "ACTIVE",
      boardGame: { title: "Arche Nova" },
    });
    gameHoldingFindFirstMock.mockResolvedValue({
      id: "holding-1",
      confirmedAt: new Date(),
      origin: "LOAN",
      unitId: null,
      vereinsmitgliedId: "member-external",
      unit: null,
      vereinsmitglied: {
        firstName: "Erika",
        lastName: "Musterfrau",
        email: "erika@example.com",
        meeple: null,
      },
    });

    const context = await scanGetGameContext("game-1");

    expect(context?.holding?.verfuegbar).toBe(false);
  });
});

describe("scanListMeeples", () => {
  it("excludes anonymised meeples and the collective account", async () => {
    meepleFindManyMock.mockResolvedValue([]);

    await scanListMeeples();

    expect(meepleFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { anonymizedAt: null, displayName: { not: "Anonymer Meeple" } },
      }),
    );
  });
});

describe("scanResolveCode", () => {
  it("returns a defined not-found value instead of throwing on lookup errors", async () => {
    resolveScannedCodeMock.mockRejectedValue(new Error("db exploded"));

    const result = await scanResolveCode("garbage");

    expect(result).toEqual({ kind: "unknown", raw: "garbage" });
  });

  it("passes through a successful resolution", async () => {
    resolveScannedCodeMock.mockResolvedValue({ kind: "games", games: [] });

    const result = await scanResolveCode("5901234123457");

    expect(result).toEqual({ kind: "games", games: [] });
  });
});
