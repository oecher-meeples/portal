import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { bankLogCutoff, deleteExpiredBankDataAccessLogs } = await import(
  "./bank-access-log"
);

describe("bankLogCutoff", () => {
  it("is exactly 24 months before the given moment", () => {
    expect(bankLogCutoff(new Date("2026-07-29T12:00:00Z")).toISOString()).toBe(
      "2024-07-29T12:00:00.000Z",
    );
  });
});

describe("deleteExpiredBankDataAccessLogs", () => {
  it("deletes only entries older than 24 months", async () => {
    prismaMock.bankDataAccessLog.deleteMany.mockResolvedValue({
      count: 2,
    } as never);

    const result = await deleteExpiredBankDataAccessLogs(
      new Date("2026-07-29T12:00:00Z"),
    );

    expect(result).toEqual({ deleted: 2 });
    expect(prismaMock.bankDataAccessLog.deleteMany).toHaveBeenCalledWith({
      where: { at: { lt: new Date("2024-07-29T12:00:00.000Z") } },
    });
  });
});
