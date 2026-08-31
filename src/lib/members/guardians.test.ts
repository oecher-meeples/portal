import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  isGuardianOf,
  listChildrenOf,
  listGuardiansOf,
  listGuardianCandidates,
  addGuardianLink,
  removeGuardianLink,
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
      { id: "child-1", slug: "mitglied-1", displayName: "Anna Muster" },
      { id: "child-2", slug: "mitglied-2", displayName: "Ben Muster" },
    ]);
  });
});

describe("listGuardiansOf (#372)", () => {
  it("lists guardians linked to a child, m:n (multiple guardians)", async () => {
    prismaMock.memberGuardian.findMany.mockResolvedValue([
      {
        guardian: {
          id: "guardian-1",
          firstName: "Erika",
          lastName: null,
          memberNumber: 5,
        },
      },
      {
        guardian: {
          id: "guardian-2",
          firstName: null,
          lastName: null,
          memberNumber: 6,
        },
      },
    ] as never);

    const result = await listGuardiansOf("child-1");

    expect(result).toEqual([
      { id: "guardian-1", displayName: "Erika" },
      { id: "guardian-2", displayName: "Mitglied Nr. 6" },
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
