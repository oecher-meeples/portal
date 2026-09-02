import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const {
  createOwnFleaMarketItem,
  updateOwnFleaMarketItem,
  listOwnFleaMarketItems,
} = await import("./own-items");

const VALID_INPUT = { title: "Catan", language: "DE", priceEuros: 10 };

function fleaItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "item-1",
    eventId: "event-1",
    sellerMeepleId: "meeple-1",
    externalSellerId: null,
    status: "PENDING",
    ...overrides,
  };
}

beforeEach(() => {
  prismaMock.fleaMarketItem.findMany.mockResolvedValue([]);
  prismaMock.fleaMarketItem.create.mockResolvedValue({} as never);
});

describe("createOwnFleaMarketItem", () => {
  it("creates a PENDING item for a meeple seller", async () => {
    const result = await createOwnFleaMarketItem(
      "event-1",
      { sellerMeepleId: "meeple-1" },
      VALID_INPUT,
    );

    expect(result).toEqual({ success: true });
    expect(prismaMock.fleaMarketItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: "event-1",
        sellerMeepleId: "meeple-1",
        externalSellerId: null,
        title: "Catan",
        language: "DE",
        priceEuros: 10,
        status: "PENDING",
      }),
    });
  });

  it("creates a PENDING item for an external seller", async () => {
    await createOwnFleaMarketItem(
      "event-1",
      { externalSellerId: "seller-1" },
      VALID_INPUT,
    );

    expect(prismaMock.fleaMarketItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sellerMeepleId: null,
        externalSellerId: "seller-1",
      }),
    });
  });

  it("rejects a missing language", async () => {
    const result = await createOwnFleaMarketItem(
      "event-1",
      { sellerMeepleId: "meeple-1" },
      { ...VALID_INPUT, language: "  " },
    );

    expect(result).toEqual({ error: "Bitte eine Sprache angeben." });
    expect(prismaMock.fleaMarketItem.create).not.toHaveBeenCalled();
  });
});

describe("updateOwnFleaMarketItem", () => {
  it("rejects updating another seller's item", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      fleaItem({ sellerMeepleId: "someone-else" }) as never,
    );

    const result = await updateOwnFleaMarketItem(
      { sellerMeepleId: "meeple-1" },
      "item-1",
      VALID_INPUT,
    );

    expect(result).toEqual({ error: "Dieser Artikel gehört dir nicht." });
    expect(prismaMock.fleaMarketItem.update).not.toHaveBeenCalled();
  });

  it("rejects updating an already approved item", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      fleaItem({ status: "FOR_SALE" }) as never,
    );

    const result = await updateOwnFleaMarketItem(
      { sellerMeepleId: "meeple-1" },
      "item-1",
      VALID_INPUT,
    );

    expect(result.error).toBeTruthy();
    expect(prismaMock.fleaMarketItem.update).not.toHaveBeenCalled();
  });

  it("updates a still-pending own item", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(fleaItem() as never);

    const result = await updateOwnFleaMarketItem(
      { sellerMeepleId: "meeple-1" },
      "item-1",
      { title: "Wingspan", language: "EN", priceEuros: 20 },
    );

    expect(result).toEqual({ success: true });
    expect(prismaMock.fleaMarketItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { title: "Wingspan", language: "EN", priceEuros: 20 },
    });
  });
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
