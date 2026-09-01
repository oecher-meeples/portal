import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requireMeeplePermissionMock = vi.fn();
const getMembershipStateMock = vi.fn();
const ensureMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return {
    ...actual,
    requireMeeplePermission: requireMeeplePermissionMock,
    getMembershipState: getMembershipStateMock,
    ensureMeeple: ensureMeepleMock,
  };
});
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireGamesManagePermissionMock = vi.fn();
vi.mock("@/lib/ludothek/permissions", () => ({
  requireGamesManagePermission: (...args: unknown[]) =>
    requireGamesManagePermissionMock(...args),
}));

const gameCopyFindUniqueMock = vi.fn();
const memberFindUniqueMock = vi.fn();
const memberFindManyMock = vi.fn();
vi.mock("@/lib/utils/prisma", () => ({
  prisma: {
    gameCopy: {
      findUnique: (...args: unknown[]) => gameCopyFindUniqueMock(...args),
    },
    member: {
      findUnique: (...args: unknown[]) => memberFindUniqueMock(...args),
      findMany: (...args: unknown[]) => memberFindManyMock(...args),
    },
  },
}));

const borrowGameMock = vi.fn();
vi.mock("@/lib/ludothek/holdings", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/ludothek/holdings")
  >("@/lib/ludothek/holdings");
  return {
    ...actual,
    borrowGame: (...args: unknown[]) => borrowGameMock(...args),
  };
});

const handOverToExternalMock = vi.fn();
const rebookHoldingToMemberMock = vi.fn();
const confirmExternalReturnMock = vi.fn();
vi.mock("@/lib/ludothek/holdings-external", () => ({
  handOverToExternal: (...args: unknown[]) => handOverToExternalMock(...args),
  rebookHoldingToMember: (...args: unknown[]) =>
    rebookHoldingToMemberMock(...args),
  confirmExternalReturn: (...args: unknown[]) =>
    confirmExternalReturnMock(...args),
}));

const findAnonymerMeepleMemberMock = vi.fn();
vi.mock("@/lib/ludothek/anonymer-meeple", () => ({
  ANONYMER_MEEPLE_NAME: "Anonymer Meeple",
  findAnonymerMeepleMember: (...args: unknown[]) =>
    findAnonymerMeepleMemberMock(...args),
}));

const {
  scanConfirmExternalReturn,
  scanHandOverToExternal,
  scanLendToExternalMember,
  scanListMembers,
  scanRebookToMember,
} = await import("./holding-actions-external");

const SELF = { id: "meeple-self", anonymizedAt: null };
const OWN_MEMBER = { id: "member-self" };

beforeEach(() => {
  vi.clearAllMocks();
  requireMeeplePermissionMock.mockResolvedValue(SELF);
  getMembershipStateMock.mockReturnValue("registriert");
  memberFindUniqueMock.mockResolvedValue(OWN_MEMBER);
  gameCopyFindUniqueMock.mockResolvedValue({
    boardGame: { slug: "arche-nova" },
  });
  handOverToExternalMock.mockResolvedValue({ id: "holding-new" });
  rebookHoldingToMemberMock.mockResolvedValue({ id: "holding-new" });
  confirmExternalReturnMock.mockResolvedValue({ id: "holding-new" });
  borrowGameMock.mockResolvedValue({ id: "holding-new" });
});

describe("scanHandOverToExternal (#333b, self-service)", () => {
  it("hands over to the collective account, resolved via findAnonymerMeepleMember", async () => {
    findAnonymerMeepleMemberMock.mockResolvedValue({
      id: "member-anonym",
      meepleId: "meeple-anonym",
    });

    const result = await scanHandOverToExternal("game-1", "Erika Musterfrau");

    expect(result).toEqual({ success: true, value: { id: "holding-new" } });
    expect(handOverToExternalMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      externalName: "Erika Musterfrau",
      anonymerMeepleVereinsmitgliedId: "member-anonym",
      recordedByMeepleId: "meeple-self",
    });
  });

  it("surfaces a missing collective account instead of a silent 500", async () => {
    findAnonymerMeepleMemberMock.mockResolvedValue(null);

    const result = await scanHandOverToExternal("game-1", "Erika Musterfrau");

    expect(result).toEqual({
      error: expect.stringContaining("Sammelkonto"),
    });
    expect(handOverToExternalMock).not.toHaveBeenCalled();
  });
});

