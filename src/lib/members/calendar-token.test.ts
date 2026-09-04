import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const generateTokenMock = vi.fn();
vi.mock("@/lib/utils/generate-token", () => ({
  generateToken: (...args: unknown[]) => generateTokenMock(...args),
}));

const {
  generateMemberCalendarToken,
  revokeMemberCalendarToken,
  resolveMemberByCalendarToken,
  hashCalendarToken,
} = await import("./calendar-token");

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

describe("resolveMemberByCalendarToken (#438)", () => {
  it("looks up the member by the token's hash, not the raw value", async () => {
    prismaMock.member.findUnique.mockResolvedValue({ id: "member-1" } as never);

    const result = await resolveMemberByCalendarToken("raw-token-value");

    expect(prismaMock.member.findUnique).toHaveBeenCalledWith({
      where: { calendarTokenHash: hashCalendarToken("raw-token-value") },
      select: { id: true },
    });
    expect(result).toEqual({ id: "member-1" });
  });

  it("returns null for an unknown token", async () => {
    prismaMock.member.findUnique.mockResolvedValue(null);

    expect(await resolveMemberByCalendarToken("nope")).toBeNull();
  });
});
