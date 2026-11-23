import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { listMembersWithoutLogin } =
  await import("@/lib/members/members-without-login");

const BASE_MEMBER = {
  id: "member-1",
  memberNumber: 1,
  firstName: "Anna",
  lastName: "Muster",
  email: "anna@example.com",
};

describe("listMembersWithoutLogin", () => {
  it("excludes a member with an open invite (#451)", async () => {
    prismaMock.member.findMany.mockResolvedValue([BASE_MEMBER] as never);
    prismaMock.invite.findMany.mockResolvedValue([
      { email: "anna@example.com" },
    ] as never);

    const result = await listMembersWithoutLogin();

    expect(result).toEqual([]);
  });

  it("excludes a member with an open invite regardless of email case", async () => {
    prismaMock.member.findMany.mockResolvedValue([BASE_MEMBER] as never);
    prismaMock.invite.findMany.mockResolvedValue([
      { email: "ANNA@EXAMPLE.COM" },
    ] as never);

    const result = await listMembersWithoutLogin();

    expect(result).toEqual([]);
  });

  it("keeps a member whose invite already expired/was revoked/redeemed", async () => {
    prismaMock.member.findMany.mockResolvedValue([BASE_MEMBER] as never);
    // findOpenInviteByEmail-Bedingung filtert diese Fälle bereits in der
    // Query heraus — hier kommt schlicht keine offene Einladung zurück.
    prismaMock.invite.findMany.mockResolvedValue([] as never);

    const result = await listMembersWithoutLogin();

    expect(result).toEqual([
      {
        id: "member-1",
        memberNumber: 1,
        displayName: "Anna Muster",
        email: "anna@example.com",
      },
    ]);
  });

  it("queries invites with the same open condition as findOpenInviteByEmail", async () => {
    prismaMock.member.findMany.mockResolvedValue([] as never);
    prismaMock.invite.findMany.mockResolvedValue([] as never);

    await listMembersWithoutLogin();

    expect(prismaMock.invite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          redeemedAt: null,
          revokedAt: null,
          expiresAt: expect.objectContaining({ gt: expect.any(Date) }),
        }),
      }),
    );
  });
});
