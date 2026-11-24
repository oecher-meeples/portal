import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  findGameCopyAcquisitions,
  getInventoryValueSummary,
  toGameCopyAcquisition,
} = await import("./game-copy-acquisition-read");

describe("getInventoryValueSummary", () => {
  it("summiert nur nicht deinventarisierte Exemplare und zählt die ohne Wert", async () => {
    prismaMock.gameCopy.aggregate.mockResolvedValue({
      _sum: { valueCents: 12345 },
    } as never);
    prismaMock.gameCopy.count.mockResolvedValue(3);

    const summary = await getInventoryValueSummary();

    expect(summary).toEqual({ totalCents: 12345, withoutValueCount: 3 });
    expect(prismaMock.gameCopy.aggregate).toHaveBeenCalledWith({
      where: { status: { not: "DEINVENTARISED" } },
      _sum: { valueCents: true },
    });
    expect(prismaMock.gameCopy.count).toHaveBeenCalledWith({
      where: { status: { not: "DEINVENTARISED" }, valueCents: null },
    });
  });

  it("liefert 0, wenn noch kein Exemplar einen Wert hat", async () => {
    prismaMock.gameCopy.aggregate.mockResolvedValue({
      _sum: { valueCents: null },
    } as never);
    prismaMock.gameCopy.count.mockResolvedValue(0);

    expect(await getInventoryValueSummary()).toEqual({
      totalCents: 0,
      withoutValueCount: 0,
    });
  });
});

describe("toGameCopyAcquisition", () => {
  it("macht aus dem Datum JJJJ-MM-TT-Text", () => {
    expect(
      toGameCopyAcquisition({
        valueCents: 2499,
        acquiredOn: new Date("2024-03-05T00:00:00.000Z"),
      }),
    ).toEqual({ valueCents: 2499, acquiredOn: "2024-03-05" });
    expect(
      toGameCopyAcquisition({ valueCents: null, acquiredOn: null }),
    ).toEqual({ valueCents: null, acquiredOn: null });
  });
});

describe("findGameCopyAcquisitions", () => {
  it("fragt ohne Exemplare nicht die Datenbank", async () => {
    expect((await findGameCopyAcquisitions([])).size).toBe(0);
    expect(prismaMock.gameCopy.findMany).not.toHaveBeenCalled();
  });

  it("lädt Wert und Datum je Exemplar", async () => {
    prismaMock.gameCopy.findMany.mockResolvedValue([
      {
        id: "copy-1",
        valueCents: 2499,
        acquiredOn: new Date("2024-03-05T00:00:00.000Z"),
      },
    ] as never);

    const byId = await findGameCopyAcquisitions(["copy-1"]);

    expect(byId.get("copy-1")).toEqual({
      valueCents: 2499,
      acquiredOn: "2024-03-05",
    });
    expect(prismaMock.gameCopy.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["copy-1"] } },
      select: { id: true, valueCents: true, acquiredOn: true },
    });
  });
});
