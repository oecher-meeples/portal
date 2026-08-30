import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  validateInviteToken,
  inviteStatus,
  daysToMinutes,
  computeExpiresAt,
  buildRegistrationLink,
  formatInviteMessage,
} = await import("@/lib/members/invites");

const BASE_INVITE = {
  id: "invite-1",
  token: "abc123",
  email: "abc@example.com",
  createdByUserId: "user-1",
  createdAt: new Date(),
  expiresIn: 7 * 24 * 60,
  redeemedAt: null,
  revokedAt: null,
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

  it("rejects a revoked token", async () => {
    prismaMock.invite.findUnique.mockResolvedValue({
      ...BASE_INVITE,
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    const result = await validateInviteToken("abc123");

    expect(result).toEqual({ valid: false, reason: "revoked" });
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

describe("inviteStatus", () => {
  const now = new Date("2026-08-12T00:00:00Z");

  it("is 'widerrufen' once revoked, even if also redeemed", () => {
    expect(
      inviteStatus(
        {
          redeemedAt: new Date("2026-08-01T00:00:00Z"),
          revokedAt: new Date("2026-08-02T00:00:00Z"),
          expiresAt: new Date("2026-08-08T00:00:00Z"),
        },
        now,
      ),
    ).toBe("widerrufen");
  });

  it("is 'eingeloest' once redeemed, even past its expiry date", () => {
    expect(
      inviteStatus(
        {
          redeemedAt: new Date("2026-08-01T00:00:00Z"),
          revokedAt: null,
          expiresAt: new Date("2026-08-08T00:00:00Z"),
        },
        now,
      ),
    ).toBe("eingeloest");
  });

  it("is 'abgelaufen' once past its expiry date, unredeemed", () => {
    expect(
      inviteStatus(
        {
          redeemedAt: null,
          revokedAt: null,
          expiresAt: new Date("2026-08-08T00:00:00Z"),
        },
        now,
      ),
    ).toBe("abgelaufen");
  });

  it("is 'offen' otherwise", () => {
    expect(
      inviteStatus(
        {
          redeemedAt: null,
          revokedAt: null,
          expiresAt: new Date("2026-08-20T00:00:00Z"),
        },
        now,
      ),
    ).toBe("offen");
  });
});

describe("daysToMinutes", () => {
  it("converts whole days to minutes", () => {
    expect(daysToMinutes(7)).toBe(7 * 24 * 60);
  });

  it("rounds up fractional days", () => {
    expect(daysToMinutes(2.5)).toBe(3600);
  });
});

describe("computeExpiresAt", () => {
  it("adds the given minutes to the reference time", () => {
    const now = new Date("2026-08-12T00:00:00Z");

    expect(computeExpiresAt(60, now)).toEqual(new Date("2026-08-12T01:00:00Z"));
  });
});

describe("buildRegistrationLink", () => {
  it("includes the bound email param", () => {
    expect(
      buildRegistrationLink("https://example.com", "tok123", "a@b.com"),
    ).toBe("https://example.com/registrieren?token=tok123&email=a%40b.com");
  });
});

describe("formatInviteMessage", () => {
  it("includes the link and the formatted expiry", () => {
    const message = formatInviteMessage(
      "https://example.com/registrieren?token=tok123",
      new Date("2026-08-19T10:00:00Z"),
    );

    expect(message).toContain("https://example.com/registrieren?token=tok123");
    expect(message).toContain("Der Link ist gültig bis");
  });
});
