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
    getMembershipState: getMembershipStateMock,
  };
});
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/action-guards", async () => {
  const guards = await import("@/lib/__mocks__/action-guards");
  return guards.actionGuardsFrom(
    guards.holdingActorResolver({
      actingMeeple: (...args) => requireMeeplePermissionMock(...args),
      gamesManager: () => requireGamesManagePermissionMock(),
      findMember: (args) => memberFindUniqueMock(args),
      membershipState: () => getMembershipStateMock(),
    }),
  );
});

const requireGamesManagePermissionMock = vi.fn();

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
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect: (target: string) => {
    throw new RedirectError(target);
  },
}));

const borrowGameMock = vi.fn();
const handOverGameMock = vi.fn();
const returnGameMock = vi.fn();
const relocateGameMock = vi.fn();
const confirmHoldingMock = vi.fn();
const confirmHoldingAsGamesManagerMock = vi.fn();
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
    confirmHoldingAsGamesManager: (...args: unknown[]) =>
      confirmHoldingAsGamesManagerMock(...args),
    moveStorageUnit: (...args: unknown[]) => moveStorageUnitMock(...args),
    resolveScannedCode: (...args: unknown[]) => resolveScannedCodeMock(...args),
  };
});

const {
  confirmHoldingForGamesManager,
  scanAcceptHandover,
  scanAcceptReturn,
  scanBorrowGame,
  scanConfirmHolding,
  scanEinlagernUnit,
  scanGetGameContext,
  scanGiveToMeeple,
  scanListMeeples,
  scanRelocateGame,
  scanResolveCode,
  scanReturnToUnit,
} = await import("./holding-actions");

const SELF = { id: "meeple-self", anonymizedAt: null };
const OWN_MEMBER = { id: "member-self" };

