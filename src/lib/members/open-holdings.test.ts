import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { countOpenHoldings, hasOpenHoldings } =
  await import("@/lib/members/open-holdings");

describe("countOpenHoldings", () => {
  it("counts only open holdings and non-retired units", async () => {
    prismaMock.gameHolding.count.mockResolvedValue(2);
    prismaMock.storageUnit.count.mockResolvedValue(1);

    expect(await countOpenHoldings("meeple-1")).toEqual({
      games: 2,
      units: 1,
    });
    expect(prismaMock.gameHolding.count).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1", endedAt: null },
    });
    expect(prismaMock.storageUnit.count).toHaveBeenCalledWith({
      where: { keeperMeepleId: "meeple-1", retiredAt: null },
    });
  });
});

describe("hasOpenHoldings", () => {
  it("is false only when both counts are zero", () => {
    expect(hasOpenHoldings({ games: 0, units: 0 })).toBe(false);
    expect(hasOpenHoldings({ games: 1, units: 0 })).toBe(true);
    expect(hasOpenHoldings({ games: 0, units: 1 })).toBe(true);
  });
});
