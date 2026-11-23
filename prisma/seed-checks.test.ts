import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "../src/lib/__mocks__/prisma";
import { DEMO_CHECK_COPY_COUNT, planDemoChecks } from "./seed-data/demo-checks";

vi.mock("../src/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { seedDemoChecks } = await import("./seed-checks");

const NOW = new Date("2026-11-23T12:00:00Z");
const COPY_IDS = Array.from({ length: 30 }, (_, i) => `copy-${i}`);
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

describe("planDemoChecks (#599)", () => {
  const checks = planDemoChecks(COPY_IDS, NOW);

  it("plans about 40 checks within the last 12 months", () => {
    expect(checks.length).toBeGreaterThanOrEqual(30);
    expect(checks.length).toBeLessThanOrEqual(50);
    for (const check of checks) {
      expect(check.checkedAt.getTime()).toBeLessThan(NOW.getTime());
      expect(NOW.getTime() - check.checkedAt.getTime()).toBeLessThan(YEAR_MS);
    }
    expect(new Set(checks.map((c) => c.gameCopyId)).size).toBe(
      DEMO_CHECK_COPY_COUNT,
    );
  });

  it("gives the first copy more than 5 checks, oldest first", () => {
    const first = checks.filter((c) => c.gameCopyId === "copy-0");
    expect(first).toHaveLength(7);
    const times = first.map((c) => c.checkedAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("ends the second copy with an unplayable check and includes defects", () => {
    const second = checks.filter((c) => c.gameCopyId === "copy-1");
    expect(second.at(-1)?.result).toBe("UNPLAYABLE");
    expect(checks.some((c) => c.result === "INCOMPLETE")).toBe(true);
    expect(checks.some((c) => c.result === "DAMAGED")).toBe(true);
  });

  it("is deterministic", () => {
    expect(planDemoChecks(COPY_IDS, NOW)).toEqual(checks);
  });
});

describe("seedDemoChecks", () => {
  it("replaces the demo warden's checks instead of duplicating them", async () => {
    prismaMock.gameCopy.findMany.mockResolvedValue(
      COPY_IDS.map((id) => ({ id, status: "ACTIVE" })) as never,
    );
    prismaMock.$transaction.mockResolvedValue([] as never);

    await seedDemoChecks("warden");
    await seedDemoChecks("warden");

    expect(prismaMock.gameCopyCheck.deleteMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.gameCopyCheck.deleteMany).toHaveBeenCalledWith({
      where: { checkedByMeepleId: "warden" },
    });
    const [first, second] = prismaMock.gameCopyCheck.createMany.mock.calls;
    expect(first[0]?.data).toHaveLength((second[0]?.data as []).length);
  });

  it("derives the copy state from its latest check", async () => {
    prismaMock.gameCopy.findMany.mockResolvedValue(
      COPY_IDS.map((id) => ({ id, status: "ACTIVE" })) as never,
    );
    prismaMock.$transaction.mockResolvedValue([] as never);

    await seedDemoChecks("warden");

    expect(prismaMock.gameCopy.update).toHaveBeenCalledWith({
      where: { id: "copy-1" },
      data: expect.objectContaining({
        status: "MAINTENANCE",
        needsCompletenessCheck: false,
        condition: expect.stringMatching(/^Nicht spielbar: /),
      }),
    });
    expect(prismaMock.gameCopy.update).toHaveBeenCalledTimes(
      DEMO_CHECK_COPY_COUNT,
    );
  });
});
