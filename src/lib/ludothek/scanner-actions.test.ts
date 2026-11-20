import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

class RedirectError extends Error {}

const getMembershipStateMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/action-guards", async () => {
  const guards = await import("@/lib/__mocks__/action-guards");
  return guards.actionGuardsFrom(
    guards.holdingActorResolver({
      actingMeeple: async () => SELF,
      gamesManager: async () => null,
      findMember: (args) => memberFindUniqueMock(args),
      membershipState: () => getMembershipStateMock(),
    }),
  );
});
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect: (target: string) => {
    throw new RedirectError(target);
  },
}));

const gameCopyFindUniqueMock = vi.fn();
const gameCopyFindManyMock = vi.fn();
const memberFindUniqueMock = vi.fn();
const meepleFindUniqueMock = vi.fn();
vi.mock("@/lib/utils/prisma", () => ({
  prisma: {
    gameCopy: {
      findUnique: (...args: unknown[]) => gameCopyFindUniqueMock(...args),
      findMany: (...args: unknown[]) => gameCopyFindManyMock(...args),
    },
    member: {
      findUnique: (...args: unknown[]) => memberFindUniqueMock(...args),
    },
    meeple: {
      findUnique: (...args: unknown[]) => meepleFindUniqueMock(...args),
    },
  },
}));

const borrowGameMock = vi.fn();
const handOverGameMock = vi.fn();
const returnGameMock = vi.fn();
const relocateGameMock = vi.fn();
const confirmHoldingMock = vi.fn();
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
  };
});
const handOverToExternalMock = vi.fn();
vi.mock("@/lib/ludothek/holdings-external", () => ({
  handOverToExternal: (...args: unknown[]) => handOverToExternalMock(...args),
}));
const findAnonymerMeepleMemberMock = vi.fn();
vi.mock("@/lib/ludothek/anonymer-meeple", () => ({
  ANONYMER_MEEPLE_NAME: "Anonymer Meeple",
  findAnonymerMeepleMember: () => findAnonymerMeepleMemberMock(),
}));

const { scanPickCopy, scanReceiveGame, scanTransferGame, scanValidateTarget } =
  await import("./scanner-actions");

const SELF = { id: "meeple-self", anonymizedAt: null };
const OWN_MEMBER = { id: "member-self" };
const OTHER_MEMBER = { id: "member-b" };
const RESIGNED = {
  resignedAt: new Date("2024-07-01T00:00:00Z"),
  membershipEndsAt: new Date("2025-01-01T00:00:00Z"),
};

const CONFIRMED = { confirmedAt: new Date() };
const UNCONFIRMED = { confirmedAt: null };

function holdingAt(holding: {
  unitId?: string | null;
  vereinsmitgliedId?: string | null;
  origin?: string;
  confirmedAt?: Date | null;
}) {
  gameCopyFindUniqueMock.mockResolvedValue({
    id: "game-1",
    status: "ACTIVE",
    inventoryNumber: 42,
    boardGame: { title: "Arche Nova", slug: "arche-nova" },
    holdings: [
      {
        id: "holding-1",
        unitId: null,
        vereinsmitgliedId: null,
        origin: "LOAN",
        confirmedAt: new Date(),
        ...holding,
      },
    ],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getMembershipStateMock.mockReturnValue("registriert");
  memberFindUniqueMock.mockImplementation(
    ({ where }: { where: { meepleId: string } }) =>
      Promise.resolve(
        where.meepleId === SELF.id
          ? OWN_MEMBER
          : where.meepleId === "meeple-b"
            ? OTHER_MEMBER
            : where.meepleId === "meeple-gone"
              ? { id: "member-gone", meepleId: "meeple-gone", ...RESIGNED }
              : null,
      ),
  );
  for (const mock of [
    borrowGameMock,
    handOverGameMock,
    relocateGameMock,
    confirmHoldingMock,
    handOverToExternalMock,
  ]) {
    mock.mockResolvedValue(CONFIRMED);
  }
  returnGameMock.mockResolvedValue(CONFIRMED);
  findAnonymerMeepleMemberMock.mockResolvedValue({ id: "member-anon" });
  meepleFindUniqueMock.mockResolvedValue({ id: "meeple-b", displayName: "B" });
});

describe("scanReceiveGame (Modus Erhalten)", () => {
  it("borrows a game from a unit, immediately confirmed", async () => {
    holdingAt({ unitId: "unit-1", origin: "INITIAL" });

    const result = await scanReceiveGame("game-1");

    expect(borrowGameMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      vereinsmitgliedId: "member-self",
      recordedByMeepleId: "meeple-self",
      isSelf: true,
    });
    expect(result).toEqual({
      success: true,
      value: {
        gameCopyId: "game-1",
        outcome: "borrow",
        confirmed: true,
        title: "Arche Nova",
        inventoryNumber: 42,
        boardGameSlug: "arche-nova",
      },
    });
  });

  it("takes over a game from another person as confirmed HANDOVER", async () => {
    holdingAt({ vereinsmitgliedId: "member-gone" });

    const result = await scanReceiveGame("game-1");

    expect(handOverGameMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      toVereinsmitgliedId: "member-self",
      recordedByMeepleId: "meeple-self",
      isSelf: true,
    });
    expect(result).toMatchObject({
      value: { outcome: "handover", confirmed: true },
    });
  });

  it("takes over a RETURN on me as HANDOVER instead of confirming", async () => {
    holdingAt({
      vereinsmitgliedId: "member-self",
      origin: "RETURN",
      confirmedAt: null,
    });

    const result = await scanReceiveGame("game-1");

    expect(confirmHoldingMock).not.toHaveBeenCalled();
    expect(handOverGameMock).toHaveBeenCalledWith(
      expect.objectContaining({ toVereinsmitgliedId: "member-self" }),
    );
    expect(result).toMatchObject({ value: { outcome: "take-over-return" } });
  });

  it("confirms an unconfirmed handover on me", async () => {
    holdingAt({
      vereinsmitgliedId: "member-self",
      origin: "HANDOVER",
      confirmedAt: null,
    });

    await scanReceiveGame("game-1");

    expect(confirmHoldingMock).toHaveBeenCalledWith({
      holdingId: "holding-1",
      confirmingVereinsmitgliedId: "member-self",
    });
  });

  it("books nothing for a confirmed holding on me", async () => {
    holdingAt({ vereinsmitgliedId: "member-self" });

    const result = await scanReceiveGame("game-1");

    expect(result).toMatchObject({
      value: { outcome: "already-mine", confirmed: true },
    });
    expect(handOverGameMock).not.toHaveBeenCalled();
    expect(confirmHoldingMock).not.toHaveBeenCalled();
  });

  it("reports an unknown copy as error", async () => {
    gameCopyFindUniqueMock.mockResolvedValue(null);

    expect(await scanReceiveGame("game-x")).toEqual({
      error: "Exemplar game-x nicht gefunden.",
    });
  });
});

