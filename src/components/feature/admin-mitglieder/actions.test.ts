import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const {
  anonymiseMeeple,
  getOpenHoldingsSummary,
  recordResignation,
  revokeResignation,
} = await import("./actions");

class ForbiddenError extends Error {}

const RESIGNED_AND_GONE = {
  id: "meeple-1",
  neonAuthUserId: "11111111-1111-1111-1111-111111111111",
  resignedAt: new Date("2024-07-01T00:00:00Z"),
  membershipEndsAt: new Date("2025-01-01T00:00:00Z"),
  anonymizedAt: null,
};

beforeEach(() => {
  requirePermissionMock.mockResolvedValue({ id: "admin-user" });
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
});

describe("without the members:manage permission", () => {
  it("changes nothing in the database", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(recordResignation("meeple-1", new Date())).rejects.toThrow(
      ForbiddenError,
    );
    await expect(revokeResignation("meeple-1")).rejects.toThrow(ForbiddenError);
    await expect(anonymiseMeeple("meeple-1")).rejects.toThrow(ForbiddenError);
    await expect(getOpenHoldingsSummary("meeple-1")).rejects.toThrow(
      ForbiddenError,
    );
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("recordResignation", () => {
  it("sets both resignedAt and membershipEndsAt", async () => {
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));

    await recordResignation("meeple-1", new Date("2027-01-01T00:00:00Z"));

    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: {
        resignedAt: new Date("2026-07-29T12:00:00Z"),
        membershipEndsAt: new Date("2027-01-01T00:00:00Z"),
      },
    });

    vi.useRealTimers();
  });

  it("closes the meeple's open Spielergesuche in the same transaction", async () => {
    await recordResignation("meeple-1", new Date("2027-01-01T00:00:00Z"));

    expect(prismaMock.lfgPost.updateMany).toHaveBeenCalledWith({
      where: { createdByMeepleId: "meeple-1", closedAt: null },
      data: { closedAt: expect.any(Date) },
    });
  });
});

describe("revokeResignation", () => {
  it("clears both date fields", async () => {
    await revokeResignation("meeple-1");

    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: { resignedAt: null, membershipEndsAt: null },
    });
  });
});

describe("anonymiseMeeple", () => {
  it("rejects a meeple that still has open holdings", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(RESIGNED_AND_GONE as never);
    prismaMock.gameHolding.count.mockResolvedValue(2);
    prismaMock.storageUnit.count.mockResolvedValue(0);

    const result = await anonymiseMeeple("meeple-1");

    expect(result).toEqual({
      error:
        "Bei diesem Mitglied liegen noch Vereinsspiele oder -einheiten. Erst zurückholen, dann anonymisieren.",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a meeple that still keeps an open storage unit", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(RESIGNED_AND_GONE as never);
    prismaMock.gameHolding.count.mockResolvedValue(0);
    prismaMock.storageUnit.count.mockResolvedValue(1);

    const result = await anonymiseMeeple("meeple-1");

    expect(result.error).toMatch(/Erst zurückholen/);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a meeple that is not yet ausgetreten", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      id: "meeple-1",
      neonAuthUserId: "x",
      resignedAt: null,
      membershipEndsAt: null,
      anonymizedAt: null,
    } as never);

    const result = await anonymiseMeeple("meeple-1");

    expect(result).toEqual({
      error: "Nur ausgetretene Mitglieder können anonymisiert werden.",
    });
  });

  it("rejects an already anonymised meeple", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      ...RESIGNED_AND_GONE,
      anonymizedAt: new Date(),
    } as never);

    const result = await anonymiseMeeple("meeple-1");

    expect(result).toEqual({
      error: "Dieses Mitglied ist bereits anonymisiert.",
    });
  });

  it("clears exactly the defined fields, keeps the meeple row and runs transactionally", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(RESIGNED_AND_GONE as never);
    prismaMock.gameHolding.count.mockResolvedValue(0);
    prismaMock.storageUnit.count.mockResolvedValue(0);

    const result = await anonymiseMeeple("meeple-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(3);
    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: {
        displayName: "(anonymisiert)",
        neonAuthUserId: null,
        email: null,
        accountHolder: null,
        ibanEncrypted: null,
        ibanLast4: null,
        bggUsername: null,
        bgaUsername: null,
        telegramHandle: null,
        signalHandle: null,
        discordHandle: null,
        anonymizedAt: expect.any(Date),
      },
    });
  });

  it("does not delete the meeple row itself", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(RESIGNED_AND_GONE as never);
    prismaMock.gameHolding.count.mockResolvedValue(0);
    prismaMock.storageUnit.count.mockResolvedValue(0);

    await anonymiseMeeple("meeple-1");

    expect(prismaMock.meeple.delete).not.toHaveBeenCalled();
  });

  it("rolls back the meeple update when the raw sql fails", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(RESIGNED_AND_GONE as never);
    prismaMock.gameHolding.count.mockResolvedValue(0);
    prismaMock.storageUnit.count.mockResolvedValue(0);
    prismaMock.$executeRaw.mockRejectedValueOnce(new Error("db boom"));

    await expect(anonymiseMeeple("meeple-1")).rejects.toThrow("db boom");
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
  });
});
