import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeepleMock = vi.fn();
vi.mock("@/lib/meeples", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/meeples")>("@/lib/meeples");
  return { ...actual, requireMeeple: requireMeepleMock };
});

const {
  createFleaMarketItem,
  deleteOwnFleaMarketItem,
  updateOwnFleaMarketItem,
} = await import("./actions");

class RedirectError extends Error {}

const OWNER = { id: "meeple-owner", neonAuthUserId: "auth-owner" };
const OTHER = { id: "meeple-other", neonAuthUserId: "auth-other" };

function fleaMarketItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "item-1",
    code: "FM-0001",
    eventId: "event-1",
    sellerMeepleId: OWNER.id,
    title: "Wingspan",
    description: null,
    priceEuros: 20,
    status: "PENDING",
    approvedAt: null,
    approvedByMeepleId: null,
    ...overrides,
  };
}

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(OWNER);
  prismaMock.fleaMarketItem.findMany.mockResolvedValue([]);
  prismaMock.fleaMarketItem.create.mockResolvedValue(fleaMarketItem() as never);
});

describe("without a session", () => {
  it("writes nothing", async () => {
    requireMeepleMock.mockRejectedValue(new RedirectError("/login"));

    await expect(
      createFleaMarketItem("event-1", "Wingspan", 20),
    ).rejects.toThrow(RedirectError);
    await expect(
      updateOwnFleaMarketItem("item-1", { title: "x", priceEuros: 1 }),
    ).rejects.toThrow(RedirectError);
    await expect(deleteOwnFleaMarketItem("item-1")).rejects.toThrow(
      RedirectError,
    );
    expect(prismaMock.fleaMarketItem.create).not.toHaveBeenCalled();
  });
});

describe("createFleaMarketItem", () => {
  it("always starts as PENDING with a generated code", async () => {
    const result = await createFleaMarketItem("event-1", "Wingspan", 20);

    expect(result).toEqual({ success: true, id: "item-1", code: "FM-0001" });
    expect(prismaMock.fleaMarketItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "FM-0001",
        eventId: "event-1",
        sellerMeepleId: OWNER.id,
        title: "Wingspan",
        priceEuros: 20,
        status: "PENDING",
      }),
    });
  });

  it("rejects a missing title", async () => {
    const result = await createFleaMarketItem("event-1", "  ", 20);

    expect(result).toEqual({ error: "Bitte einen Titel angeben." });
    expect(prismaMock.fleaMarketItem.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid price", async () => {
    const result = await createFleaMarketItem("event-1", "Wingspan", -5);

    expect(result).toEqual({ error: "Bitte einen gültigen Preis angeben." });
    expect(prismaMock.fleaMarketItem.create).not.toHaveBeenCalled();
  });

  it("generates the next code from existing codes", async () => {
    prismaMock.fleaMarketItem.findMany.mockResolvedValue([
      { code: "FM-0001" },
      { code: "FM-0002" },
    ] as never);

    await createFleaMarketItem("event-1", "Wingspan", 20);

    expect(prismaMock.fleaMarketItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ code: "FM-0003" }),
    });
  });
});

describe("updateOwnFleaMarketItem", () => {
  it("updates the caller's own PENDING item", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      fleaMarketItem() as never,
    );
    prismaMock.fleaMarketItem.update.mockResolvedValue({} as never);

    const result = await updateOwnFleaMarketItem("item-1", {
      title: "Wingspan Deluxe",
      priceEuros: 25,
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.fleaMarketItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: expect.objectContaining({
        title: "Wingspan Deluxe",
        priceEuros: 25,
      }),
    });
  });

  it("rejects editing another member's item", async () => {
    requireMeepleMock.mockResolvedValue(OTHER);
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      fleaMarketItem() as never,
    );

    const result = await updateOwnFleaMarketItem("item-1", {
      title: "x",
      priceEuros: 1,
    });

    expect(result).toEqual({
      error: "Nur der eigene Artikel kann bearbeitet werden.",
    });
    expect(prismaMock.fleaMarketItem.update).not.toHaveBeenCalled();
  });

  it("rejects editing a RESERVED item", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      fleaMarketItem({ status: "RESERVED" }) as never,
    );

    const result = await updateOwnFleaMarketItem("item-1", {
      title: "x",
      priceEuros: 1,
    });

    expect(result).toEqual({
      error:
        "Reservierte oder verkaufte Artikel können nicht mehr bearbeitet werden.",
    });
    expect(prismaMock.fleaMarketItem.update).not.toHaveBeenCalled();
  });

  it("rejects editing a SOLD item", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      fleaMarketItem({ status: "SOLD" }) as never,
    );

    const result = await updateOwnFleaMarketItem("item-1", {
      title: "x",
      priceEuros: 1,
    });

    expect(result).toEqual({
      error:
        "Reservierte oder verkaufte Artikel können nicht mehr bearbeitet werden.",
    });
    expect(prismaMock.fleaMarketItem.update).not.toHaveBeenCalled();
  });
});

describe("deleteOwnFleaMarketItem", () => {
  it("deletes the caller's own PENDING or FOR_SALE item", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      fleaMarketItem({ status: "FOR_SALE" }) as never,
    );
    prismaMock.fleaMarketItem.delete.mockResolvedValue({} as never);

    const result = await deleteOwnFleaMarketItem("item-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.fleaMarketItem.delete).toHaveBeenCalledWith({
      where: { id: "item-1" },
    });
  });

  it("rejects deleting another member's item", async () => {
    requireMeepleMock.mockResolvedValue(OTHER);
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      fleaMarketItem() as never,
    );

    const result = await deleteOwnFleaMarketItem("item-1");

    expect(result).toEqual({
      error: "Nur der eigene Artikel kann gelöscht werden.",
    });
    expect(prismaMock.fleaMarketItem.delete).not.toHaveBeenCalled();
  });

  it("rejects deleting a RESERVED item", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      fleaMarketItem({ status: "RESERVED" }) as never,
    );

    const result = await deleteOwnFleaMarketItem("item-1");

    expect(result).toEqual({
      error:
        "Reservierte oder verkaufte Artikel können nicht mehr gelöscht werden.",
    });
    expect(prismaMock.fleaMarketItem.delete).not.toHaveBeenCalled();
  });

  it("rejects deleting a SOLD item", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      fleaMarketItem({ status: "SOLD" }) as never,
    );

    const result = await deleteOwnFleaMarketItem("item-1");

    expect(result).toEqual({
      error:
        "Reservierte oder verkaufte Artikel können nicht mehr gelöscht werden.",
    });
    expect(prismaMock.fleaMarketItem.delete).not.toHaveBeenCalled();
  });
});
