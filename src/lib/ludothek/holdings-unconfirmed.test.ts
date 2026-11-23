import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { hasUnconfirmedHoldingsForMeeple } = await import("./holdings");

describe("hasUnconfirmedHoldingsForMeeple (#290)", () => {
  it("returns false for a Meeple with no linked Member", async () => {
    prismaMock.member.findUnique.mockResolvedValue(null);

    expect(await hasUnconfirmedHoldingsForMeeple("meeple-1")).toBe(false);
    expect(prismaMock.gameHolding.count).not.toHaveBeenCalled();
  });

  it("returns true when the linked Member has an open, unconfirmed holding", async () => {
    prismaMock.member.findUnique.mockResolvedValue({ id: "member-1" } as never);
    prismaMock.gameHolding.count.mockResolvedValue(1);

    expect(await hasUnconfirmedHoldingsForMeeple("meeple-1")).toBe(true);
    expect(prismaMock.gameHolding.count).toHaveBeenCalledWith({
      where: {
        vereinsmitgliedId: "member-1",
        endedAt: null,
        confirmedAt: null,
      },
    });
  });

  it("returns false when every holding is already confirmed", async () => {
    prismaMock.member.findUnique.mockResolvedValue({ id: "member-1" } as never);
    prismaMock.gameHolding.count.mockResolvedValue(0);

    expect(await hasUnconfirmedHoldingsForMeeple("meeple-1")).toBe(false);
  });
});
