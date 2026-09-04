import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { resetExplainerAttendance } = await import("./attendance-cleanup");

describe("resetExplainerAttendance (#338)", () => {
  it("deletes every ExplainerAttendance row, unconditionally", async () => {
    prismaMock.explainerAttendance.deleteMany.mockResolvedValue({ count: 3 });

    const result = await resetExplainerAttendance();

    expect(prismaMock.explainerAttendance.deleteMany).toHaveBeenCalledWith({});
    expect(result).toEqual({ deleted: 3 });
  });
});
