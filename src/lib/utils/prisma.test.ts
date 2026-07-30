import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

describe("prisma mock", () => {
  it("stubs prisma client calls without a real database connection", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ result: 1 }]);

    const { prisma } = await import("@/lib/utils/prisma");
    const result = await prisma.$queryRaw`SELECT 1 as result`;

    expect(result).toEqual([{ result: 1 }]);
  });
});
