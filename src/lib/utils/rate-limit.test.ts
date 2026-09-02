import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  checkFixedCooldown,
  checkAndRecordCountLimit,
  checkLoginBackoff,
  recordLoginFailure,
  resetLoginBackoffIfSameIp,
  hasReachedLoginBackoffCap,
  getLoginBackoffStatus,
  adminResetLoginBackoff,
  setManualLoginLock,
} = await import("./rate-limit");

const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  vi.useRealTimers();
});

describe("checkFixedCooldown", () => {
  it("allows the first attempt and records it", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue(null);

    const result = await checkFixedCooldown("login:ip:1.2.3.4", 2);

    expect(result).toEqual({ allowed: true });
    expect(prismaMock.rateLimitAttempt.upsert).toHaveBeenCalled();
  });

  it("blocks a second attempt inside the cooldown window", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "login:ip:1.2.3.4",
      failCount: 0,
      currentCooldownSecs: 0,
      lastFailedAt: new Date(Date.now() - 500),
      lastFailedIp: null,
      manuallyLockedAt: null,
    });

    const result = await checkFixedCooldown("login:ip:1.2.3.4", 2);

    expect(result.allowed).toBe(false);
  });

  it("allows again once the cooldown has elapsed", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "login:ip:1.2.3.4",
      failCount: 0,
      currentCooldownSecs: 0,
      lastFailedAt: new Date(Date.now() - 3000),
      lastFailedIp: null,
      manuallyLockedAt: null,
    });

    const result = await checkFixedCooldown("login:ip:1.2.3.4", 2);

    expect(result).toEqual({ allowed: true });
  });
});

describe("checkAndRecordCountLimit (revealIban)", () => {
  it("allows calls under the limit and increments the counter", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "iban-reveal:meeple-1",
      failCount: 5,
      currentCooldownSecs: 0,
      lastFailedAt: new Date(),
      lastFailedIp: null,
      manuallyLockedAt: null,
    });

    const result = await checkAndRecordCountLimit(
      "iban-reveal:meeple-1",
      20,
      600,
    );

    expect(result).toEqual({ allowed: true });
    expect(prismaMock.rateLimitAttempt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ failCount: 6 }),
      }),
    );
  });

  it("blocks the 21st call within the window", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "iban-reveal:meeple-1",
      failCount: 20,
      currentCooldownSecs: 0,
      lastFailedAt: new Date(),
      lastFailedIp: null,
      manuallyLockedAt: null,
    });

    const result = await checkAndRecordCountLimit(
      "iban-reveal:meeple-1",
      20,
      600,
    );

    expect(result.allowed).toBe(false);
  });

  it("resets the window once it has expired", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "iban-reveal:meeple-1",
      failCount: 20,
      currentCooldownSecs: 0,
      lastFailedAt: new Date(Date.now() - 700 * 1000),
      lastFailedIp: null,
      manuallyLockedAt: null,
    });

    const result = await checkAndRecordCountLimit(
      "iban-reveal:meeple-1",
      20,
      600,
    );

    expect(result).toEqual({ allowed: true });
    expect(prismaMock.rateLimitAttempt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ failCount: 1 }),
      }),
    );
  });
});

