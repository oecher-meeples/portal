import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const ensureMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return { ...actual, ensureMeeple: ensureMeepleMock };
});

const { encryptSecret } = await import("@/lib/utils/crypto");
const {
  bankLogCutoff,
  deleteExpiredBankDataAccessLogs,
  requireBankReader,
  revealMeepleIban,
} = await import("./bank-access-log");

class ForbiddenError extends Error {}

const IBAN = "DE89370400440532013000";

beforeEach(() => {
  process.env.MEMBER_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 5).toString(
    "base64",
  );
  requirePermissionMock.mockResolvedValue({ id: "user-kassenwart" });
  ensureMeepleMock.mockResolvedValue({ id: "meeple-kassenwart" });
});

describe("requireBankReader", () => {
  it("checks the bank:read permission and resolves the actor's Meeple", async () => {
    expect(await requireBankReader()).toEqual({ id: "meeple-kassenwart" });
    expect(requirePermissionMock).toHaveBeenCalledWith("bank:read");
  });

  it("propagates the redirect when the permission is missing", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(requireBankReader()).rejects.toThrow(ForbiddenError);
  });
});

describe("revealMeepleIban", () => {
  it("returns the decrypted iban and writes exactly one log entry", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      ibanEncrypted: encryptSecret(IBAN),
    } as never);

    const result = await revealMeepleIban("meeple-1", "meeple-kassenwart");

    expect(prismaMock.member.findUnique).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1" },
      select: { ibanEncrypted: true },
    });
    expect(result).toEqual({ success: true, iban: IBAN });
    expect(prismaMock.bankDataAccessLog.create).toHaveBeenCalledWith({
      data: {
        accessedByMeepleId: "meeple-kassenwart",
        subjectMeepleId: "meeple-1",
        kind: "SINGLE_REVEAL",
      },
    });
  });

  it("reports a missing iban without writing a log entry", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      ibanEncrypted: null,
    } as never);

    const result = await revealMeepleIban("meeple-1", "meeple-kassenwart");

    expect(result).toEqual({
      error: "Für dieses Mitglied ist keine IBAN gespeichert.",
    });
    expect(prismaMock.bankDataAccessLog.create).not.toHaveBeenCalled();
  });

  it("reports an unknown/unlinked meeple without writing a log entry", async () => {
    prismaMock.member.findUnique.mockResolvedValue(null);

    const result = await revealMeepleIban("nope", "meeple-kassenwart");

    expect(result).toEqual({
      error: "Für dieses Mitglied ist keine IBAN gespeichert.",
    });
    expect(prismaMock.bankDataAccessLog.create).not.toHaveBeenCalled();
  });
});

describe("bankLogCutoff", () => {
  it("is exactly 24 months before the given moment", () => {
    expect(bankLogCutoff(new Date("2026-07-29T12:00:00Z")).toISOString()).toBe(
      "2024-07-29T12:00:00.000Z",
    );
  });
});

describe("deleteExpiredBankDataAccessLogs", () => {
  it("deletes only entries older than 24 months", async () => {
    prismaMock.bankDataAccessLog.deleteMany.mockResolvedValue({
      count: 2,
    } as never);

    const result = await deleteExpiredBankDataAccessLogs(
      new Date("2026-07-29T12:00:00Z"),
    );

    expect(result).toEqual({ deleted: 2 });
    expect(prismaMock.bankDataAccessLog.deleteMany).toHaveBeenCalledWith({
      where: { at: { lt: new Date("2024-07-29T12:00:00.000Z") } },
    });
  });
});
