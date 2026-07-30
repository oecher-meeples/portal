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

const hasFleaMarketRightsMock = vi.fn();
vi.mock("@/lib/events/shift-rights", () => ({
  hasFleaMarketRights: (...args: unknown[]) => hasFleaMarketRightsMock(...args),
}));

const {
  approveFleaMarketItem,
  setFleaMarketItemStatus,
  findFleaMarketItemByCode,
} = await import("./cashier-actions");

const ME = { id: "meeple-1", neonAuthUserId: "auth-1" };

function item(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "item-1",
    eventId: "event-1",
    status: "PENDING",
    ...overrides,
  };
}

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(ME);
});

describe("without flea market rights", () => {
  it("rejects every cashier action without a database write", async () => {
    hasFleaMarketRightsMock.mockResolvedValue(false);
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(item() as never);

    const approveResult = await approveFleaMarketItem("item-1");
    const statusResult = await setFleaMarketItemStatus("item-1", "FOR_SALE");
    const codeResult = await findFleaMarketItemByCode("event-1", "FM-0001");

    expect(approveResult.error).toBeTruthy();
    expect(statusResult.error).toBeTruthy();
    expect(codeResult.error).toBeTruthy();
    expect(prismaMock.fleaMarketItem.update).not.toHaveBeenCalled();
  });
});

describe("approveFleaMarketItem", () => {
  beforeEach(() => {
    hasFleaMarketRightsMock.mockResolvedValue(true);
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
    hasFleaMarketRightsMock.mockResolvedValue(true);
  });

  it("rejects any transition away from SOLD", async () => {
    prismaMock.fleaMarketItem.findUnique.mockResolvedValue(
      item({ status: "SOLD" }) as never,
    );

    const result = await setFleaMarketItemStatus("item-1", "FOR_SALE");

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
});
