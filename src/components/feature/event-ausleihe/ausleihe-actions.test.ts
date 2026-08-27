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
vi.mock("@/lib/utils/prisma", () => ({
  prisma: {
    gameHolding: {
      findFirst: (...args: unknown[]) => gameHoldingFindFirstMock(...args),
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

const {
  ausleiheResolveCode,
  ausleiheGetAvailability,
  ausleiheIssueGame,
  ausleiheReturnToUnit,
} = await import("./ausleihe-actions");

const MEEPLE = { id: "meeple-1" };

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(MEEPLE);
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
      meepleId: null,
      unitId: "unit-1",
    } as never);

    const result = await ausleiheGetAvailability("copy-1");

    expect(result).toEqual({ kind: "available" });
  });

  it("ausleiheGetAvailability returns on-loan with the previous unit for a checked-out copy", async () => {
    gameHoldingFindFirstMock
      .mockResolvedValueOnce({ meepleId: "some-guest-stand-in" } as never)
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
      .mockResolvedValueOnce({ meepleId: "some-guest-stand-in" } as never)
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
      meepleId: "meeple-1",
      recordedByMeepleId: "meeple-1",
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
});
