import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/ludothek/query", () => ({ buildLudothekGames: vi.fn() }));

/** Ausgelagert aus `guest-area.test.ts` (400-Zeilen-Grenze) — der
 * Flohmarkt-Teil des Gastbereichs braucht dessen Spiele-Mocks nicht. */
const { getGuestFleaMarketItems } = await import("./guest-area");

describe("getGuestFleaMarketItems", () => {
  it("never includes PENDING items", async () => {
    prismaMock.fleaMarketItem.findMany.mockResolvedValue([
      {
        id: "item-1",
        title: "Azul",
        description: null,
        priceEuros: 20,
        status: "FOR_SALE",
      },
    ] as never);

    const result = await getGuestFleaMarketItems("event-1");

    expect(result).toEqual([
      {
        id: "item-1",
        title: "Azul",
        description: null,
        priceEuros: 20,
        status: "FOR_SALE",
      },
    ]);
    expect(prismaMock.fleaMarketItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId: "event-1", status: { in: ["FOR_SALE", "RESERVED"] } },
      }),
    );
  });

  it("queries only FOR_SALE and RESERVED, excluding SOLD", async () => {
    prismaMock.fleaMarketItem.findMany.mockResolvedValue([]);

    await getGuestFleaMarketItems("event-1");

    const call = prismaMock.fleaMarketItem.findMany.mock.calls[0][0] as {
      where: { status: { in: string[] } };
    };
    expect(call.where.status.in).not.toContain("SOLD");
    expect(call.where.status.in).not.toContain("PENDING");
  });
});
