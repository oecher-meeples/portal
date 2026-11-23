import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { getNeonStorageUsage } = await import("@/lib/admin/neon-storage");

const LIMIT_BYTES = 0.4 * 1024 * 1024 * 1024;

describe("getNeonStorageUsage", () => {
  it("reads pg_database_size via a raw query and computes the percentage", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ bytes: BigInt(1000) }]);

    const result = await getNeonStorageUsage();

    expect(result.used).toBe(1000);
    expect(result.limit).toBe(LIMIT_BYTES);
    expect(result.percent).toBeCloseTo((1000 / LIMIT_BYTES) * 100);
  });

  it("converts the bigint byte count to a number", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ bytes: BigInt(123456789) }]);

    const result = await getNeonStorageUsage();

    expect(result.used).toBe(123456789);
    expect(typeof result.used).toBe("number");
  });
});
