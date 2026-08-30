import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const anonymiseMeepleRecordMock = vi.fn();
vi.mock("@/lib/members/anonymisation", () => ({
  anonymiseMeepleRecord: (...args: unknown[]) =>
    anonymiseMeepleRecordMock(...args),
}));

const {
  MEMBER_DATA_RETENTION_MONTHS,
  anonymiseExpiredMeeples,
  retentionCutoff,
} = await import("@/lib/members/retention");

const NOW = new Date("2026-08-03T00:00:00Z");

beforeEach(() => {
  anonymiseMeepleRecordMock.mockReset();
  anonymiseMeepleRecordMock.mockResolvedValue({ success: true });
  prismaMock.member.findMany.mockResolvedValue([] as never);
});

describe("MEMBER_DATA_RETENTION_MONTHS", () => {
  it("is deliberately unset until the Vorstand decides (see #49)", () => {
    expect(MEMBER_DATA_RETENTION_MONTHS).toBeNull();
  });
});

describe("anonymiseExpiredMeeples with no retention period configured", () => {
  it("touches nothing and reports itself as skipped", async () => {
    const summary = await anonymiseExpiredMeeples({ now: NOW });

    expect(summary).toEqual({ skipped: true, anonymised: 0, failed: [] });
    expect(prismaMock.member.findMany).not.toHaveBeenCalled();
    expect(anonymiseMeepleRecordMock).not.toHaveBeenCalled();
  });

  it("stays off even when called without arguments at all", async () => {
    expect((await anonymiseExpiredMeeples()).skipped).toBe(true);
    expect(anonymiseMeepleRecordMock).not.toHaveBeenCalled();
  });
});

describe("retentionCutoff", () => {
  it("subtracts the months in UTC, so a DST change cannot shift it", () => {
    expect(retentionCutoff(24, NOW)).toEqual(new Date("2024-08-03T00:00:00Z"));
    // 03:00 UTC in August is 05:00 local (CEST); two years earlier the same
    // local hour is 04:00 (CEST again), so only UTC arithmetic stays stable.
    expect(retentionCutoff(24, new Date("2026-08-03T03:00:00Z"))).toEqual(
      new Date("2024-08-03T03:00:00Z"),
    );
  });

  it("rolls into the next month when the target day does not exist", () => {
    // 31 March minus 6 months would be 31 September; JS rolls to 1 October
    // rather than clamping. Documented so the behaviour is a decision, not a
    // surprise — a day either way is irrelevant for a multi-month retention.
    expect(retentionCutoff(6, new Date("2026-03-31T12:00:00Z"))).toEqual(
      new Date("2025-10-01T12:00:00Z"),
    );
  });
});

describe("anonymiseExpiredMeeples with a test retention period", () => {
  it("only selects members whose membership ended before the cutoff", async () => {
    await anonymiseExpiredMeeples({ retentionMonths: 24, now: NOW });

    expect(prismaMock.member.findMany).toHaveBeenCalledWith({
      where: {
        meepleId: { not: null },
        meeple: { anonymizedAt: null },
        membershipEndsAt: {
          not: null,
          lt: new Date("2024-08-03T00:00:00Z"),
        },
      },
      select: { meepleId: true },
    });
  });

  it("anonymises every candidate through the shared record function", async () => {
    prismaMock.member.findMany.mockResolvedValue([
      { meepleId: "meeple-1" },
      { meepleId: "meeple-2" },
    ] as never);

    const summary = await anonymiseExpiredMeeples({
      retentionMonths: 24,
      now: NOW,
    });

    expect(summary).toEqual({ skipped: false, anonymised: 2, failed: [] });
    expect(anonymiseMeepleRecordMock).toHaveBeenCalledWith("meeple-1", NOW);
    expect(anonymiseMeepleRecordMock).toHaveBeenCalledWith("meeple-2", NOW);
  });

  it("keeps going past a member that cannot be anonymised yet and reports it", async () => {
    prismaMock.member.findMany.mockResolvedValue([
      { meepleId: "still-holding" },
      { meepleId: "clean" },
    ] as never);
    anonymiseMeepleRecordMock.mockResolvedValueOnce({
      error: "Bei diesem Mitglied liegen noch Vereinsspiele oder -einheiten.",
    });

    const summary = await anonymiseExpiredMeeples({
      retentionMonths: 24,
      now: NOW,
    });

    expect(summary.anonymised).toBe(1);
    expect(summary.failed).toEqual([
      {
        meepleId: "still-holding",
        error: "Bei diesem Mitglied liegen noch Vereinsspiele oder -einheiten.",
      },
    ]);
  });
});
