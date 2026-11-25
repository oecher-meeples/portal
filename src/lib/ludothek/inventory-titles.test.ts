import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";
import { IN_INVENTORY_WHERE } from "./board-game-stub";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { listInventoryTitleOptions } = await import("./inventory-titles");

beforeEach(() => vi.clearAllMocks());

describe("listInventoryTitleOptions (#637)", () => {
  it("fragt nur Titel mit Vereinsexemplar oder Privatbesitz ab, nie reine Stubs", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([]);

    await listInventoryTitleOptions();

    expect(prismaMock.boardGame.findMany).toHaveBeenCalledWith({
      where: IN_INVENTORY_WHERE,
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
    expect(IN_INVENTORY_WHERE).toEqual({
      OR: [
        { copies: { some: {} } },
        { privateCollectionEntries: { some: {} } },
      ],
    });
  });
});
