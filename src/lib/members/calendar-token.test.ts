import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const hasPermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  hasPermission: (...args: unknown[]) => hasPermissionMock(...args),
}));

const generateTokenMock = vi.fn();
vi.mock("@/lib/utils/generate-token", () => ({
  generateToken: (...args: unknown[]) => generateTokenMock(...args),
}));

const {
  generateMemberCalendarToken,
  revokeMemberCalendarToken,
  resolveMemberByCalendarToken,
  hashCalendarToken,
  hasOwnCalendarToken,
} = await import("./calendar-token");

describe("hasOwnCalendarToken (#439)", () => {
  it("is true when the login's member has a token hash", async () => {
    prismaMock.member.findFirst.mockResolvedValue({
      calendarTokenHash: "hash",
    } as never);

    expect(await hasOwnCalendarToken("auth-1")).toBe(true);
    expect(prismaMock.member.findFirst).toHaveBeenCalledWith({
      where: { meeple: { neonAuthUserId: "auth-1" } },
      select: { calendarTokenHash: true },
    });
  });

  it("is false without a token or without a member", async () => {
    prismaMock.member.findFirst.mockResolvedValueOnce({
      calendarTokenHash: null,
    } as never);
    expect(await hasOwnCalendarToken("auth-1")).toBe(false);

    prismaMock.member.findFirst.mockResolvedValueOnce(null);
    expect(await hasOwnCalendarToken("auth-1")).toBe(false);
  });
});

describe("generateMemberCalendarToken (#438)", () => {
  it("stores only the hash, never the raw token", async () => {
    generateTokenMock.mockReturnValue("raw-token-value");

    const token = await generateMemberCalendarToken("member-1");

    expect(token).toBe("raw-token-value");
    expect(prismaMock.member.update).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: {
        calendarTokenHash: hashCalendarToken("raw-token-value"),
        calendarTokenCreatedAt: expect.any(Date),
      },
    });
    const [[call]] = prismaMock.member.update.mock.calls;
    expect(call.data.calendarTokenHash).not.toBe("raw-token-value");
  });

  it("replaces an existing token — the old one stops working", async () => {
    generateTokenMock
      .mockReturnValueOnce("first")
      .mockReturnValueOnce("second");

    await generateMemberCalendarToken("member-1");
    await generateMemberCalendarToken("member-1");

    expect(prismaMock.member.update).toHaveBeenCalledTimes(2);
    const secondCall = prismaMock.member.update.mock.calls[1][0];
    expect(secondCall.data.calendarTokenHash).toBe(hashCalendarToken("second"));
    expect(secondCall.data.calendarTokenHash).not.toBe(
      hashCalendarToken("first"),
    );
  });
});

describe("revokeMemberCalendarToken (#438)", () => {
  it("clears both fields", async () => {
    await revokeMemberCalendarToken("member-1");

    expect(prismaMock.member.update).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { calendarTokenHash: null, calendarTokenCreatedAt: null },
    });
  });
});

function activeMember(overrides: Record<string, unknown> = {}) {
  return {
    id: "member-1",
    meepleId: "meeple-1",
    resignedAt: null,
    membershipEndsAt: null,
    meeple: { neonAuthUserId: "auth-1", anonymizedAt: null },
    ...overrides,
  } as never;
}

describe("resolveMemberByCalendarToken (#438)", () => {
  it("looks up the member by the token's hash, not the raw value", async () => {
    prismaMock.member.findUnique.mockResolvedValue(activeMember());
    hasPermissionMock.mockResolvedValue(true);

    const result = await resolveMemberByCalendarToken("raw-token-value");

    expect(prismaMock.member.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { calendarTokenHash: hashCalendarToken("raw-token-value") },
      }),
    );
    expect(hasPermissionMock).toHaveBeenCalledWith(
      "auth-1",
      "news:internal:view",
    );
    expect(result).toEqual({ id: "member-1" });
  });

  it("returns null when the member lost news:internal:view", async () => {
    prismaMock.member.findUnique.mockResolvedValue(activeMember());
    hasPermissionMock.mockResolvedValue(false);

    expect(await resolveMemberByCalendarToken("raw")).toBeNull();
  });

  it("returns null for a resigned (ausgetreten) member", async () => {
    prismaMock.member.findUnique.mockResolvedValue(
      activeMember({
        resignedAt: new Date("2020-01-01"),
        membershipEndsAt: new Date("2021-01-01"),
      }),
    );
    hasPermissionMock.mockResolvedValue(true);

    expect(await resolveMemberByCalendarToken("raw")).toBeNull();
  });

  it("returns null for an anonymised member", async () => {
    prismaMock.member.findUnique.mockResolvedValue(
      activeMember({
        meeple: { neonAuthUserId: "auth-1", anonymizedAt: new Date() },
      }),
    );
    hasPermissionMock.mockResolvedValue(true);

    expect(await resolveMemberByCalendarToken("raw")).toBeNull();
  });

  it("still serves a member who has given notice but is not yet gone (gekuendigt)", async () => {
    prismaMock.member.findUnique.mockResolvedValue(
      activeMember({
        resignedAt: new Date(),
        membershipEndsAt: new Date(Date.now() + 86_400_000),
      }),
    );
    hasPermissionMock.mockResolvedValue(true);

    expect(await resolveMemberByCalendarToken("raw")).toEqual({
      id: "member-1",
    });
  });

  it("returns null for a member without a portal login", async () => {
    prismaMock.member.findUnique.mockResolvedValue(
      activeMember({ meeple: null }),
    );

    expect(await resolveMemberByCalendarToken("raw")).toBeNull();
    expect(hasPermissionMock).not.toHaveBeenCalled();
  });

  it("returns null for an unknown token", async () => {
    prismaMock.member.findUnique.mockResolvedValue(null);

    expect(await resolveMemberByCalendarToken("nope")).toBeNull();
  });
});
