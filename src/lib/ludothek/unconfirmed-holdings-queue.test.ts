import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { countUnconfirmedHoldings, getUnconfirmedHoldingsQueue } =
  await import("./unconfirmed-holdings-queue");

describe("countUnconfirmedHoldings (#290)", () => {
  it("counts only open, unconfirmed HANDOVER holdings to a Member", async () => {
    prismaMock.gameHolding.count.mockResolvedValue(3);

    expect(await countUnconfirmedHoldings()).toBe(3);
    expect(prismaMock.gameHolding.count).toHaveBeenCalledWith({
      where: {
        endedAt: null,
        confirmedAt: null,
        origin: "HANDOVER",
        vereinsmitgliedId: { not: null },
      },
    });
  });
});

describe("getUnconfirmedHoldingsQueue (#290)", () => {
  it("maps each open, unconfirmed handover into a queue row", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([
      {
        id: "holding-1",
        startedAt: new Date("2026-01-01"),
        gameCopy: { boardGame: { slug: "arche-nova", title: "Arche Nova" } },
        vereinsmitglied: {
          firstName: "Jan",
          lastName: "Herwig",
          email: null,
          memberNumber: 1,
          meeple: { displayName: "JanH" },
        },
      },
    ] as never);

    const result = await getUnconfirmedHoldingsQueue();

    expect(result).toEqual([
      {
        id: "holding-1",
        boardGameSlug: "arche-nova",
        gameTitle: "Arche Nova",
        recipientName: "Jan Herwig",
        startedAt: new Date("2026-01-01"),
      },
    ]);
    expect(prismaMock.gameHolding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          endedAt: null,
          confirmedAt: null,
          origin: "HANDOVER",
          vereinsmitgliedId: { not: null },
        },
      }),
    );
  });

  it("returns an empty array when nothing is open", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([]);

    expect(await getUnconfirmedHoldingsQueue()).toEqual([]);
  });
});
