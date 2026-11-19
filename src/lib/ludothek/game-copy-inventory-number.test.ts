import { describe, expect, it } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";
import {
  INVALID_INVENTORY_NUMBER_ERROR,
  isValidInventoryNumber,
  parseInventoryNumber,
  validateInventoryNumber,
} from "./game-copy-inventory-number";

describe("parseInventoryNumber", () => {
  it("returns null for blank input", () => {
    expect(parseInventoryNumber("")).toBeNull();
    expect(parseInventoryNumber("   ")).toBeNull();
  });

  it("parses a plain digit string", () => {
    expect(parseInventoryNumber(" 123 ")).toBe(123);
  });

  it("drops leading zeros", () => {
    expect(parseInventoryNumber("007")).toBe(7);
  });

  it.each(["A-12", "1.5", "-3", "12a", "1e3"])(
    "returns NaN for non-digit input %s",
    (raw) => {
      expect(parseInventoryNumber(raw)).toBeNaN();
    },
  );
});

describe("isValidInventoryNumber", () => {
  it("accepts positive integers", () => {
    expect(isValidInventoryNumber(1)).toBe(true);
    expect(isValidInventoryNumber(2_147_483_647)).toBe(true);
  });

  it.each([0, -1, 1.5, Number.NaN, 2_147_483_648])("rejects %s", (value) => {
    expect(isValidInventoryNumber(value)).toBe(false);
  });
});

describe("validateInventoryNumber", () => {
  it("rejects an invalid number without a db query", async () => {
    const error = await validateInventoryNumber(prismaMock, Number.NaN);

    expect(error).toBe(INVALID_INVENTORY_NUMBER_ERROR);
    expect(prismaMock.gameCopy.findFirst).not.toHaveBeenCalled();
  });

  it("returns null when the number is free", async () => {
    prismaMock.gameCopy.findFirst.mockResolvedValue(null);

    const error = await validateInventoryNumber(prismaMock, 12);

    expect(error).toBeNull();
  });

  it("returns an error message on collision", async () => {
    prismaMock.gameCopy.findFirst.mockResolvedValue({ id: "other" } as never);

    const error = await validateInventoryNumber(prismaMock, 12);

    expect(error).toBe("Inventarnummer 12 ist bereits vergeben.");
  });

  it("excludes the copy's own id (editing without changing the number)", async () => {
    prismaMock.gameCopy.findFirst.mockResolvedValue(null);

    await validateInventoryNumber(prismaMock, 12, "copy-1");

    expect(prismaMock.gameCopy.findFirst).toHaveBeenCalledWith({
      where: { inventoryNumber: 12, id: { not: "copy-1" } },
      select: { id: true },
    });
  });
});
