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

const { importFleaMarketItemsCsv } = await import("./import-actions");

const CASHIER = { id: "meeple-1", neonAuthUserId: "auth-1" };

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(CASHIER);
  prismaMock.meeple.findUnique.mockResolvedValue({
    neonAuthUserId: "auth-1",
  } as never);
  prismaMock.rolePermission.count.mockResolvedValue(1); // events:manage by default
  prismaMock.shiftBooking.findFirst.mockResolvedValue(null);
  prismaMock.fleaMarketItem.findMany.mockResolvedValue([]);
  prismaMock.fleaMarketItem.create.mockResolvedValue({ id: "item-x" } as never);
});

describe("importFleaMarketItemsCsv permission gate", () => {
  it("rejects a meeple with neither events:manage nor an active KASSE shift", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await importFleaMarketItemsCsv(
      "event-1",
      "title,price,description\nAzul,22\n",
    );

    expect(result).toEqual(
      expect.objectContaining({ created: 0, error: expect.any(String) }),
    );
    expect(prismaMock.fleaMarketItem.create).not.toHaveBeenCalled();
  });

  it("allows a meeple with the events:manage permission", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await importFleaMarketItemsCsv(
      "event-1",
      "title,price,description\nAzul,22\n",
    );

    expect(result.error).toBeUndefined();
    expect(prismaMock.fleaMarketItem.create).toHaveBeenCalledTimes(1);
  });

  it("allows a meeple with an active KASSE shift but no permission", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(0);
    prismaMock.shiftBooking.findFirst.mockResolvedValue({
      shiftId: "shift-1",
    } as never);

    const result = await importFleaMarketItemsCsv(
      "event-1",
      "title,price,description\nAzul,22\n",
    );

    expect(result.error).toBeUndefined();
    expect(prismaMock.fleaMarketItem.create).toHaveBeenCalledTimes(1);
  });
});

describe("importFleaMarketItemsCsv", () => {
  it("creates exactly as many items as there are valid rows", async () => {
    const raw =
      "title,price,description\nWingspan,28\nAzul,22\nSplendor,ungueltig\n";

    const result = await importFleaMarketItemsCsv("event-1", raw);

    expect(result.created).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(prismaMock.fleaMarketItem.create).toHaveBeenCalledTimes(2);
  });

  it("assigns the cashier's own meeple as seller and status PENDING", async () => {
    await importFleaMarketItemsCsv(
      "event-1",
      "title,price,description\nAzul,22\n",
    );

    expect(prismaMock.fleaMarketItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sellerMeepleId: "meeple-1",
          status: "PENDING",
        }),
      }),
    );
  });

  it("generates distinct codes across the whole batch", async () => {
    await importFleaMarketItemsCsv(
      "event-1",
      "title,price,description\nAzul,22\nWingspan,28\n",
    );

    const codes = prismaMock.fleaMarketItem.create.mock.calls.map(
      (call) => (call[0] as { data: { code: string } }).data.code,
    );
    expect(new Set(codes).size).toBe(codes.length);
  });
});
