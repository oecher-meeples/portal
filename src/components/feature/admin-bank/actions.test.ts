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
const { BANK_CSV_COLUMNS } = await import("./csv-columns");
const { exportBankDataCsv, revealIban, revealPendingIban } =
  await import("./actions");

class ForbiddenError extends Error {}

const IBAN = "DE89370400440532013000";

beforeEach(() => {
  process.env.MEMBER_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 5).toString(
    "base64",
  );
  requirePermissionMock.mockResolvedValue({ id: "user-kassenwart" });
  ensureMeepleMock.mockResolvedValue({ id: "meeple-kassenwart" });
});

describe("without the bank:read permission", () => {
  it("neither decrypts nor logs anything", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(revealIban("meeple-1")).rejects.toThrow(ForbiddenError);
    await expect(revealPendingIban("change-1")).rejects.toThrow(
      ForbiddenError,
    );
    await expect(exportBankDataCsv()).rejects.toThrow(ForbiddenError);
    expect(prismaMock.bankDataAccessLog.create).not.toHaveBeenCalled();
    expect(prismaMock.member.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.member.findMany).not.toHaveBeenCalled();
    expect(prismaMock.pendingChange.findUnique).not.toHaveBeenCalled();
  });
});

describe("revealIban", () => {
  // The decrypt/log rules themselves live in the lib layer and are tested in
  // src/lib/members/bank-access-log.test.ts — here only the permission gate matters.
  it("checks the bank:read permission and delegates to the shared reveal logic", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      ibanEncrypted: encryptSecret(IBAN),
    } as never);

    const result = await revealIban("meeple-1");

    expect(requirePermissionMock).toHaveBeenCalledWith("bank:read");
    expect(result).toEqual({ success: true, iban: IBAN });
    expect(prismaMock.bankDataAccessLog.create).toHaveBeenCalledWith({
      data: {
        accessedByMeepleId: "meeple-kassenwart",
        subjectMeepleId: "meeple-1",
        kind: "SINGLE_REVEAL",
      },
    });
  });
});

describe("revealPendingIban", () => {
  it("checks the bank:read permission and delegates to the shared reveal logic", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      kind: "IBAN",
      newValue: encryptSecret(IBAN),
      member: { meepleId: "meeple-1" },
    } as never);

    const result = await revealPendingIban("change-1");

    expect(requirePermissionMock).toHaveBeenCalledWith("bank:read");
    expect(result).toEqual({ success: true, iban: IBAN });
    expect(prismaMock.bankDataAccessLog.create).toHaveBeenCalledWith({
      data: {
        accessedByMeepleId: "meeple-kassenwart",
        subjectMeepleId: "meeple-1",
        kind: "SINGLE_REVEAL",
      },
    });
  });
});

describe("exportBankDataCsv", () => {
  beforeEach(() => {
    prismaMock.member.findMany.mockResolvedValue([
      {
        memberNumber: 1,
        firstName: null,
        lastName: null,
        email: "lea@example.org",
        accountHolder: "Lea Beispiel",
        ibanEncrypted: encryptSecret(IBAN),
        meeple: { displayName: "Lea Beispiel" },
      },
      {
        memberNumber: 2,
        firstName: null,
        lastName: null,
        email: "ben@example.org",
        accountHolder: null,
        ibanEncrypted: encryptSecret("AT611904300234573201"),
        meeple: { displayName: "Ben; Muster" },
      },
    ] as never);
  });

  it("writes exactly one log entry without a subject", async () => {
    await exportBankDataCsv();

    expect(prismaMock.bankDataAccessLog.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.bankDataAccessLog.create).toHaveBeenCalledWith({
      data: {
        accessedByMeepleId: "meeple-kassenwart",
        subjectMeepleId: null,
        kind: "CSV_EXPORT",
      },
    });
  });

  it("contains exactly the four defined columns", async () => {
    const result = await exportBankDataCsv();
    const lines = result.csv.split("\r\n");

    expect(lines[0]).toBe("Mitgliedsnummer;Name;Kontoinhaber;IBAN");
    expect(BANK_CSV_COLUMNS).toHaveLength(4);
    for (const line of lines) {
      expect(line.split(";").length).toBeGreaterThanOrEqual(4);
    }
  });

  it("decrypts the ibans and falls back to the display name as account holder", async () => {
    const result = await exportBankDataCsv();
    const lines = result.csv.split("\r\n");

    expect(lines[1]).toBe(`1;Lea Beispiel;Lea Beispiel;${IBAN}`);
    expect(lines[2]).toBe(`2;"Ben; Muster";"Ben; Muster";AT611904300234573201`);
    expect(result.rowCount).toBe(2);
  });

  it("skips anonymised meeples and those without stored bank data", async () => {
    await exportBankDataCsv();

    expect(prismaMock.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ibanEncrypted: { not: null },
          OR: [{ meepleId: null }, { meeple: { anonymizedAt: null } }],
        },
      }),
    );
  });
});
