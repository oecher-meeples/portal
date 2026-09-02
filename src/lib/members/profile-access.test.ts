import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const hasPermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  hasPermission: (...args: unknown[]) => hasPermissionMock(...args),
}));

const isGuardianOfMock = vi.fn();
vi.mock("@/lib/members/guardians", () => ({
  isGuardianOf: (...args: unknown[]) => isGuardianOfMock(...args),
}));

const { canAccessMemberProfile, canViewBankSection, loadProfileViewerContext } =
  await import("./profile-access");

function context(
  overrides: Partial<Parameters<typeof canAccessMemberProfile>[1]> = {},
) {
  return {
    currentMeepleId: "meeple-1",
    currentMemberId: "member-1",
    isAdmin: false,
    canManageMembers: false,
    canReadBank: false,
    canManageGames: false,
    isGuardianOfTarget: false,
    ...overrides,
  };
}

describe("canAccessMemberProfile (#379)", () => {
  it("denies a stranger with no relevant permission or relationship", () => {
    expect(canAccessMemberProfile({ meepleId: "other" }, context())).toBe(
      false,
    );
  });

  it("grants access via admin:access", () => {
    expect(
      canAccessMemberProfile({ meepleId: "other" }, context({ isAdmin: true })),
    ).toBe(true);
  });

  it("grants access via members:manage", () => {
    expect(
      canAccessMemberProfile(
        { meepleId: "other" },
        context({ canManageMembers: true }),
      ),
    ).toBe(true);
  });

  it("grants access via bank:read", () => {
    expect(
      canAccessMemberProfile(
        { meepleId: "other" },
        context({ canReadBank: true }),
      ),
    ).toBe(true);
  });

  it("grants access via games:manage", () => {
    expect(
      canAccessMemberProfile(
        { meepleId: "other" },
        context({ canManageGames: true }),
      ),
    ).toBe(true);
  });

  it("grants access to the profile's own meeple", () => {
    expect(
      canAccessMemberProfile(
        { meepleId: "meeple-1" },
        context({ currentMeepleId: "meeple-1" }),
      ),
    ).toBe(true);
  });

  it("grants access to a linked guardian", () => {
    expect(
      canAccessMemberProfile(
        { meepleId: null },
        context({ isGuardianOfTarget: true }),
      ),
    ).toBe(true);
  });
});

describe("canViewBankSection (#381)", () => {
  it("denies a Spielewart despite page access via games:manage", () => {
    expect(
      canViewBankSection(
        { meepleId: "other" },
        context({ canManageGames: true }),
      ),
    ).toBe(false);
  });

  it("denies admin:access alone", () => {
    expect(
      canViewBankSection({ meepleId: "other" }, context({ isAdmin: true })),
    ).toBe(false);
  });

  it("grants access via bank:read", () => {
    expect(
      canViewBankSection({ meepleId: "other" }, context({ canReadBank: true })),
    ).toBe(true);
  });

  it("grants access via members:manage", () => {
    expect(
      canViewBankSection(
        { meepleId: "other" },
        context({ canManageMembers: true }),
      ),
    ).toBe(true);
  });

  it("grants access to the profile's own meeple", () => {
    expect(
      canViewBankSection(
        { meepleId: "meeple-1" },
        context({ currentMeepleId: "meeple-1" }),
      ),
    ).toBe(true);
  });
});

describe("loadProfileViewerContext (#379)", () => {
  beforeEach(() => {
    hasPermissionMock.mockReset().mockResolvedValue(false);
    isGuardianOfMock.mockReset().mockResolvedValue(false);
    prismaMock.member.findUnique.mockResolvedValue(null);
  });

  it("resolves isGuardianOfTarget only when the caller has an own Member", async () => {
    prismaMock.member.findUnique.mockResolvedValue(null);

    const result = await loadProfileViewerContext(
      { user: { id: "user-1" }, meeple: { id: "meeple-1" } },
      "child-1",
    );

    expect(result.currentMemberId).toBeNull();
    expect(result.isGuardianOfTarget).toBe(false);
    expect(isGuardianOfMock).not.toHaveBeenCalled();
  });

  it("checks the guardian link when the caller has an own Member", async () => {
    prismaMock.member.findUnique.mockResolvedValue({ id: "own-1" } as never);
    isGuardianOfMock.mockResolvedValue(true);

    const result = await loadProfileViewerContext(
      { user: { id: "user-1" }, meeple: { id: "meeple-1" } },
      "child-1",
    );

    expect(isGuardianOfMock).toHaveBeenCalledWith("own-1", "child-1");
    expect(result.isGuardianOfTarget).toBe(true);
  });
});
