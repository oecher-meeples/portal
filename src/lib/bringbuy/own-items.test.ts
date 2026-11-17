import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requireMemberMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  requireMember: () => requireMemberMock(),
}));

const findExternalSellerByTokenMock = vi.fn();
vi.mock("@/lib/bringbuy/queries", () => ({
  findExternalSellerByToken: (token: string) =>
    findExternalSellerByTokenMock(token),
}));

const {
  createOwnFleaMarketItemAsMeeple,
  updateOwnFleaMarketItemAsMeeple,
  createOwnFleaMarketItemWithToken,
  updateOwnFleaMarketItemWithToken,
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

function openEvent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "event-1",
    hasBringAndBuyMarket: true,
    startsAt: new Date(),
    endsAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-1" } });
  findExternalSellerByTokenMock.mockResolvedValue({
    id: "seller-1",
    eventId: "event-1",
    name: "Anna",
  });
  prismaMock.event.findUnique.mockResolvedValue(openEvent() as never);
  prismaMock.fleaMarketItem.findMany.mockResolvedValue([]);
  prismaMock.fleaMarketItem.create.mockResolvedValue({} as never);
});

describe("createOwnFleaMarketItemAsMeeple", () => {
  it("creates a PENDING item for the logged-in meeple", async () => {
    const result = await createOwnFleaMarketItemAsMeeple(
      "event-1",
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

  it("lets the login redirect propagate without a session", async () => {
    requireMemberMock.mockImplementation(() => redirect("/login"));

    await expect(
      createOwnFleaMarketItemAsMeeple("event-1", VALID_INPUT),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(prismaMock.fleaMarketItem.create).not.toHaveBeenCalled();
  });

  it("rejects when the market is closed", async () => {
    prismaMock.event.findUnique.mockResolvedValue(
      openEvent({ hasBringAndBuyMarket: false }) as never,
    );

    const result = await createOwnFleaMarketItemAsMeeple(
      "event-1",
      VALID_INPUT,
    );

    expect(result).toEqual({
      error: "Der Bring&Buy-Markt ist für dieses Event nicht geöffnet.",
    });
    expect(prismaMock.fleaMarketItem.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown event", async () => {
    prismaMock.event.findUnique.mockResolvedValue(null);

    const result = await createOwnFleaMarketItemAsMeeple(
      "event-x",
      VALID_INPUT,
    );

    expect("error" in result).toBe(true);
    expect(prismaMock.fleaMarketItem.create).not.toHaveBeenCalled();
  });

  it("rejects a missing language", async () => {
    const result = await createOwnFleaMarketItemAsMeeple("event-1", {
      ...VALID_INPUT,
      language: "  ",
    });

    expect(result).toEqual({ error: "Bitte eine Sprache angeben." });
    expect(prismaMock.fleaMarketItem.create).not.toHaveBeenCalled();
  });
});

describe("createOwnFleaMarketItemWithToken", () => {
  it("creates the item for the token's seller and event", async () => {
    findExternalSellerByTokenMock.mockResolvedValue({
      id: "seller-1",
      eventId: "event-7",
      name: "Anna",
    });

    await createOwnFleaMarketItemWithToken("tok", VALID_INPUT);

    expect(findExternalSellerByTokenMock).toHaveBeenCalledWith("tok");
    expect(prismaMock.fleaMarketItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: "event-7",
        sellerMeepleId: null,
        externalSellerId: "seller-1",
      }),
    });
  });

  it("rejects an invalid token without writing", async () => {
    findExternalSellerByTokenMock.mockResolvedValue(null);

    const result = await createOwnFleaMarketItemWithToken(
      "forged",
      VALID_INPUT,
    );

    expect(result).toEqual({
      error: "Dieser Verkäufer-Link ist nicht (mehr) gültig.",
    });
    expect(prismaMock.fleaMarketItem.create).not.toHaveBeenCalled();
  });

  it("rejects when the market is closed", async () => {
    prismaMock.event.findUnique.mockResolvedValue(
      openEvent({ endsAt: new Date("2020-01-01") }) as never,
    );

    const result = await createOwnFleaMarketItemWithToken("tok", VALID_INPUT);

    expect("error" in result).toBe(true);
    expect(prismaMock.fleaMarketItem.create).not.toHaveBeenCalled();
  });
});

describe("updateOwnFleaMarketItemAsMeeple", () => {
  it("rejects updating another seller's item", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      fleaItem({ sellerMeepleId: "someone-else" }) as never,
    );

    const result = await updateOwnFleaMarketItemAsMeeple("item-1", VALID_INPUT);

    expect(result).toEqual({ error: "Dieser Artikel gehört dir nicht." });
    expect(prismaMock.fleaMarketItem.update).not.toHaveBeenCalled();
  });

  it("rejects updating an already approved item", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      fleaItem({ status: "FOR_SALE" }) as never,
    );

    const result = await updateOwnFleaMarketItemAsMeeple("item-1", VALID_INPUT);

    expect("error" in result).toBe(true);
    expect(prismaMock.fleaMarketItem.update).not.toHaveBeenCalled();
  });

  it("rejects when the item's market is closed", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(fleaItem() as never);
    prismaMock.event.findUnique.mockResolvedValue(
      openEvent({ hasBringAndBuyMarket: false }) as never,
    );

    const result = await updateOwnFleaMarketItemAsMeeple("item-1", VALID_INPUT);

    expect("error" in result).toBe(true);
    expect(prismaMock.fleaMarketItem.update).not.toHaveBeenCalled();
  });

  it("updates a still-pending own item", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(fleaItem() as never);

    const result = await updateOwnFleaMarketItemAsMeeple("item-1", {
      title: "Wingspan",
      language: "EN",
      priceEuros: 20,
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.event.findUnique).toHaveBeenCalledWith({
      where: { id: "event-1" },
    });
    expect(prismaMock.fleaMarketItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { title: "Wingspan", language: "EN", priceEuros: 20 },
    });
  });
});

describe("updateOwnFleaMarketItemWithToken", () => {
  it("rejects a meeple's item even if the token is valid", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(fleaItem() as never);

    const result = await updateOwnFleaMarketItemWithToken(
      "tok",
      "item-1",
      VALID_INPUT,
    );

    expect(result).toEqual({ error: "Dieser Artikel gehört dir nicht." });
    expect(prismaMock.fleaMarketItem.update).not.toHaveBeenCalled();
  });

  it("rejects an invalid token before loading the item", async () => {
    findExternalSellerByTokenMock.mockResolvedValue(null);

    const result = await updateOwnFleaMarketItemWithToken(
      "forged",
      "item-1",
      VALID_INPUT,
    );

    expect("error" in result).toBe(true);
    expect(prismaMock.fleaMarketItem.findUnique).not.toHaveBeenCalled();
  });

  it("updates the external seller's own pending item", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      fleaItem({ sellerMeepleId: null, externalSellerId: "seller-1" }) as never,
    );

    const result = await updateOwnFleaMarketItemWithToken(
      "tok",
      "item-1",
      VALID_INPUT,
    );

    expect(result).toEqual({ success: true });
    expect(prismaMock.fleaMarketItem.update).toHaveBeenCalled();
  });
});
