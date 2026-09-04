import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return { ...actual, requireMeeple: requireMeepleMock };
});

const findActiveShiftEventMock = vi.fn();
vi.mock("@/lib/events/shift-rights", () => ({
  findActiveShiftEvent: (...args: unknown[]) =>
    findActiveShiftEventMock(...args),
}));

const gameHoldingFindFirstMock = vi.fn();
const memberFindUniqueMock = vi.fn();
vi.mock("@/lib/utils/prisma", () => ({
  prisma: {
    gameHolding: {
      findFirst: (...args: unknown[]) => gameHoldingFindFirstMock(...args),
    },
    member: {
      findUnique: (...args: unknown[]) => memberFindUniqueMock(...args),
    },
  },
}));

const borrowGameMock = vi.fn();
const returnGameMock = vi.fn();
const resolveScannedCodeMock = vi.fn();
vi.mock("@/lib/ludothek/holdings", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/ludothek/holdings")
  >("@/lib/ludothek/holdings");
  return {
    ...actual,
    borrowGame: (...args: unknown[]) => borrowGameMock(...args),
    returnGame: (...args: unknown[]) => returnGameMock(...args),
    resolveScannedCode: (...args: unknown[]) => resolveScannedCodeMock(...args),
  };
});

const listOfferedPrivateLoansForEventMock = vi.fn();
const issuePrivateLoanMock = vi.fn();
const returnPrivateLoanMock = vi.fn();
vi.mock("@/lib/ludothek/private-event-loans", () => ({
  listOfferedPrivateLoansForEvent: (...args: unknown[]) =>
    listOfferedPrivateLoansForEventMock(...args),
  issuePrivateLoan: (...args: unknown[]) => issuePrivateLoanMock(...args),
  returnPrivateLoan: (...args: unknown[]) => returnPrivateLoanMock(...args),
}));

const {
  ausleiheResolveCode,
  ausleiheGetAvailability,
  ausleiheIssueGame,
  ausleiheReturnToUnit,
  ausleiheListOfferedPrivateLoans,
  ausleiheIssuePrivateLoan,
  ausleiheReturnPrivateLoan,
} = await import("./ausleihe-actions");

const MEEPLE = { id: "meeple-1" };

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(MEEPLE);
  memberFindUniqueMock.mockResolvedValue({ id: "member-1" });
});

describe("without an active Ausleihe shift", () => {
  it("rejects every action without touching the database", async () => {
    findActiveShiftEventMock.mockResolvedValue(null);

    await expect(ausleiheResolveCode("EAN123")).rejects.toThrow(
      /Ausleihe-Schicht/,
    );
    await expect(ausleiheGetAvailability("copy-1")).rejects.toThrow(
      /Ausleihe-Schicht/,
    );
    const issueResult = await ausleiheIssueGame("copy-1");
    const returnResult = await ausleiheReturnToUnit("copy-1", "unit-1");

    expect(issueResult).toEqual({
      error: expect.stringContaining("Ausleihe-Schicht"),
    });
    expect(returnResult).toEqual({
      error: expect.stringContaining("Ausleihe-Schicht"),
    });
    expect(borrowGameMock).not.toHaveBeenCalled();
    expect(returnGameMock).not.toHaveBeenCalled();
  });
});

