import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return { ...actual, requireMeeple: requireMeepleMock };
});

const hasRoleGrantedPermissionMock = vi.fn();
vi.mock("@/lib/events/shift-rights", () => ({
  hasRoleGrantedPermission: (...args: unknown[]) =>
    hasRoleGrantedPermissionMock(...args),
}));

const {
  approveFleaMarketItem,
  setFleaMarketItemStatus,
  findFleaMarketItemByCode,
  sellFleaMarketItems,
  reserveFleaMarketCart,
  listReservedFleaMarketCarts,
} = await import("./actions");

const ME = { id: "meeple-1", neonAuthUserId: "auth-1" };

function item(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "item-1",
    eventId: "event-1",
    status: "PENDING",
    cartId: null,
    priceEuros: 10,
    ...overrides,
  };
}

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(ME);
  prismaMock.fleaMarketCart.delete.mockResolvedValue({} as never);
});

describe("without flea market rights", () => {
  it("rejects every cashier action without a database write", async () => {
    hasRoleGrantedPermissionMock.mockResolvedValue(false);
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(item() as never);

    const approveResult = await approveFleaMarketItem("item-1");
    const statusResult = await setFleaMarketItemStatus("item-1", "FOR_SALE");
    const codeResult = await findFleaMarketItemByCode("event-1", "FM-0001");
    const sellResult = await sellFleaMarketItems(["item-1"]);
    const cartResult = await reserveFleaMarketCart(
      "event-1",
      ["item-1"],
      "Anna",
    );

    expect(approveResult.error).toBeTruthy();
    expect(statusResult.error).toBeTruthy();
    expect(codeResult.error).toBeTruthy();
    expect(sellResult.error).toBeTruthy();
    expect(cartResult.error).toBeTruthy();
    expect(prismaMock.fleaMarketItem.update).not.toHaveBeenCalled();
  });
});

describe("approveFleaMarketItem", () => {
  beforeEach(() => {
    hasRoleGrantedPermissionMock.mockResolvedValue(true);
  });

  it("sets approvedAt and approvedByMeepleId exactly once", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      item({ status: "PENDING" }) as never,
    );

    const result = await approveFleaMarketItem("item-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.fleaMarketItem.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.fleaMarketItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: {
        status: "FOR_SALE",
        approvedAt: expect.any(Date),
        approvedByMeepleId: "meeple-1",
      },
    });
  });

  it("rejects approving a non-pending item", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      item({ status: "FOR_SALE" }) as never,
    );

    const result = await approveFleaMarketItem("item-1");

    expect(result.error).toBeTruthy();
    expect(prismaMock.fleaMarketItem.update).not.toHaveBeenCalled();
  });
});

describe("setFleaMarketItemStatus", () => {
  beforeEach(() => {
    hasRoleGrantedPermissionMock.mockResolvedValue(true);
  });

  it("rejects an invalid transition", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      item({ status: "PENDING" }) as never,
    );

    const result = await setFleaMarketItemStatus("item-1", "SOLD");

    expect(result.error).toBeTruthy();
    expect(prismaMock.fleaMarketItem.update).not.toHaveBeenCalled();
  });

  it("allows FOR_SALE to SOLD", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      item({ status: "FOR_SALE" }) as never,
    );

    const result = await setFleaMarketItemStatus("item-1", "SOLD");

    expect(result).toEqual({ success: true });
  });

  it("allows SOLD to PAID_OUT (#266)", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      item({ status: "SOLD" }) as never,
    );

    const result = await setFleaMarketItemStatus("item-1", "PAID_OUT");

    expect(result).toEqual({ success: true });
  });

  it("clears the cart id and deletes a now-empty cart when an item sells (#266)", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      item({ status: "RESERVED", cartId: "cart-1" }) as never,
    );
    prismaMock.fleaMarketItem.count.mockResolvedValue(0);

    await setFleaMarketItemStatus("item-1", "SOLD");

    expect(prismaMock.fleaMarketItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { status: "SOLD", cartId: null },
    });
    expect(prismaMock.fleaMarketCart.delete).toHaveBeenCalledWith({
      where: { id: "cart-1" },
    });
  });
});

describe("sellFleaMarketItems", () => {
  beforeEach(() => {
    hasRoleGrantedPermissionMock.mockResolvedValue(true);
  });

  it("rejects an empty selection", async () => {
    const result = await sellFleaMarketItems([]);
    expect(result).toEqual({ error: "Kein Artikel ausgewählt." });
  });

  it("sells every item in one call and clears their cart", async () => {
    prismaMock.fleaMarketItem.findMany.mockResolvedValue([
      item({ id: "a", status: "FOR_SALE" }),
      item({ id: "b", status: "RESERVED", cartId: "cart-1" }),
    ] as never);
    prismaMock.fleaMarketItem.count.mockResolvedValue(0);

    const result = await sellFleaMarketItems(["a", "b"]);

    expect(result).toEqual({ success: true });
    expect(prismaMock.fleaMarketItem.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["a", "b"] } },
      data: { status: "SOLD", cartId: null },
    });
    expect(prismaMock.fleaMarketCart.delete).toHaveBeenCalledWith({
      where: { id: "cart-1" },
    });
  });

  it("rejects when any item cannot transition to SOLD", async () => {
    prismaMock.fleaMarketItem.findMany.mockResolvedValue([
      item({ id: "a", status: "FOR_SALE" }),
      item({ id: "b", status: "PENDING" }),
    ] as never);

    const result = await sellFleaMarketItems(["a", "b"]);

    expect(result.error).toBeTruthy();
    expect(prismaMock.fleaMarketItem.updateMany).not.toHaveBeenCalled();
  });
});

describe("reserveFleaMarketCart", () => {
  beforeEach(() => {
    hasRoleGrantedPermissionMock.mockResolvedValue(true);
  });

  it("requires a name", async () => {
    const result = await reserveFleaMarketCart("event-1", ["a"], "  ");
    expect(result).toEqual({
      error: "Bitte einen Namen für den Warenkorb angeben.",
    });
  });

  it("creates a cart and reserves all items", async () => {
    prismaMock.fleaMarketItem.findMany.mockResolvedValue([
      item({ id: "a", status: "FOR_SALE" }),
      item({ id: "b", status: "FOR_SALE" }),
    ] as never);
    prismaMock.fleaMarketCart.create.mockResolvedValue({
      id: "cart-1",
    } as never);

    const result = await reserveFleaMarketCart("event-1", ["a", "b"], "Anna");

    expect(result).toEqual({ success: true, cartId: "cart-1" });
    expect(prismaMock.fleaMarketCart.create).toHaveBeenCalledWith({
      data: { eventId: "event-1", name: "Anna" },
    });
    expect(prismaMock.fleaMarketItem.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["a", "b"] } },
      data: { status: "RESERVED", cartId: "cart-1" },
    });
  });

  it("rejects reserving an item that isn't for sale", async () => {
    prismaMock.fleaMarketItem.findMany.mockResolvedValue([
      item({ id: "a", status: "SOLD" }),
    ] as never);

    const result = await reserveFleaMarketCart("event-1", ["a"], "Anna");

    expect(result.error).toBeTruthy();
    expect(prismaMock.fleaMarketCart.create).not.toHaveBeenCalled();
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
          item({ id: "a", priceEuros: 5 }),
          item({ id: "b", priceEuros: 7 }),
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
