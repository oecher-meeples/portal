import { describe, expect, it, vi, beforeEach } from "vitest";
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

const getRequestIpMock = vi.fn();
vi.mock("@/lib/utils/request-ip", () => ({
  getRequestIp: () => getRequestIpMock(),
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

const ROLE = {
  id: "role-1",
  name: "Meeple",
  description: null,
  isSystemRole: false,
};
const MEMBER = {
  id: "member-1",
  email: "member@example.com",
  firstName: "Max",
  lastName: "Muster",
  meepleId: null,
};

beforeEach(() => {
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
  getRequestIpMock.mockResolvedValue("1.2.3.4");
  prismaMock.rateLimitAttempt.findUnique.mockResolvedValue(null);
});

function mockHappyPath() {
  validateInviteToken.mockResolvedValue({ valid: true });
  prismaMock.invite.findUniqueOrThrow.mockResolvedValue(BOUND_INVITE);
  prismaMock.role.findUniqueOrThrow.mockResolvedValue(ROLE);
  signUpEmail.mockResolvedValue({ data: { user: { id: "user-1" } } });
  prismaMock.member.findUnique.mockResolvedValue(MEMBER as never);
  prismaMock.meeple.upsert.mockResolvedValue({ id: "meeple-1" } as never);
}

describe("redeemInvite", () => {
  it("rejects a request while the IP fix-cooldown is still running (#326)", async () => {
    mockHappyPath();
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "invite:ip:1.2.3.4",
      failCount: 0,
      currentCooldownSecs: 0,
      lastFailedAt: new Date(),
      lastFailedIp: null,
      manuallyLockedAt: null,
    });

    const result = await redeemInvite({
      token: "abc123",
      email: "member@example.com",
      password: "supersecret",
      name: "Member",
    });

    expect(result).toEqual({ error: "Bitte versuche es in Kürze erneut." });
    expect(validateInviteToken).not.toHaveBeenCalled();
  });

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

  it("rejects an invite when the email doesn't match", async () => {
    mockHappyPath();

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

  it("accepts the invite for the same email in a different case, sets redeemedAt and links the Member", async () => {
    mockHappyPath();

    const result = await redeemInvite({
      token: "abc123",
      email: "Member@Example.com",
      password: "supersecret",
      name: "Member",
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.invite.update).toHaveBeenCalledWith({
      where: { token: "abc123" },
      data: { redeemedAt: expect.any(Date) },
    });
    expect(prismaMock.meeple.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { neonAuthUserId: "user-1" },
        create: expect.objectContaining({ displayName: "Max Muster" }),
      }),
    );
    expect(prismaMock.member.update).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { meepleId: "meeple-1" },
    });
  });

  it("does not overwrite an already-linked Member", async () => {
    mockHappyPath();
    prismaMock.member.findUnique.mockResolvedValue({
      ...MEMBER,
      meepleId: "existing-meeple",
    } as never);

    await redeemInvite({
      token: "abc123",
      email: "member@example.com",
      password: "supersecret",
      name: "Member",
    });

    expect(prismaMock.member.update).not.toHaveBeenCalled();
  });
});
