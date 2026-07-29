import { beforeEach, describe, expect, it, vi } from "vitest";

class RedirectError extends Error {}

const requireMeepleMock = vi.fn();
const getMembershipStateMock = vi.fn();
vi.mock("@/lib/meeples", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/meeples")>("@/lib/meeples");
  return {
    ...actual,
    requireMeeple: requireMeepleMock,
    getMembershipState: getMembershipStateMock,
  };
});
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const boardGameFindUniqueMock = vi.fn();
const gameHoldingFindFirstMock = vi.fn();
const meepleFindManyMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    boardGame: { findUnique: (...args: unknown[]) => boardGameFindUniqueMock(...args) },
    gameHolding: {
      findFirst: (...args: unknown[]) => gameHoldingFindFirstMock(...args),
    },
    meeple: { findMany: (...args: unknown[]) => meepleFindManyMock(...args) },
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
  const actual =
    await vi.importActual<typeof import("@/lib/ludothek/holdings")>(
      "@/lib/ludothek/holdings",
    );
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
} = await import("./actions");

const SELF = { id: "meeple-self" };

beforeEach(() => {
  vi.clearAllMocks();
  requireMeepleMock.mockResolvedValue(SELF);
  getMembershipStateMock.mockReturnValue("aktiv");
  borrowGameMock.mockResolvedValue({ id: "holding-new" });
  handOverGameMock.mockResolvedValue({ id: "holding-new" });
  returnGameMock.mockResolvedValue({ id: "holding-new" });
  relocateGameMock.mockResolvedValue({ id: "holding-new" });
  confirmHoldingMock.mockResolvedValue({ id: "holding-new" });
  moveStorageUnitMock.mockResolvedValue({ id: "unit-1" });
});

describe("without a session", () => {
  it("books nothing", async () => {
    requireMeepleMock.mockRejectedValue(new RedirectError("/login"));

    await expect(scanBorrowGame("game-1")).rejects.toThrow(RedirectError);
    expect(borrowGameMock).not.toHaveBeenCalled();
  });
});

describe("scanBorrowGame (Ausbuchen)", () => {
  it("always books out to the acting meeple's own id, ignoring any foreign id in the call", async () => {
    await (
      scanBorrowGame as unknown as (
        boardGameId: string,
        foreignMeepleId?: string,
      ) => Promise<unknown>
    )("game-1", "meeple-someone-else");

    expect(borrowGameMock).toHaveBeenCalledWith({
      boardGameId: "game-1",
      meepleId: "meeple-self",
      recordedByMeepleId: "meeple-self",
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
});

describe("giving actions stay allowed for a resigned meeple", () => {
  it("allows handing a game over to someone else", async () => {
    getMembershipStateMock.mockReturnValue("ausgetreten");

    const result = await scanGiveToMeeple("game-1", "meeple-other");

    expect(result).toEqual({ success: true, value: { id: "holding-new" } });
    expect(handOverGameMock).toHaveBeenCalledWith({
      boardGameId: "game-1",
      toMeepleId: "meeple-other",
      recordedByMeepleId: "meeple-self",
    });
  });

  it("allows returning someone else's loan into a unit — no ownership check", async () => {
    getMembershipStateMock.mockReturnValue("ausgetreten");

    const result = await scanReturnToUnit("game-1", "unit-1");

    expect(result).toEqual({ success: true, value: { id: "holding-new" } });
    expect(returnGameMock).toHaveBeenCalledWith({
      boardGameId: "game-1",
      toUnitId: "unit-1",
      recordedByMeepleId: "meeple-self",
    });
  });

  it("allows relocating a unit", async () => {
    getMembershipStateMock.mockReturnValue("ausgetreten");

    await scanRelocateGame("game-1", "unit-2");

    expect(relocateGameMock).toHaveBeenCalledWith({
      boardGameId: "game-1",
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
    await scanReturnToMeeple("game-1", "meeple-other");

    expect(returnGameMock).toHaveBeenCalledWith({
      boardGameId: "game-1",
      toMeepleId: "meeple-other",
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
      boardGameId: "game-1",
      toUnitId: "unit-new",
      recordedByMeepleId: "meeple-self",
    });
    expect(returnGameMock).not.toHaveBeenCalled();
  });

  it("returns when the game was with a person", async () => {
    gameHoldingFindFirstMock.mockResolvedValue({ unitId: null, meepleId: "meeple-other" });

    await scanPlaceGameInUnit("game-1", "unit-new");

    expect(returnGameMock).toHaveBeenCalledWith({
      boardGameId: "game-1",
      toUnitId: "unit-new",
      recordedByMeepleId: "meeple-self",
    });
    expect(relocateGameMock).not.toHaveBeenCalled();
  });

  it("rejects a game without an open holding instead of guessing", async () => {
    gameHoldingFindFirstMock.mockResolvedValue(null);

    const result = await scanPlaceGameInUnit("game-1", "unit-new");

    expect(result).toEqual({
      error: "Spiel game-1 hat keinen offenen Aufenthalt.",
    });
  });
});

describe("scanGetGameContext", () => {
  it("returns null for an unknown game", async () => {
    boardGameFindUniqueMock.mockResolvedValue(null);
    gameHoldingFindFirstMock.mockResolvedValue(null);

    expect(await scanGetGameContext("game-x")).toBeNull();
  });

  it("marks isSelf when the acting meeple holds the game", async () => {
    boardGameFindUniqueMock.mockResolvedValue({
      id: "game-1",
      title: "Arche Nova",
      status: "ACTIVE",
    });
    gameHoldingFindFirstMock.mockResolvedValue({
      id: "holding-1",
      confirmedAt: null,
      unitId: null,
      meepleId: "meeple-self",
      unit: null,
      meeple: null,
    });

    const context = await scanGetGameContext("game-1");

    expect(context?.isSelf).toBe(true);
    expect(context?.holding?.meepleId).toBe("meeple-self");
  });
});

describe("scanListMeeples", () => {
  it("excludes anonymised meeples", async () => {
    meepleFindManyMock.mockResolvedValue([]);

    await scanListMeeples();

    expect(meepleFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { anonymizedAt: null } }),
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