describe("scanLendToExternalMember (#333a, games:manage)", () => {
  it("rejects without games:manage", async () => {
    requireGamesManagePermissionMock.mockResolvedValue(null);

    const result = await scanLendToExternalMember("game-1", "member-x");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(borrowGameMock).not.toHaveBeenCalled();
  });

  it("lends to the given Member, not isSelf", async () => {
    requireGamesManagePermissionMock.mockResolvedValue({ id: "user-1" });
    ensureMeepleMock.mockResolvedValue({ id: "meeple-warden" });

    const result = await scanLendToExternalMember("game-1", "member-x");

    expect(result).toEqual({ success: true, value: { id: "holding-new" } });
    expect(borrowGameMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      vereinsmitgliedId: "member-x",
      recordedByMeepleId: "meeple-warden",
      isSelf: false,
    });
  });
});

describe("scanRebookToMember (Umbuchen, games:manage)", () => {
  it("rejects without games:manage", async () => {
    requireGamesManagePermissionMock.mockResolvedValue(null);

    const result = await scanRebookToMember("game-1", "member-x");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(rebookHoldingToMemberMock).not.toHaveBeenCalled();
  });

  it("rebooks onto the given Member", async () => {
    requireGamesManagePermissionMock.mockResolvedValue({ id: "user-1" });
    ensureMeepleMock.mockResolvedValue({ id: "meeple-warden" });

    await scanRebookToMember("game-1", "member-x");

    expect(rebookHoldingToMemberMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      toVereinsmitgliedId: "member-x",
      recordedByMeepleId: "meeple-warden",
    });
  });
});

describe("scanConfirmExternalReturn (#333c/d)", () => {
  it("confirms using the acting Meeple's own Member id", async () => {
    await scanConfirmExternalReturn("holding-1");

    expect(confirmExternalReturnMock).toHaveBeenCalledWith({
      holdingId: "holding-1",
      confirmingVereinsmitgliedId: "member-self",
    });
  });

  it("blocks a resigned meeple from confirming", async () => {
    getMembershipStateMock.mockReturnValue("ausgetreten");

    const result = await scanConfirmExternalReturn("holding-1");

    expect(result).toEqual({
      error: "Ausgetretene Mitglieder können keine Spiele mehr annehmen.",
    });
    expect(confirmExternalReturnMock).not.toHaveBeenCalled();
  });
});

describe("scanListMembers (#333a/Umbuchen picker, games:manage)", () => {
  it("returns an empty list without games:manage", async () => {
    requireGamesManagePermissionMock.mockResolvedValue(null);

    expect(await scanListMembers()).toEqual([]);
    expect(memberFindManyMock).not.toHaveBeenCalled();
  });

  it("suffixes the collective account, plain names otherwise", async () => {
    requireGamesManagePermissionMock.mockResolvedValue({ id: "user-1" });
    memberFindManyMock.mockResolvedValue([
      {
        id: "member-anonym",
        firstName: null,
        lastName: null,
        email: "anonym@example.invalid",
        meeple: { displayName: "Anonymer Meeple" },
      },
      {
        id: "member-erika",
        firstName: "Erika",
        lastName: "Musterfrau",
        email: "erika@example.com",
        meeple: null,
      },
    ]);

    const result = await scanListMembers();

    expect(result).toEqual([
      { id: "member-anonym", displayName: "Anonymer Meeple (Sammelkonto)" },
      { id: "member-erika", displayName: "Erika Musterfrau" },
    ]);
  });

  it("excludes an ausgetreten member as a target, but keeps the collective account (#405)", async () => {
    requireGamesManagePermissionMock.mockResolvedValue({ id: "user-1" });
    memberFindManyMock.mockResolvedValue([
      {
        id: "member-active",
        firstName: "Erika",
        lastName: "Musterfrau",
        email: "erika@example.com",
        meepleId: "m1",
        resignedAt: null,
        membershipEndsAt: null,
        meeple: { displayName: "Erika", anonymizedAt: null },
      },
      {
        id: "member-ausgetreten",
        firstName: "Max",
        lastName: "Mustermann",
        email: "max@example.com",
        meepleId: "m2",
        resignedAt: new Date("2020-01-01"),
        membershipEndsAt: new Date("2020-12-31"),
        meeple: { displayName: "Max", anonymizedAt: null },
      },
      {
        id: "member-anonym",
        firstName: null,
        lastName: null,
        email: "anonym@example.invalid",
        meepleId: "m3",
        resignedAt: new Date("2019-01-01"),
        membershipEndsAt: new Date("2019-12-31"),
        meeple: { displayName: "Anonymer Meeple", anonymizedAt: null },
      },
    ]);

    const result = await scanListMembers();

    expect(result).toEqual([
      { id: "member-active", displayName: "Erika Musterfrau" },
      { id: "member-anonym", displayName: "Anonymer Meeple (Sammelkonto)" },
    ]);
  });
});
