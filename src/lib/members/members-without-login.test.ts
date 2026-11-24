import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { listMembersWithoutLogin, listMissingInviteCandidates } =
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

describe("listMissingInviteCandidates (#622)", () => {
  const NOW = new Date("2026-11-24T12:00:00Z");
  const PAST = new Date("2026-11-01T00:00:00Z");
  const FUTURE = new Date("2026-12-01T00:00:00Z");

  function invite(
    email: string,
    fields: Partial<{
      redeemedAt: Date | null;
      revokedAt: Date | null;
      expiresAt: Date;
    }>,
  ) {
    return {
      email,
      redeemedAt: null,
      revokedAt: null,
      expiresAt: FUTURE,
      ...fields,
    };
  }

  function member(id: string) {
    return { ...BASE_MEMBER, id, email: `${id}@example.com` };
  }

  it("only queries members with email, without login and not resigned", async () => {
    prismaMock.member.findMany.mockResolvedValue([] as never);

    expect(await listMissingInviteCandidates(NOW)).toEqual([]);
    expect(prismaMock.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { meepleId: null, resignedAt: null, email: { not: null } },
      }),
    );
    expect(prismaMock.invite.findMany).not.toHaveBeenCalled();
  });

  it("includes members without invite or with an expired latest invite", async () => {
    prismaMock.member.findMany.mockResolvedValue([
      member("ohne"),
      member("abgelaufen"),
      member("offen"),
      member("widerrufen"),
      member("eingeloest"),
    ] as never);
    // Neueste zuerst, wie die Abfrage sortiert.
    prismaMock.invite.findMany.mockResolvedValue([
      invite("abgelaufen@example.com", { expiresAt: PAST }),
      invite("offen@example.com", {}),
      invite("widerrufen@example.com", { revokedAt: PAST }),
      invite("eingeloest@example.com", { redeemedAt: PAST }),
    ] as never);

    const result = await listMissingInviteCandidates(NOW);

    expect(result.map((candidate) => candidate.id)).toEqual([
      "ohne",
      "abgelaufen",
    ]);
    expect(prismaMock.invite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });

  it("lets the latest invite decide: an older expired one doesn't lift a newer revocation", async () => {
    prismaMock.member.findMany.mockResolvedValue([
      member("widerrufen"),
      member("erneut"),
    ] as never);
    prismaMock.invite.findMany.mockResolvedValue([
      invite("widerrufen@example.com", { revokedAt: PAST }),
      invite("erneut@example.com", { expiresAt: PAST }),
      invite("widerrufen@example.com", { expiresAt: PAST }),
      invite("erneut@example.com", { revokedAt: PAST }),
    ] as never);

    const result = await listMissingInviteCandidates(NOW);

    expect(result.map((candidate) => candidate.id)).toEqual(["erneut"]);
  });
});