describe("with an active Ausleihe shift", () => {
  beforeEach(() => {
    findActiveShiftEventMock.mockResolvedValue({ eventId: "event-1" });
  });

  it("ausleiheGetAvailability returns available for a copy currently in a unit", async () => {
    gameHoldingFindFirstMock.mockResolvedValue({
      vereinsmitgliedId: null,
      unitId: "unit-1",
    } as never);

    const result = await ausleiheGetAvailability("copy-1");

    expect(result).toEqual({ kind: "available" });
  });

  it("ausleiheGetAvailability returns on-loan with the previous unit for a checked-out copy", async () => {
    gameHoldingFindFirstMock
      .mockResolvedValueOnce({
        vereinsmitgliedId: "some-guest-stand-in",
      } as never)
      .mockResolvedValueOnce({
        unit: {
          id: "unit-1",
          code: "OM-BOX-0001",
          label: "Kiste 1",
          retiredAt: null,
        },
      } as never);

    const result = await ausleiheGetAvailability("copy-1");

    expect(result).toEqual({
      kind: "on-loan",
      previousUnit: { id: "unit-1", code: "OM-BOX-0001", label: "Kiste 1" },
    });
  });

  it("ausleiheGetAvailability omits a retired previous unit", async () => {
    gameHoldingFindFirstMock
      .mockResolvedValueOnce({
        vereinsmitgliedId: "some-guest-stand-in",
      } as never)
      .mockResolvedValueOnce({
        unit: {
          id: "unit-1",
          code: "OM-BOX-0001",
          label: "Kiste 1",
          retiredAt: new Date("2026-01-01"),
        },
      } as never);

    const result = await ausleiheGetAvailability("copy-1");

    expect(result).toEqual({ kind: "on-loan", previousUnit: null });
  });

  it("ausleiheGetAvailability returns null when the copy has no open holding", async () => {
    gameHoldingFindFirstMock.mockResolvedValue(null);

    const result = await ausleiheGetAvailability("copy-1");

    expect(result).toBeNull();
  });

  it("ausleiheIssueGame borrows to the acting meeple itself", async () => {
    borrowGameMock.mockResolvedValue({});

    const result = await ausleiheIssueGame("copy-1");

    expect(result).toEqual({ success: true });
    expect(borrowGameMock).toHaveBeenCalledWith({
      gameCopyId: "copy-1",
      vereinsmitgliedId: "member-1",
      recordedByMeepleId: "meeple-1",
      isSelf: true,
    });
  });

  it("ausleiheIssueGame surfaces a HoldingConflictError as { error }", async () => {
    borrowGameMock.mockRejectedValue(new Error("Bereits ausgeliehen."));

    const result = await ausleiheIssueGame("copy-1");

    expect(result).toEqual({ error: "Bereits ausgeliehen." });
  });

  it("ausleiheReturnToUnit returns the copy to the given unit", async () => {
    returnGameMock.mockResolvedValue({});

    const result = await ausleiheReturnToUnit("copy-1", "unit-1");

    expect(result).toEqual({ success: true });
    expect(returnGameMock).toHaveBeenCalledWith({
      gameCopyId: "copy-1",
      toUnitId: "unit-1",
      recordedByMeepleId: "meeple-1",
    });
  });

  it("ausleiheResolveCode delegates to resolveScannedCode", async () => {
    resolveScannedCodeMock.mockResolvedValue({ kind: "unknown", raw: "x" });

    const result = await ausleiheResolveCode("x");

    expect(result).toEqual({ kind: "unknown", raw: "x" });
  });

  // #122: private Exemplare — event-, nicht exemplarbezogen.
  it("ausleiheListOfferedPrivateLoans scopes to the active shift's event", async () => {
    listOfferedPrivateLoansForEventMock.mockResolvedValue([]);

    await ausleiheListOfferedPrivateLoans();

    expect(listOfferedPrivateLoansForEventMock).toHaveBeenCalledWith("event-1");
  });

  it("ausleiheIssuePrivateLoan issues by the acting meeple", async () => {
    issuePrivateLoanMock.mockResolvedValue({ success: true });

    const result = await ausleiheIssuePrivateLoan("loan-1");

    expect(result).toEqual({ success: true });
    expect(issuePrivateLoanMock).toHaveBeenCalledWith("loan-1", "meeple-1");
  });

  it("ausleiheIssuePrivateLoan surfaces a domain error as { error }", async () => {
    issuePrivateLoanMock.mockResolvedValue({
      error: "Dieses Exemplar ist nicht (mehr) zur Ausgabe angeboten.",
    });

    const result = await ausleiheIssuePrivateLoan("loan-1");

    expect(result).toEqual({
      error: "Dieses Exemplar ist nicht (mehr) zur Ausgabe angeboten.",
    });
  });

  it("ausleiheReturnPrivateLoan returns the loan", async () => {
    returnPrivateLoanMock.mockResolvedValue({ success: true });

    const result = await ausleiheReturnPrivateLoan("loan-1");

    expect(result).toEqual({ success: true });
    expect(returnPrivateLoanMock).toHaveBeenCalledWith("loan-1");
  });
});

describe("private loans without an active Ausleihe shift", () => {
  it("rejects every private-loan action", async () => {
    findActiveShiftEventMock.mockResolvedValue(null);

    await expect(ausleiheListOfferedPrivateLoans()).rejects.toThrow(
      /Ausleihe-Schicht/,
    );
    expect(await ausleiheIssuePrivateLoan("loan-1")).toEqual({
      error: expect.stringContaining("Ausleihe-Schicht"),
    });
    expect(await ausleiheReturnPrivateLoan("loan-1")).toEqual({
      error: expect.stringContaining("Ausleihe-Schicht"),
    });
  });
});
