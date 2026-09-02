import { describe, expect, it } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";
import {
  suggestNextInventoryNumber,
  validateInventoryNumberUniqueness,
} from "./game-copy-inventory-number";

describe("suggestNextInventoryNumber", () => {
  it("suggests 1 for an empty table", () => {
    expect(suggestNextInventoryNumber([])).toBe("1");
  });

  it("suggests the highest existing number plus one", () => {
    expect(suggestNextInventoryNumber(["3", "1", "7", "2"])).toBe("8");
  });

  it("ignores non-numeric existing values", () => {
    expect(suggestNextInventoryNumber(["A-12", "5", null, "  "])).toBe("6");
  });

  it("falls back to 1 when only non-numeric values exist", () => {
    expect(suggestNextInventoryNumber(["A-12", "regal-3"])).toBe("1");
  });
});

describe("validateInventoryNumberUniqueness", () => {
  it("passes a blank value through without a db query", async () => {
    const error = await validateInventoryNumberUniqueness(prismaMock, "  ");

    expect(error).toBeNull();
    expect(prismaMock.gameCopy.findFirst).not.toHaveBeenCalled();
  });

  it("returns null when the number is free", async () => {
    prismaMock.gameCopy.findFirst.mockResolvedValue(null);

    const error = await validateInventoryNumberUniqueness(prismaMock, "12");

    expect(error).toBeNull();
  });

  it("returns an error message on collision", async () => {
    prismaMock.gameCopy.findFirst.mockResolvedValue({ id: "other" } as never);

    const error = await validateInventoryNumberUniqueness(prismaMock, "12");

    expect(error).toBe('Inventarnummer "12" ist bereits vergeben.');
  });

  it("excludes the copy's own id (editing without changing the number)", async () => {
    prismaMock.gameCopy.findFirst.mockResolvedValue(null);

    await validateInventoryNumberUniqueness(prismaMock, "12", "copy-1");

    expect(prismaMock.gameCopy.findFirst).toHaveBeenCalledWith({
      where: { inventoryNumber: "12", id: { not: "copy-1" } },
      select: { id: true },
    });
  });
});