describe("scanTransferGame (Modus Übergeben)", () => {
  describe("Ziel Einheit", () => {
    const target = { kind: "unit" as const, unitId: "unit-k1" };

    it.each([
      [
        "returns a game from a person",
        { vereinsmitgliedId: "member-b" },
        returnGameMock,
        "return-to-unit",
      ],
      [
        "relocates a game from another unit",
        { unitId: "unit-k2" },
        relocateGameMock,
        "relocate",
      ],
    ] as const)("%s into the unit", async (_name, holding, mock, outcome) => {
      holdingAt(holding);

      const result = await scanTransferGame("game-1", target);

      expect(mock).toHaveBeenCalledWith({
        gameCopyId: "game-1",
        toUnitId: "unit-k1",
        recordedByMeepleId: "meeple-self",
      });
      expect(result).toMatchObject({ value: { outcome, confirmed: true } });
    });

    it("books nothing when the game already lies there", async () => {
      holdingAt({ unitId: "unit-k1" });

      const result = await scanTransferGame("game-1", target);

      expect(result).toMatchObject({ value: { outcome: "already-there" } });
      expect(relocateGameMock).not.toHaveBeenCalled();
    });
  });

  describe("Ziel Person", () => {
    const manual = {
      kind: "meeple" as const,
      meepleId: "meeple-b",
      intent: "handover" as const,
      viaTargetQrScan: false,
    };

    it("hands over unconfirmed when the person was picked manually", async () => {
      holdingAt({ vereinsmitgliedId: "member-self" });
      handOverGameMock.mockResolvedValue(UNCONFIRMED);

      const result = await scanTransferGame("game-1", manual);

      expect(handOverGameMock).toHaveBeenCalledWith({
        gameCopyId: "game-1",
        toVereinsmitgliedId: "member-b",
        recordedByMeepleId: "meeple-self",
        isSelf: false,
        viaTargetQrScan: false,
      });
      expect(result).toMatchObject({
        value: { outcome: "handover", confirmed: false },
      });
    });

    it("passes viaTargetQrScan when the person's QR was scanned", async () => {
      holdingAt({ vereinsmitgliedId: "member-self" });

      await scanTransferGame("game-1", { ...manual, viaTargetQrScan: true });

      expect(handOverGameMock).toHaveBeenCalledWith(
        expect.objectContaining({ viaTargetQrScan: true }),
      );
    });

    it("books a RETURN to the person with intent return", async () => {
      holdingAt({ vereinsmitgliedId: "member-self" });

      await scanTransferGame("game-1", { ...manual, intent: "return" });

      expect(returnGameMock).toHaveBeenCalledWith({
        gameCopyId: "game-1",
        toVereinsmitgliedId: "member-b",
        recordedByMeepleId: "meeple-self",
        viaTargetQrScan: false,
      });
      expect(handOverGameMock).not.toHaveBeenCalled();
    });

    it("books nothing when the target person already holds it", async () => {
      holdingAt({ vereinsmitgliedId: "member-b" });

      const result = await scanTransferGame("game-1", manual);

      expect(result).toMatchObject({ value: { outcome: "already-there" } });
      expect(handOverGameMock).not.toHaveBeenCalled();
    });

    it("rejects an ausgetreten target person", async () => {
      holdingAt({ vereinsmitgliedId: "member-self" });

      const result = await scanTransferGame("game-1", {
        ...manual,
        meepleId: "meeple-gone",
      });

      expect(result).toEqual({
        error:
          "Diese Person ist ausgetreten und kann keine Spiele mehr annehmen.",
      });
      expect(handOverGameMock).not.toHaveBeenCalled();
    });
  });

  describe("Ziel extern", () => {
    const target = { kind: "external" as const, externalName: "Max (Gast)" };

    it("hands over to the Sammelkonto with the name", async () => {
      holdingAt({ vereinsmitgliedId: "member-self" });

      const result = await scanTransferGame("game-1", target);

      expect(handOverToExternalMock).toHaveBeenCalledWith({
        gameCopyId: "game-1",
        externalName: "Max (Gast)",
        anonymerMeepleVereinsmitgliedId: "member-anon",
        recordedByMeepleId: "meeple-self",
      });
      expect(result).toMatchObject({
        value: { outcome: "external", confirmed: true },
      });
    });

    it("reports a missing Sammelkonto as error", async () => {
      holdingAt({ vereinsmitgliedId: "member-self" });
      findAnonymerMeepleMemberMock.mockResolvedValue(null);

      expect(await scanTransferGame("game-1", target)).toEqual({
        error:
          'Sammelkonto "Anonymer Meeple" fehlt — bitte den Seed erneut ausführen.',
      });
    });
  });
});

