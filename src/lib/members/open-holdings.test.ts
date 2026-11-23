import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { countOpenHoldings, hasOpenHoldings } =
  await import("@/lib/members/open-holdings");

describe("countOpenHoldings", () => {
  it("counts open holdings of the linked Member and non-retired units", async () => {
    prismaMock.member.findUnique.mockResolvedValue({ id: "member-1" } as never);
    prismaMock.gameHolding.count.mockResolvedValue(2);
    prismaMock.storageUnit.count.mockResolvedValue(1);

    expect(await countOpenHoldings("meeple-1")).toEqual({
      games: 2,
      units: 1,
    });
    expect(prismaMock.member.findUnique).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1" },
      select: { id: true },
    });
    expect(prismaMock.gameHolding.count).toHaveBeenCalledWith({
      where: { vereinsmitgliedId: "member-1", endedAt: null },
    });
    expect(prismaMock.storageUnit.count).toHaveBeenCalledWith({
      where: { keeperMeepleId: "meeple-1", retiredAt: null },
    });
  });

  it("counts zero games for a Meeple with no linked Member (#333)", async () => {
    prismaMock.member.findUnique.mockResolvedValue(null);
    prismaMock.storageUnit.count.mockResolvedValue(0);

    expect(await countOpenHoldings("meeple-1")).toEqual({
      games: 0,
      units: 0,
    });
    expect(prismaMock.gameHolding.count).not.toHaveBeenCalled();
  });
});

describe("hasOpenHoldings", () => {
  it("is false only when both counts are zero", () => {
    expect(hasOpenHoldings({ games: 0, units: 0 })).toBe(false);
    expect(hasOpenHoldings({ games: 1, units: 0 })).toBe(true);
    expect(hasOpenHoldings({ games: 0, units: 1 })).toBe(true);
  });
});
