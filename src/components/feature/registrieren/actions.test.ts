import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const validateInviteToken = vi.fn();
vi.mock("@/lib/members/invites", () => ({
  validateInviteToken: (...args: unknown[]) => validateInviteToken(...args),
}));

const signUpEmail = vi.fn();
vi.mock("@/lib/auth/server", () => ({
  auth: { signUp: { email: (...args: unknown[]) => signUpEmail(...args) } },
}));

const { redeemInvite } = await import("./actions");

const BOUND_INVITE = {
  id: "invite-1",
  token: "abc123",
  email: "member@example.com",
  createdByUserId: "admin-1",
  createdAt: new Date(),
  expiresIn: 7 * 24 * 60,
  expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  redeemedAt: null,
  revokedAt: null,
};

const ROLE = { id: "role-1", name: "Meeple", description: null };

function mockHappyPath(
  invite: Omit<typeof BOUND_INVITE, "email"> & { email: string | null },
) {
  validateInviteToken.mockResolvedValue({ valid: true });
  prismaMock.invite.findUniqueOrThrow.mockResolvedValue(invite);
  prismaMock.role.findUniqueOrThrow.mockResolvedValue(ROLE);
  signUpEmail.mockResolvedValue({ data: { user: { id: "user-1" } } });
  prismaMock.$transaction.mockResolvedValue([]);
}

describe("redeemInvite", () => {
  it("rejects an invalid or expired token before touching the account", async () => {
    validateInviteToken.mockResolvedValue({ valid: false, reason: "expired" });

    const result = await redeemInvite({
      token: "abc123",
      email: "member@example.com",
      password: "supersecret",
      name: "Member",
    });

    expect(result).toEqual({ error: "Token ungültig oder abgelaufen." });
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  it("rejects a bound invite when the email doesn't match", async () => {
    mockHappyPath(BOUND_INVITE);

    const result = await redeemInvite({
      token: "abc123",
      email: "other@example.com",
      password: "supersecret",
      name: "Member",
    });

    expect(result).toEqual({
      error: "Diese Einladung ist an eine andere E-Mail-Adresse gebunden.",
    });
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  it("accepts a bound invite for the same email in a different case and sets redeemedAt", async () => {
    mockHappyPath(BOUND_INVITE);

    const result = await redeemInvite({
      token: "abc123",
      email: "Member@Example.com",
      password: "supersecret",
      name: "Member",
    });

    expect(result).toEqual({ success: true });
    const ops = prismaMock.$transaction.mock.calls[0][0];
    expect(ops).toHaveLength(2);
  });

  it("accepts any email for an unbound invite and never sets redeemedAt", async () => {
    mockHappyPath({ ...BOUND_INVITE, email: null });

    const result = await redeemInvite({
      token: "abc123",
      email: "anyone@example.com",
      password: "supersecret",
      name: "Anyone",
    });

    expect(result).toEqual({ success: true });
    const ops = prismaMock.$transaction.mock.calls[0][0];
    expect(ops).toHaveLength(1);
  });
});