describe("login backoff (email-keyed exponential escalation)", () => {
  it("has no cooldown for the first three failures", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue(null);
    for (let attempt = 1; attempt <= 3; attempt++) {
      await recordLoginFailure("login:email:a@b.de", "1.2.3.4");
    }
    // Every upsert call for attempts 1-3 must carry a zero cooldown.
    for (const call of prismaMock.rateLimitAttempt.upsert.mock.calls) {
      expect(call[0].create.currentCooldownSecs).toBe(0);
    }
  });

  it("escalates from the 4th failure with 2^(n-4) seconds, capped at 8h", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "login:email:a@b.de",
      failCount: 3,
      currentCooldownSecs: 0,
      lastFailedAt: new Date(),
      lastFailedIp: null,
      manuallyLockedAt: null,
    });

    await recordLoginFailure("login:email:a@b.de", "1.2.3.4");

    expect(prismaMock.rateLimitAttempt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          failCount: 4,
          currentCooldownSecs: 1,
        }),
      }),
    );
  });

  it("caps the cooldown at 8h regardless of how high failCount climbs", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "login:email:a@b.de",
      failCount: 30,
      currentCooldownSecs: 8 * 60 * 60,
      lastFailedAt: new Date(),
      lastFailedIp: null,
      manuallyLockedAt: null,
    });

    await recordLoginFailure("login:email:a@b.de", "1.2.3.4");

    expect(prismaMock.rateLimitAttempt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ currentCooldownSecs: 8 * 60 * 60 }),
      }),
    );
  });

  it("blocks a login attempt while the current cooldown has not elapsed", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "login:email:a@b.de",
      failCount: 4,
      currentCooldownSecs: 5,
      lastFailedAt: new Date(Date.now() - 1000),
      lastFailedIp: null,
      manuallyLockedAt: null,
    });

    const result = await checkLoginBackoff("login:email:a@b.de");

    expect(result.allowed).toBe(false);
  });

  it("allows the next attempt once the 8h cooldown itself has elapsed, but a failure there still costs 8h again (no full reset before 10h idle)", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "login:email:a@b.de",
      failCount: 20,
      currentCooldownSecs: 8 * 60 * 60,
      lastFailedAt: new Date(Date.now() - 8 * HOUR - 1000),
      lastFailedIp: null,
      manuallyLockedAt: null,
    });

    expect(await checkLoginBackoff("login:email:a@b.de")).toEqual({
      allowed: true,
    });

    await recordLoginFailure("login:email:a@b.de", "1.2.3.4");
    expect(prismaMock.rateLimitAttempt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          failCount: 21,
          currentCooldownSecs: 8 * 60 * 60,
        }),
      }),
    );
  });

  it("resets once 10h have passed without a new failure", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "login:email:a@b.de",
      failCount: 20,
      currentCooldownSecs: 8 * 60 * 60,
      lastFailedAt: new Date(Date.now() - 10 * HOUR - 1000),
      lastFailedIp: null,
      manuallyLockedAt: null,
    });

    const result = await checkLoginBackoff("login:email:a@b.de");

    expect(result).toEqual({ allowed: true });
  });

  it("resets the counter on a successful login from the same IP", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "login:email:a@b.de",
      failCount: 5,
      currentCooldownSecs: 4,
      lastFailedAt: new Date(),
      lastFailedIp: "1.2.3.4",
      manuallyLockedAt: null,
    });

    await resetLoginBackoffIfSameIp("login:email:a@b.de", "1.2.3.4");

    expect(prismaMock.rateLimitAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { failCount: 0, currentCooldownSecs: 0 },
      }),
    );
  });

  it("does not reset the counter on a successful login from a different IP", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "login:email:a@b.de",
      failCount: 5,
      currentCooldownSecs: 4,
      lastFailedAt: new Date(),
      lastFailedIp: "1.2.3.4",
      manuallyLockedAt: null,
    });

    await resetLoginBackoffIfSameIp("login:email:a@b.de", "9.9.9.9");

    expect(prismaMock.rateLimitAttempt.update).not.toHaveBeenCalled();
  });
});

describe("hasReachedLoginBackoffCap", () => {
  it("is true once the cooldown equals the 8h cap", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "login:email:a@b.de",
      failCount: 25,
      currentCooldownSecs: 8 * 60 * 60,
      lastFailedAt: new Date(),
      lastFailedIp: null,
      manuallyLockedAt: null,
    });

    expect(await hasReachedLoginBackoffCap("login:email:a@b.de")).toBe(true);
  });

  it("is false below the cap", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "login:email:a@b.de",
      failCount: 4,
      currentCooldownSecs: 1,
      lastFailedAt: new Date(),
      lastFailedIp: null,
      manuallyLockedAt: null,
    });

    expect(await hasReachedLoginBackoffCap("login:email:a@b.de")).toBe(false);
  });
});

describe("manual login lock (#327)", () => {
  it("blocks checkLoginBackoff unconditionally while manually locked, even fresh", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "login:email:a@b.de",
      failCount: 0,
      currentCooldownSecs: 0,
      lastFailedAt: new Date(),
      lastFailedIp: null,
      manuallyLockedAt: new Date(),
    });

    const result = await checkLoginBackoff("login:email:a@b.de");

    expect(result.allowed).toBe(false);
  });

  it("setManualLoginLock sets manuallyLockedAt", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue(null);

    await setManualLoginLock("login:email:a@b.de");

    expect(prismaMock.rateLimitAttempt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          manuallyLockedAt: expect.any(Date),
        }),
        update: expect.objectContaining({
          manuallyLockedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("adminResetLoginBackoff clears the counter and the manual lock", async () => {
    await adminResetLoginBackoff("login:email:a@b.de");

    expect(prismaMock.rateLimitAttempt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          failCount: 0,
          currentCooldownSecs: 0,
          manuallyLockedAt: null,
        },
      }),
    );
  });
});

describe("getLoginBackoffStatus", () => {
  it("reports zeroed status without a row", async () => {
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue(null);

    expect(await getLoginBackoffStatus("login:email:a@b.de")).toEqual({
      failCount: 0,
      currentCooldownSecs: 0,
      atCap: false,
      manuallyLockedAt: null,
      lastFailedAt: null,
    });
  });

  it("reflects an escalated, locked row", async () => {
    const lastFailedAt = new Date();
    const manuallyLockedAt = new Date();
    prismaMock.rateLimitAttempt.findUnique.mockResolvedValue({
      id: "1",
      key: "login:email:a@b.de",
      failCount: 25,
      currentCooldownSecs: 8 * 60 * 60,
      lastFailedAt,
      lastFailedIp: null,
      manuallyLockedAt,
    });

    expect(await getLoginBackoffStatus("login:email:a@b.de")).toEqual({
      failCount: 25,
      currentCooldownSecs: 8 * 60 * 60,
      atCap: true,
      manuallyLockedAt,
      lastFailedAt,
    });
  });
});
