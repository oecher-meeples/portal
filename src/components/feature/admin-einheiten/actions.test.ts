import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const ensureMeepleMock = vi.fn();
vi.mock("@/lib/meeples", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/meeples")>("@/lib/meeples");
  return { ...actual, ensureMeeple: ensureMeepleMock };
});

const {
  createStorageUnit,
  retireStorageUnit,
  setUnitParent,
  updateStorageUnit,
} = await import("./actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  requirePermissionMock.mockResolvedValue({ id: "admin-user" });
  ensureMeepleMock.mockResolvedValue({ id: "admin-meeple" });
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
});

describe("without the games:manage permission", () => {
  it("changes nothing in the database", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(
      createStorageUnit({ kind: "BOX", label: "Testkarton" }),
    ).rejects.toThrow(ForbiddenError);
    await expect(updateStorageUnit("unit-1", { label: "x" })).rejects.toThrow(
      ForbiddenError,
    );
    await expect(retireStorageUnit("unit-1")).rejects.toThrow(ForbiddenError);
    await expect(setUnitParent("unit-1", "unit-2")).rejects.toThrow(
      ForbiddenError,
    );

    expect(prismaMock.storageUnit.create).not.toHaveBeenCalled();
    expect(prismaMock.storageUnit.update).not.toHaveBeenCalled();
  });
});

describe("createStorageUnit", () => {
  it("generates the next free code for the given kind", async () => {
    prismaMock.storageUnit.findMany.mockResolvedValue([
      { code: "OM-BOX-0001" },
    ] as never);
    prismaMock.storageUnit.create.mockResolvedValue({
      id: "unit-2",
      code: "OM-BOX-0002",
    } as never);

    const result = await createStorageUnit({ kind: "BOX", label: "Zweiter Karton" });

    expect(result).toEqual({ success: true, id: "unit-2", code: "OM-BOX-0002" });
  });

  it("rejects an empty label", async () => {
    const result = await createStorageUnit({ kind: "BOX", label: "  " });

    expect(result).toEqual({ error: "Bitte ein Label angeben." });
    expect(prismaMock.storageUnit.create).not.toHaveBeenCalled();
  });
});

describe("retireStorageUnit", () => {
  it("rejects retiring a unit that still holds games", async () => {
    prismaMock.gameHolding.count.mockResolvedValue(1);
    prismaMock.storageUnit.count.mockResolvedValue(0);

    const result = await retireStorageUnit("unit-1");

    expect(result).toEqual({
      error:
        "Diese Einheit ist nicht leer — erst Spiele und untergeordnete Einheiten umlagern.",
    });
    expect(prismaMock.storageUnit.update).not.toHaveBeenCalled();
  });

  it("rejects retiring a unit that still has child units", async () => {
    prismaMock.gameHolding.count.mockResolvedValue(0);
    prismaMock.storageUnit.count.mockResolvedValue(1);

    const result = await retireStorageUnit("unit-1");

    expect(result.error).toMatch(/nicht leer/);
  });

  it("retires an empty unit", async () => {
    prismaMock.gameHolding.count.mockResolvedValue(0);
    prismaMock.storageUnit.count.mockResolvedValue(0);
    prismaMock.storageUnit.update.mockResolvedValue({} as never);

    const result = await retireStorageUnit("unit-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.storageUnit.update).toHaveBeenCalledWith({
      where: { id: "unit-1" },
      data: { retiredAt: expect.any(Date) },
    });
  });
});

describe("setUnitParent", () => {
  it("rejects a unit becoming its own parent", async () => {
    const result = await setUnitParent("unit-1", "unit-1");

    expect(result).toEqual({
      error: "Eine Einheit kann nicht in sich selbst stehen.",
    });
    expect(prismaMock.storageUnit.update).not.toHaveBeenCalled();
  });

  it("prevents a cycle in the storage chain", async () => {
    // unit-2's parent is unit-1, so unit-1 cannot become a child of unit-2.
    prismaMock.storageUnit.findUnique.mockResolvedValueOnce({
      parentUnitId: "unit-1",
    } as never);

    const result = await setUnitParent("unit-1", "unit-2");

    expect(result).toEqual({
      error: "Das würde einen Kreis in der Standort-Kette erzeugen.",
    });
  });

  it("records exactly one storage unit move and closes the previous one", async () => {
    prismaMock.storageUnit.findUnique
      // wouldCreateCycle walk: unit-2 has no parent
      .mockResolvedValueOnce({ parentUnitId: null } as never)
      // the unit itself, read before moving
      .mockResolvedValueOnce({
        id: "unit-1",
        keeperMeepleId: null,
        locationNote: null,
        retiredAt: null,
      } as never)
      // requireOpenUnit inside moveStorageUnit
      .mockResolvedValueOnce({ id: "unit-1", retiredAt: null } as never);
    prismaMock.storageUnitMove.updateMany.mockResolvedValue({ count: 1 } as never);
    prismaMock.storageUnitMove.create.mockResolvedValue({} as never);
    prismaMock.storageUnit.update.mockResolvedValue({} as never);

    const result = await setUnitParent("unit-1", "unit-2");

    expect(result).toEqual({ success: true });
    expect(prismaMock.storageUnitMove.updateMany).toHaveBeenCalledWith({
      where: { unitId: "unit-1", endedAt: null },
      data: { endedAt: expect.any(Date) },
    });
    expect(prismaMock.storageUnitMove.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.storageUnitMove.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ unitId: "unit-1", parentUnitId: "unit-2" }),
    });
  });
});
