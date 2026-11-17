import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  listOwnFleaMarketItems,
  findExternalSellerByToken,
  listReservedFleaMarketCarts,
} = await import("./queries");

beforeEach(() => {
  prismaMock.fleaMarketItem.findMany.mockResolvedValue([]);
});

describe("listOwnFleaMarketItems", () => {
  it("queries by sellerMeepleId for a meeple seller", async () => {
    await listOwnFleaMarketItems("event-1", { sellerMeepleId: "meeple-1" });

    expect(prismaMock.fleaMarketItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId: "event-1", sellerMeepleId: "meeple-1" },
      }),
    );
  });

  it("queries by externalSellerId for a token seller", async () => {
    await listOwnFleaMarketItems("event-1", { externalSellerId: "seller-1" });

    expect(prismaMock.fleaMarketItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId: "event-1", externalSellerId: "seller-1" },
      }),
    );
  });
});

describe("findExternalSellerByToken", () => {
  it("returns null for an unknown token", async () => {
    prismaMock.fleaMarketExternalSeller.findUnique.mockResolvedValue(null);

    expect(await findExternalSellerByToken("nope")).toBeNull();
  });

  it("returns the seller context for a still-valid token", async () => {
    prismaMock.fleaMarketExternalSeller.findUnique.mockResolvedValue({
      id: "seller-1",
      eventId: "event-1",
      name: "Anna",
      items: [{ status: "SOLD" }],
    } as never);

    expect(await findExternalSellerByToken("tok")).toEqual({
      id: "seller-1",
      eventId: "event-1",
      name: "Anna",
    });
  });

  it("returns null once every item reached a terminal state", async () => {
    prismaMock.fleaMarketExternalSeller.findUnique.mockResolvedValue({
      id: "seller-1",
      eventId: "event-1",
      name: "Anna",
      items: [{ status: "PAID_OUT" }],
    } as never);

    expect(await findExternalSellerByToken("tok")).toBeNull();
  });
});

describe("listReservedFleaMarketCarts", () => {
  it("summarises each cart's items", async () => {
    prismaMock.fleaMarketCart.findMany.mockResolvedValue([
      {
        id: "cart-1",
        name: "Anna",
        createdAt: new Date("2026-08-01"),
        items: [
          { id: "a", priceEuros: 5 },
          { id: "b", priceEuros: 7 },
        ],
      },
    ] as never);

    const result = await listReservedFleaMarketCarts("event-1");

    expect(result).toEqual([
      {
        id: "cart-1",
        name: "Anna",
        createdAt: new Date("2026-08-01"),
        itemIds: ["a", "b"],
        totalEuros: 12,
      },
    ]);
  });
});
