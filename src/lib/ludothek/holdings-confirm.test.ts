import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { confirmHolding, HoldingConflictError, moveStorageUnit } =
  await import("./holdings");

const UNIT_ID = "unit-1";
const MEEPLE_A = "meeple-a";
const MEEPLE_B = "meeple-b";
const MEMBER_A = "member-a";
const MEMBER_B = "member-b";

function openHolding(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "holding-1",
    gameCopyId: "game-1",
    unitId: null,
    vereinsmitgliedId: null,
    origin: "INITIAL",
    startedAt: new Date(),
    endedAt: null,
    confirmedAt: null,
    recordedByMeepleId: MEEPLE_A,
    note: null,
    ...overrides,
  };
}

beforeEach(() => {
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
  prismaMock.storageUnit.findUnique.mockResolvedValue({
    id: UNIT_ID,
    retiredAt: null,
  } as never);
  prismaMock.gameHolding.update.mockResolvedValue({} as never);
});

describe("confirmHolding", () => {
  it("confirms a handover when the receiver confirms", async () => {
    prismaMock.gameHolding.findUnique.mockResolvedValue(
      openHolding({
        vereinsmitgliedId: MEMBER_B,
        origin: "HANDOVER",
        confirmedAt: null,
      }) as never,
    );
    prismaMock.gameHolding.update.mockResolvedValue({} as never);

    await confirmHolding({
      holdingId: "holding-1",
      confirmingVereinsmitgliedId: MEMBER_B,
    });

    expect(prismaMock.gameHolding.update).toHaveBeenCalledWith({
      where: { id: "holding-1" },
      data: { confirmedAt: expect.any(Date) },
    });
  });

  it("rejects confirmation by someone other than the receiver", async () => {
    prismaMock.gameHolding.findUnique.mockResolvedValue(
      openHolding({
        vereinsmitgliedId: MEMBER_B,
        origin: "HANDOVER",
        confirmedAt: null,
      }) as never,
    );

    await expect(
      confirmHolding({
        holdingId: "holding-1",
        confirmingVereinsmitgliedId: MEMBER_A,
      }),
    ).rejects.toThrow(HoldingConflictError);
  });

  it("a Rückgabe can only be confirmed by einlagern, not by confirmHolding", async () => {
    prismaMock.gameHolding.findUnique.mockResolvedValue(
      openHolding({
        vereinsmitgliedId: MEMBER_B,
        origin: "RETURN",
        confirmedAt: null,
      }) as never,
    );

    await expect(
      confirmHolding({
        holdingId: "holding-1",
        confirmingVereinsmitgliedId: MEMBER_B,
      }),
    ).rejects.toThrow(HoldingConflictError);
  });
});

describe("moveStorageUnit", () => {
  it("closes the previous move and opens a new one", async () => {
    prismaMock.storageUnit.findUnique.mockResolvedValue({
      id: UNIT_ID,
      retiredAt: null,
    } as never);
    prismaMock.storageUnitMove.updateMany.mockResolvedValue({
      count: 1,
    } as never);
    prismaMock.storageUnitMove.create.mockResolvedValue({} as never);
    prismaMock.storageUnit.update.mockResolvedValue({} as never);

    await moveStorageUnit({
      unitId: UNIT_ID,
      recordedByMeepleId: MEEPLE_A,
      keeperMeepleId: MEEPLE_B,
    });

    expect(prismaMock.storageUnitMove.updateMany).toHaveBeenCalledWith({
      where: { unitId: UNIT_ID, endedAt: null },
      data: { endedAt: expect.any(Date) },
    });
    expect(prismaMock.storageUnitMove.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        unitId: UNIT_ID,
        keeperMeepleId: MEEPLE_B,
      }),
    });
  });
});
