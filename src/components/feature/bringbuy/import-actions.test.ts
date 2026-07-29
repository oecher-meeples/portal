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

const { importFleaMarketItemsCsv } = await import("./import-actions");

const SELLER = { id: "meeple-1", neonAuthUserId: "auth-1" };

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(SELLER);
  prismaMock.fleaMarketItem.findMany.mockResolvedValue([]);
  prismaMock.fleaMarketItem.create.mockResolvedValue({ id: "item-x" } as never);
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

  it("assigns the caller's own meeple as seller and status PENDING", async () => {
    await importFleaMarketItemsCsv("event-1", "title,price,description\nAzul,22\n");

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
