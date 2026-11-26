import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { prismaMock, prismaTxMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  addBoardGameEans,
  assertEansAvailable,
  eanWhere,
  normaliseAndValidateEans,
  replaceBoardGameEans,
  rethrowEanConflict,
} = await import("./board-game-eans");
const { EanConflictError } = await import("./errors");

const VALID = "4015566600225";
const VALID_2 = "9783897775329";

describe("normaliseAndValidateEans", () => {
  it("normalises, deduplicates and reports invalid values", () => {
    expect(
      normaliseAndValidateEans([
        `${VALID.slice(0, 4)}-${VALID.slice(4)}`,
        VALID,
        "123",
      ]),
    ).toEqual({ eans: [VALID], invalid: ["123"] });
  });

  it("handles empty input", () => {
    expect(normaliseAndValidateEans(undefined)).toEqual({
      eans: [],
      invalid: [],
    });
    expect(normaliseAndValidateEans(["  "])).toEqual({ eans: [], invalid: [] });
  });
});

describe("eanWhere", () => {
  it("matches any ean of a title, normalised", () => {
    expect(eanWhere(" 4015 5666 00225")).toEqual({
      eans: { some: { ean: VALID } },
    });
  });
});

describe("assertEansAvailable", () => {
  it("names the owning title on conflict", async () => {
    prismaMock.boardGameEan.findFirst.mockResolvedValue({
      ean: VALID,
      boardGame: { title: "Catan" },
    } as never);
    await expect(assertEansAvailable([VALID])).rejects.toThrow("„Catan“");
  });

  it("excludes the own title", async () => {
    prismaMock.boardGameEan.findFirst.mockResolvedValue(null);
    await assertEansAvailable([VALID], "own");
    expect(prismaMock.boardGameEan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ean: { in: [VALID] }, boardGameId: { not: "own" } },
      }),
    );
  });

  it("skips the query without eans", async () => {
    await assertEansAvailable([]);
    expect(prismaMock.boardGameEan.findFirst).not.toHaveBeenCalled();
  });
});

describe("rethrowEanConflict", () => {
  const p2002 = new Prisma.PrismaClientKnownRequestError("dup", {
    code: "P2002",
    clientVersion: "x",
  });

  it("maps P2002 to the owner conflict", async () => {
    prismaMock.boardGameEan.findFirst.mockResolvedValue({
      ean: VALID,
      boardGame: { title: "Catan" },
    } as never);
    await expect(rethrowEanConflict(p2002, [VALID])).rejects.toThrow(
      "„Catan“",
    );
  });

  it("falls back to a generic conflict", async () => {
    prismaMock.boardGameEan.findFirst.mockResolvedValue(null);
    await expect(rethrowEanConflict(p2002, [VALID])).rejects.toBeInstanceOf(
      EanConflictError,
    );
  });

  it("rethrows other errors", async () => {
    const other = new Error("boom");
    await expect(rethrowEanConflict(other, [VALID])).rejects.toBe(other);
  });
});

describe("replaceBoardGameEans / addBoardGameEans", () => {
  it("removes dropped and creates new eans", async () => {
    prismaMock.boardGameEan.findFirst.mockResolvedValue(null);
    prismaMock.boardGameEan.findMany.mockResolvedValue([
      { ean: VALID },
    ] as never);
    await replaceBoardGameEans(prismaTxMock, "g1", [VALID, VALID_2]);
    expect(prismaMock.boardGameEan.deleteMany).toHaveBeenCalledWith({
      where: { boardGameId: "g1", ean: { notIn: [VALID, VALID_2] } },
    });
    expect(prismaMock.boardGameEan.createMany).toHaveBeenCalledWith({
      data: [{ boardGameId: "g1", ean: VALID_2 }],
    });
  });

  it("add keeps existing eans", async () => {
    prismaMock.boardGameEan.findFirst.mockResolvedValue(null);
    await addBoardGameEans(prismaTxMock, "g1", [VALID_2]);
    expect(prismaMock.boardGameEan.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.boardGameEan.createMany).toHaveBeenCalled();
  });
});
