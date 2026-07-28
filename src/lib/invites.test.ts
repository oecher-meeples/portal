import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { validateInviteToken } = await import("@/lib/invites");

const BASE_INVITE = {
  id: "invite-1",
  token: "abc123",
  createdByUserId: "user-1",
  redeemedAt: null,
};

describe("validateInviteToken", () => {
  it("rejects an unknown token", async () => {
    prismaMock.invite.findUnique.mockResolvedValue(null);

    const result = await validateInviteToken("unknown");

    expect(result).toEqual({ valid: false, reason: "not_found" });
  });

  it("rejects an already redeemed token", async () => {
    prismaMock.invite.findUnique.mockResolvedValue({
      ...BASE_INVITE,
      redeemedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    const result = await validateInviteToken("abc123");

    expect(result).toEqual({ valid: false, reason: "redeemed" });
  });

  it("rejects an expired token", async () => {
    prismaMock.invite.findUnique.mockResolvedValue({
      ...BASE_INVITE,
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await validateInviteToken("abc123");

    expect(result).toEqual({ valid: false, reason: "expired" });
  });

  it("accepts a valid, unredeemed, non-expired token", async () => {
    prismaMock.invite.findUnique.mockResolvedValue({
      ...BASE_INVITE,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    const result = await validateInviteToken("abc123");

    expect(result).toEqual({ valid: true });
  });
});