describe("scanValidateTarget", () => {
  it("accepts an active member", async () => {
    expect(await scanValidateTarget("meeple-b")).toEqual({
      success: true,
      value: { meepleId: "meeple-b", displayName: "B" },
    });
  });

  it.each([
    ["meeple-self", "an dich selbst kannst du nicht übergeben."],
    [
      "meeple-gone",
      "Diese Person ist ausgetreten und kann keine Spiele mehr annehmen.",
    ],
    ["meeple-system", "Diese Person ist mit keinem Vereinsmitglied verknüpft."],
  ])("rejects %s", async (meepleId, reason) => {
    expect(await scanValidateTarget(meepleId)).toEqual({
      error: `Ziel ungültig — ${reason}`,
    });
  });
});

describe("scanPickCopy", () => {
  const copyAt = (
    id: string,
    unitId: string | null,
    memberId: string | null,
  ) => ({
    id,
    needsCompletenessCheck: false,
    holdings: [{ unitId, vereinsmitgliedId: memberId }],
  });
  const toB = {
    kind: "meeple",
    meepleId: "meeple-b",
    intent: "handover",
    viaTargetQrScan: false,
  } as const;

  it.each([
    [
      "receive: not yet with me",
      [copyAt("a", null, "member-self"), copyAt("b", "u", null)],
      "receive",
      null,
    ],
    [
      "transfer: not with the target person",
      [copyAt("a", null, "member-b"), copyAt("b", "u", null)],
      "transfer",
      toB,
    ],
    [
      "transfer: not in the target unit",
      [copyAt("a", "k1", null), copyAt("b", "k2", null)],
      "transfer",
      { kind: "unit", unitId: "k1" },
    ],
  ] as const)("picks %s", async (_name, copies, mode, target) => {
    gameCopyFindManyMock.mockResolvedValue(copies);

    expect(await scanPickCopy(["a", "b"], mode, target)).toBe("b");
  });
});

describe("Vier-Augen-Prinzip: ausgetretener Auslöser (#537)", () => {
  it.each([
    ["scanReceiveGame", () => scanReceiveGame("game-1")],
    [
      "scanTransferGame",
      () => scanTransferGame("game-1", { kind: "unit", unitId: "unit-1" }),
    ],
    ["scanValidateTarget", () => scanValidateTarget("meeple-b")],
    ["scanPickCopy", () => scanPickCopy(["a"], "receive")],
  ])("rejects %s", async (_name, call) => {
    getMembershipStateMock.mockReturnValue("ausgetreten");
    holdingAt({ unitId: "unit-2" });

    await expect(call()).rejects.toThrow(RedirectError);
    expect(borrowGameMock).not.toHaveBeenCalled();
    expect(returnGameMock).not.toHaveBeenCalled();
    expect(relocateGameMock).not.toHaveBeenCalled();
  });
});
