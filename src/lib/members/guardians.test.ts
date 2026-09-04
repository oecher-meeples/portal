import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const requireMemberMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  requireMember: () => requireMemberMock(),
}));

const {
  isGuardianOf,
  listChildrenOf,
  listGuardiansOf,
  listGuardianCandidates,
  addGuardianLink,
  removeGuardianLink,
  assertMaySubmitChangeFor,
} = await import("./guardians");

describe("isGuardianOf (#372)", () => {
  it("returns true when a link exists", async () => {
    prismaMock.memberGuardian.findUnique.mockResolvedValue({
      childMemberId: "child-1",
      guardianMemberId: "guardian-1",
    } as never);

    await expect(isGuardianOf("guardian-1", "child-1")).resolves.toBe(true);
  });

  it("returns false when no link exists", async () => {
    prismaMock.memberGuardian.findUnique.mockResolvedValue(null);

    await expect(isGuardianOf("guardian-1", "child-1")).resolves.toBe(false);
  });
});

describe("listChildrenOf (#372, #376)", () => {
  it("lists children linked to a guardian, including the sibling case", async () => {
    prismaMock.memberGuardian.findMany.mockResolvedValue([
      {
        child: {
          id: "child-1",
          slug: "mitglied-1",
          firstName: "Anna",
          lastName: "Muster",
          memberNumber: 1,
        },
      },
      {
        child: {
          id: "child-2",
          slug: "mitglied-2",
          firstName: "Ben",
          lastName: "Muster",
          memberNumber: 2,
        },
      },
    ] as never);

    const result = await listChildrenOf("guardian-1");

    expect(result).toEqual([
      {
        id: "child-1",
        slug: "mitglied-1",
        displayName: "Anna Muster",
        profilePictureUrl: null,
        profilePictureVisibility: "INTERN",
        meepleId: null,
      },
      {
        id: "child-2",
        slug: "mitglied-2",
        displayName: "Ben Muster",
        profilePictureUrl: null,
        profilePictureVisibility: "INTERN",
        meepleId: null,
      },
    ]);
  });
});

describe("listGuardiansOf (#372)", () => {
  it("lists guardians linked to a child, m:n (multiple guardians)", async () => {
    prismaMock.memberGuardian.findMany.mockResolvedValue([
      {
        guardian: {
          id: "guardian-1",
          slug: "erika",
          firstName: "Erika",
          lastName: null,
          memberNumber: 5,
        },
      },
      {
        guardian: {
          id: "guardian-2",
          slug: "mitglied-6",
          firstName: null,
          lastName: null,
          memberNumber: 6,
        },
      },
    ] as never);

    const result = await listGuardiansOf("child-1");

    // slug (#385): fürs Verlinken auf `ErziehungsberechtigteSection` (Kind-Profil).
    expect(result).toEqual([
      {
        id: "guardian-1",
        slug: "erika",
        displayName: "Erika",
        profilePictureUrl: null,
        profilePictureVisibility: "INTERN",
        meepleId: null,
      },
      {
        id: "guardian-2",
        slug: "mitglied-6",
        displayName: "Mitglied Nr. 6",
        profilePictureUrl: null,
        profilePictureVisibility: "INTERN",
        meepleId: null,
      },
    ]);
  });
});

describe("listGuardianCandidates (#372)", () => {
  it("excludes the member itself", async () => {
    prismaMock.member.findMany.mockResolvedValue([] as never);

    await listGuardianCandidates("member-1");

    expect(prismaMock.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { not: "member-1" } },
      }),
    );
  });
});

describe("addGuardianLink / removeGuardianLink (#372)", () => {
  beforeEach(() => {
    prismaMock.memberGuardian.upsert.mockResolvedValue({} as never);
    prismaMock.memberGuardian.deleteMany.mockResolvedValue({
      count: 1,
    } as never);
  });

  it("refuses to link a member as their own guardian", async () => {
    await expect(addGuardianLink("member-1", "member-1")).rejects.toThrow(
      "Ein Mitglied kann nicht sein eigener Erziehungsberechtigter sein.",
    );
    expect(prismaMock.memberGuardian.upsert).not.toHaveBeenCalled();
  });

  it("upserts the link, idempotent on repeated add", async () => {
    await addGuardianLink("child-1", "guardian-1");

    expect(prismaMock.memberGuardian.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          childMemberId_guardianMemberId: {
            childMemberId: "child-1",
            guardianMemberId: "guardian-1",
          },
        },
        create: { childMemberId: "child-1", guardianMemberId: "guardian-1" },
      }),
    );
  });

  it("removes the link", async () => {
    await removeGuardianLink("child-1", "guardian-1");

    expect(prismaMock.memberGuardian.deleteMany).toHaveBeenCalledWith({
      where: { childMemberId: "child-1", guardianMemberId: "guardian-1" },
    });
  });
});

describe("assertMaySubmitChangeFor (#372)", () => {
  beforeEach(() => {
    requireMemberMock.mockReset();
  });

  it("allows the member themselves", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-1" } });
    prismaMock.member.findUniqueOrThrow.mockResolvedValue({
      meepleId: "meeple-1",
    } as never);

    await expect(assertMaySubmitChangeFor("member-1")).resolves.toBeUndefined();
  });

  it("allows a linked guardian", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-guardian" } });
    prismaMock.member.findUniqueOrThrow.mockResolvedValue({
      meepleId: "meeple-child",
    } as never);
    prismaMock.member.findUnique.mockResolvedValue({
      id: "guardian-member-1",
    } as never);
    prismaMock.memberGuardian.findUnique.mockResolvedValue({
      childMemberId: "child-1",
      guardianMemberId: "guardian-member-1",
    } as never);

    await expect(assertMaySubmitChangeFor("child-1")).resolves.toBeUndefined();
  });

  it("refuses a stranger with no relationship to the target", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-stranger" } });
    prismaMock.member.findUniqueOrThrow.mockResolvedValue({
      meepleId: "meeple-child",
    } as never);
    prismaMock.member.findUnique.mockResolvedValue(null);

    await expect(assertMaySubmitChangeFor("child-1")).rejects.toThrow(
      "Du bist nicht berechtigt, einen Änderungsantrag für dieses Mitglied zu stellen.",
    );
  });
});
