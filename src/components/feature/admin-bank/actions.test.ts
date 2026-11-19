import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requirePermissionMock = vi.fn();

vi.mock("@/lib/auth/action-guards", async () =>
  (await import("@/lib/__mocks__/action-guards")).actionGuardsFrom((...args) =>
    requirePermissionMock(...args),
  ),
);

const { encryptSecret } = await import("@/lib/utils/crypto");
const { BANK_CSV_COLUMNS } = await import("./csv-columns");
const { exportBankDataCsv } = await import("./actions");

class ForbiddenError extends Error {}

const IBAN = "DE89370400440532013000";

beforeEach(() => {
  process.env.MEMBER_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 5).toString(
    "base64",
  );
  requirePermissionMock.mockResolvedValue({ id: "meeple-kassenwart" });
});

describe("without the bank:read permission", () => {
  it("neither decrypts nor logs anything", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(exportBankDataCsv()).rejects.toThrow(ForbiddenError);
    expect(prismaMock.bankDataAccessLog.create).not.toHaveBeenCalled();
    expect(prismaMock.member.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.member.findMany).not.toHaveBeenCalled();
    expect(prismaMock.pendingChange.findUnique).not.toHaveBeenCalled();
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

  it("skips anonymised meeples, ausgetreten members and those without stored bank data (#395)", async () => {
    await exportBankDataCsv();

    expect(prismaMock.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ibanEncrypted: { not: null },
          AND: [
            { OR: [{ meepleId: null }, { meeple: { anonymizedAt: null } }] },
            {
              OR: [
                { membershipEndsAt: null },
                { membershipEndsAt: { gte: expect.any(Date) } },
              ],
            },
          ],
        },
      }),
    );
  });
});

/** Minimaler Prisma-`where`-Evaluator für die AND/OR/not/gte-Formen, die
 * `exportBankDataCsv()` tatsächlich baut — läuft gegen den echten, vom Code
 * übergebenen `where`, nicht gegen eine separat nachgebaute Kopie der
 * Filterlogik (die ein falsch verdrahtetes AND/OR nicht auffangen würde). */
function evaluateWhere(
  member: Record<string, unknown>,
  where: Record<string, unknown>,
): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (key === "AND") {
      return (condition as Record<string, unknown>[]).every((sub) =>
        evaluateWhere(member, sub),
      );
    }
    if (key === "OR") {
      return (condition as Record<string, unknown>[]).some((sub) =>
        evaluateWhere(member, sub),
      );
    }
    const value = member[key];
    if (condition === null) return value === null;
    if (condition && typeof condition === "object") {
      if ("not" in condition) {
        const excluded = (condition as { not: unknown }).not;
        return value !== null && value !== excluded;
      }
      if ("gte" in condition) {
        const bound = (condition as { gte: Date }).gte;
        return value !== null && (value as Date) >= bound;
      }
      // Verschachtelte Relation, z. B. `meeple: { anonymizedAt: null }`.
      return evaluateWhere(
        (value as Record<string, unknown>) ?? {},
        condition as Record<string, unknown>,
      );
    }
    return value === condition;
  });
}

// #395: Datenminimierung — nur Registriert/Gekündigt dürfen im Export
// auftauchen, Ausgetreten/Anonymisiert nicht.
describe("exportBankDataCsv — Mitgliedschafts-Zustände (#395)", () => {
  const NOW = new Date("2026-08-03T00:00:00Z");

  function memberFixture(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      memberNumber: 1,
      firstName: null,
      lastName: null,
      email: "member@example.org",
      accountHolder: null,
      ibanEncrypted: encryptSecret(IBAN),
      membershipEndsAt: null,
      meepleId: "meeple-1",
      meeple: { displayName: "Mitglied", anonymizedAt: null },
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    // Erst hier gebaut (nicht auf Modulebene) — braucht die
    // MEMBER_DATA_ENCRYPTION_KEY, die die äußere `beforeEach` erst setzt.
    const gekuendigt = memberFixture({
      memberNumber: 1,
      membershipEndsAt: new Date("2027-01-01T00:00:00Z"),
    });
    const ausgetreten = memberFixture({
      memberNumber: 2,
      membershipEndsAt: new Date("2026-01-01T00:00:00Z"),
    });
    const anonymisiert = memberFixture({
      memberNumber: 3,
      meeple: { displayName: "Anonymer Meeple", anonymizedAt: NOW },
    });
    prismaMock.member.findMany.mockImplementation((async ({
      where,
    }: {
      where: Record<string, unknown>;
    }) =>
      [gekuendigt, ausgetreten, anonymisiert].filter((member) =>
        evaluateWhere(member, where),
      )) as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps a gekündigt member (membershipEndsAt in the future) in the export", async () => {
    const result = await exportBankDataCsv();

    expect(result.csv).toContain("1;");
  });

  it("excludes an ausgetreten member (membershipEndsAt in the past), even if the year-turn cron hasn't processed them yet", async () => {
    const result = await exportBankDataCsv();

    expect(result.csv).not.toContain("2;");
  });

  it("excludes an anonymised member regardless of membershipEndsAt (unverändertes Verhalten)", async () => {
    const result = await exportBankDataCsv();

    expect(result.csv).not.toContain("3;");
  });

  it("keeps exactly the gekündigt member, excluding both others", async () => {
    const result = await exportBankDataCsv();

    expect(result.rowCount).toBe(1);
  });
});