beforeEach(() => {
  vi.clearAllMocks();
  requireMeeplePermissionMock.mockResolvedValue(SELF);
  getMembershipStateMock.mockReturnValue("registriert");
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
  confirmHoldingAsGamesManagerMock.mockResolvedValue({
    id: "holding-new",
    gameCopyId: "game-1",
  });
  requireGamesManagePermissionMock.mockResolvedValue({ id: "admin-user" });
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

    await expect(scanBorrowGame("game-1")).rejects.toThrow(RedirectError);
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

describe("confirmHoldingForGamesManager (#290)", () => {
  it("confirms a foreign open handover when the caller has games:manage", async () => {
    const result = await confirmHoldingForGamesManager("holding-1");

    expect(confirmHoldingAsGamesManagerMock).toHaveBeenCalledWith("holding-1");
    expect(result).toEqual({
      success: true,
      value: { id: "holding-new", gameCopyId: "game-1" },
    });
  });

  it("rejects without games:manage, without calling the domain layer", async () => {
    requireGamesManagePermissionMock.mockResolvedValue(null);

    const result = await confirmHoldingForGamesManager("holding-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(confirmHoldingAsGamesManagerMock).not.toHaveBeenCalled();
  });
});

describe("scanAcceptHandover / scanConfirmHolding (annehmen)", () => {
  it("blocks a resigned meeple from accepting a handover", async () => {
    getMembershipStateMock.mockReturnValue("ausgetreten");

    await expect(scanAcceptHandover("game-1")).rejects.toThrow(RedirectError);
    expect(handOverGameMock).not.toHaveBeenCalled();
  });

  it("blocks a resigned meeple from confirming a holding", async () => {
    getMembershipStateMock.mockReturnValue("ausgetreten");

    await expect(scanConfirmHolding("holding-1")).rejects.toThrow(
      RedirectError,
    );
    expect(confirmHoldingMock).not.toHaveBeenCalled();
  });

  it("blocks a resigned meeple from accepting a return", async () => {
    getMembershipStateMock.mockReturnValue("ausgetreten");

    await expect(scanAcceptReturn("game-1")).rejects.toThrow(RedirectError);
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

describe("Vier-Augen-Prinzip: ein ausgetretenes Mitglied bucht nichts (#537)", () => {
  it.each([
    ["scanGiveToMeeple", () => scanGiveToMeeple("game-1", "meeple-other")],
    ["scanReturnToUnit", () => scanReturnToUnit("game-1", "unit-1")],
    ["scanRelocateGame", () => scanRelocateGame("game-1", "unit-2")],
    ["scanEinlagernUnit", () => scanEinlagernUnit("unit-1", {})],
    ["scanResolveCode", () => scanResolveCode("inv-1")],
  ])("rejects %s", async (_name, call) => {
    getMembershipStateMock.mockReturnValue("ausgetreten");

    await expect(call()).rejects.toThrow(RedirectError);
    expect(handOverGameMock).not.toHaveBeenCalled();
    expect(returnGameMock).not.toHaveBeenCalled();
    expect(relocateGameMock).not.toHaveBeenCalled();
    expect(moveStorageUnitMock).not.toHaveBeenCalled();
    expect(resolveScannedCodeMock).not.toHaveBeenCalled();
  });

  it("rejects an ausgetreten target person, without booking", async () => {
    memberFindUniqueMock.mockImplementation(
      ({ where }: { where: { meepleId: string } }) =>
        Promise.resolve(
          where.meepleId === "meeple-other"
            ? {
                id: "member-other",
                meepleId: "meeple-other",
                resignedAt: new Date("2024-07-01T00:00:00Z"),
                membershipEndsAt: new Date("2025-01-01T00:00:00Z"),
                meeple: { anonymizedAt: null },
              }
            : OWN_MEMBER,
        ),
    );

    const result = await scanGiveToMeeple("game-1", "meeple-other");

    expect(result).toEqual({
      error:
        "Diese Person ist ausgetreten und kann keine Spiele mehr annehmen.",
    });
    expect(handOverGameMock).not.toHaveBeenCalled();
  });
});

describe("giving actions of an active meeple", () => {
  it("hands a game over to someone else, resolving their Member id", async () => {
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
      viaTargetQrScan: false,
    });
  });

  it("returns someone else's loan into a unit — no ownership check", async () => {
    const result = await scanReturnToUnit("game-1", "unit-1");

    expect(result).toEqual({ success: true, value: { id: "holding-new" } });
    expect(returnGameMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      toUnitId: "unit-1",
      recordedByMeepleId: "meeple-self",
    });
  });

  it("relocates a game", async () => {
    await scanRelocateGame("game-1", "unit-2");

    expect(relocateGameMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      toUnitId: "unit-2",
      recordedByMeepleId: "meeple-self",
    });
  });

  it("einlagert a storage unit", async () => {
    await scanEinlagernUnit("unit-1", { locationNote: "Keller" });

    expect(moveStorageUnitMock).toHaveBeenCalledWith({
      unitId: "unit-1",
      recordedByMeepleId: "meeple-self",
      locationNote: "Keller",
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

  it("excludes an ausgetreten Meeple — it could never confirm a handover to itself (#405)", async () => {
    meepleFindManyMock.mockResolvedValue([
      {
        id: "meeple-active",
        displayName: "Aktiv",
        member: { resignedAt: null, membershipEndsAt: null, meepleId: "m1" },
      },
      {
        id: "meeple-gekuendigt",
        displayName: "Gekündigt",
        member: {
          resignedAt: new Date("2026-01-01"),
          membershipEndsAt: new Date("2099-01-01"),
          meepleId: "m2",
        },
      },
      {
        id: "meeple-ausgetreten",
        displayName: "Ausgetreten",
        member: {
          resignedAt: new Date("2020-01-01"),
          membershipEndsAt: new Date("2020-12-31"),
          meepleId: "m3",
        },
      },
    ]);

    const result = await scanListMeeples();

    expect(result).toEqual([
      { id: "meeple-active", displayName: "Aktiv" },
      { id: "meeple-gekuendigt", displayName: "Gekündigt" },
    ]);
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
