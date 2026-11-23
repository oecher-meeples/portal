import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { HOLDING_HISTORY_LIMIT, loadCopyHistories } =
  await import("./copy-history");

function holding(id: string, gameCopyId: string) {
  return {
    id,
    gameCopyId,
    origin: "LOAN",
    startedAt: new Date("2026-03-01T10:00:00Z"),
    endedAt: null,
    confirmedAt: null,
    unit: null,
    vereinsmitglied: {
      firstName: "Kim",
      lastName: "Muster",
      email: null,
      meeple: { displayName: "Kim" },
    },
    recordedBy: { id: "m-1", displayName: "Alex", anonymizedAt: null },
  };
}

function givenHoldings(byCopy: Record<string, number>) {
  prismaMock.gameHolding.findMany.mockImplementation(((args: {
    where: { gameCopyId: string };
  }) =>
    Promise.resolve(
      Array.from({ length: byCopy[args.where.gameCopyId] ?? 0 }, (_, i) =>
        holding(`${args.where.gameCopyId}-h${i}`, args.where.gameCopyId),
      ),
    )) as never);
}

describe("loadCopyHistories (#599)", () => {
  it("queries each copy separately with take: 16 and flags older stays", async () => {
    givenHoldings({ a: HOLDING_HISTORY_LIMIT + 1, b: 3 });
    prismaMock.gameCopyCheck.findMany.mockResolvedValue([]);

    const histories = await loadCopyHistories(["a", "b"], false);

    expect(prismaMock.gameHolding.findMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.gameHolding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { gameCopyId: "a" },
        orderBy: { startedAt: "desc" },
        take: 16,
      }),
    );
    expect(histories.get("a")?.holdings).toHaveLength(15);
    expect(histories.get("a")?.holdingsTruncated).toBe(true);
    expect(histories.get("b")?.holdings).toHaveLength(3);
    expect(histories.get("b")?.holdingsTruncated).toBe(false);
    expect(histories.get("b")?.holdings[0]).toMatchObject({
      origin: "Ausleihe",
      recordedByName: "Alex",
    });
  });

  it("does not load checks without games:manage", async () => {
    givenHoldings({ a: 1 });

    const histories = await loadCopyHistories(["a"], false);

    expect(prismaMock.gameCopyCheck.findMany).not.toHaveBeenCalled();
    expect(histories.get("a")?.checks).toBeNull();
  });

  it("groups checks per copy, newest first, with anonymised checker names", async () => {
    givenHoldings({});
    prismaMock.gameCopyCheck.findMany.mockResolvedValue([
      {
        id: "c2",
        gameCopyId: "a",
        result: "UNPLAYABLE",
        checkedAt: new Date("2026-05-02T10:00:00Z"),
        note: "Nicht spielbar: Wasserschaden",
        checkedBy: {
          id: "m-gone",
          displayName: "Anonymer Meeple",
          anonymizedAt: new Date("2026-06-01T00:00:00Z"),
        },
      },
      {
        id: "c1",
        gameCopyId: "a",
        result: "COMPLETE",
        checkedAt: new Date("2026-04-01T10:00:00Z"),
        note: null,
        checkedBy: { id: "m-1", displayName: "Alex", anonymizedAt: null },
      },
    ] as never);

    const histories = await loadCopyHistories(["a", "b"], true);

    expect(prismaMock.gameCopyCheck.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { gameCopyId: { in: ["a", "b"] } },
        orderBy: { checkedAt: "desc" },
      }),
    );
    const checks = histories.get("a")?.checks;
    expect(checks?.map((c) => c.id)).toEqual(["c2", "c1"]);
    expect(checks?.[0]).toMatchObject({
      result: "UNPLAYABLE",
      resultLabel: "Nicht spielbar",
    });
    expect(checks?.[0].checkedByName).toMatch(/^Anonymer Meeple #[0-9a-f]{6}$/);
    expect(checks?.[1].checkedByName).toBe("Alex");
    expect(histories.get("b")?.checks).toEqual([]);
  });
});
