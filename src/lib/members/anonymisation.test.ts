import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const deleteBlobsMock = vi.fn();
vi.mock("@/lib/utils/blob-delete", () => ({
  deleteBlobs: (...args: unknown[]) => deleteBlobsMock(...args),
}));

const { anonymiseMeepleRecord } = await import("@/lib/members/anonymisation");

const NOW = new Date("2026-08-03T00:00:00Z");

const RESIGNED_AND_GONE = {
  id: "meeple-1",
  displayName: "Lea Beispiel",
  neonAuthUserId: "11111111-1111-1111-1111-111111111111",
  resignedAt: new Date("2024-07-01T00:00:00Z"),
  membershipEndsAt: new Date("2025-01-01T00:00:00Z"),
  anonymizedAt: null,
};

function givenAnonymisableMeeple(
  listings: { id: string; imageUrls: string[] }[] = [],
) {
  prismaMock.meeple.findUnique.mockResolvedValue(RESIGNED_AND_GONE as never);
  prismaMock.gameHolding.count.mockResolvedValue(0);
  prismaMock.storageUnit.count.mockResolvedValue(0);
  prismaMock.marketListing.findMany.mockResolvedValue(listings as never);
}

beforeEach(() => {
  deleteBlobsMock.mockReset();
  deleteBlobsMock.mockResolvedValue(undefined);
  prismaMock.marketListing.findMany.mockResolvedValue([] as never);
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
});

describe("anonymiseMeepleRecord preconditions", () => {
  it("rejects an unknown meeple", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(null);

    expect(await anonymiseMeepleRecord("nope", NOW)).toEqual({
      error: "Mitglied nicht gefunden.",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an already anonymised meeple", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      ...RESIGNED_AND_GONE,
      anonymizedAt: new Date(),
    } as never);

    expect(await anonymiseMeepleRecord("meeple-1", NOW)).toEqual({
      error: "Dieses Mitglied ist bereits anonymisiert.",
    });
  });

  it("rejects a meeple that has not left yet", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      ...RESIGNED_AND_GONE,
      resignedAt: null,
      membershipEndsAt: null,
    } as never);

    expect(await anonymiseMeepleRecord("meeple-1", NOW)).toEqual({
      error: "Nur ausgetretene Mitglieder können anonymisiert werden.",
    });
  });

  it("rejects a meeple that still holds a club game", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(RESIGNED_AND_GONE as never);
    prismaMock.gameHolding.count.mockResolvedValue(2);
    prismaMock.storageUnit.count.mockResolvedValue(0);

    const result = await anonymiseMeepleRecord("meeple-1", NOW);

    expect("error" in result && result.error).toMatch(/Erst zurückholen/);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a meeple that still keeps a storage unit", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(RESIGNED_AND_GONE as never);
    prismaMock.gameHolding.count.mockResolvedValue(0);
    prismaMock.storageUnit.count.mockResolvedValue(1);

    const result = await anonymiseMeepleRecord("meeple-1", NOW);

    expect("error" in result && result.error).toMatch(/Erst zurückholen/);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("anonymiseMeepleRecord", () => {
  it("clears exactly the identifying fields and keeps the row", async () => {
    givenAnonymisableMeeple();

    expect(await anonymiseMeepleRecord("meeple-1", NOW)).toEqual({
      success: true,
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(3);
    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: {
        displayName: "(anonymisiert)",
        neonAuthUserId: null,
        email: null,
        accountHolder: null,
        ibanEncrypted: null,
        ibanLast4: null,
        bggUsername: null,
        bgaUsername: null,
        telegramHandle: null,
        signalHandle: null,
        discordHandle: null,
        anonymizedAt: NOW,
      },
    });
    expect(prismaMock.meeple.delete).not.toHaveBeenCalled();
  });

  it("deletes the member's uploaded images before touching the database", async () => {
    givenAnonymisableMeeple([
      { id: "l-1", imageUrls: ["https://blob/a.jpg", "https://blob/b.jpg"] },
      { id: "l-2", imageUrls: ["https://blob/c.jpg"] },
    ]);

    await anonymiseMeepleRecord("meeple-1", NOW);

    expect(deleteBlobsMock).toHaveBeenCalledWith([
      "https://blob/a.jpg",
      "https://blob/b.jpg",
      "https://blob/c.jpg",
    ]);
    expect(prismaMock.marketListing.updateMany).toHaveBeenCalledWith({
      where: { sellerMeepleId: "meeple-1" },
      data: { imageUrls: [] },
    });
  });

  it("leaves the member un-anonymised when blob deletion fails", async () => {
    givenAnonymisableMeeple([{ id: "l-1", imageUrls: ["https://blob/a.jpg"] }]);
    deleteBlobsMock.mockRejectedValue(new Error("blob boom"));

    await expect(anonymiseMeepleRecord("meeple-1", NOW)).rejects.toThrow(
      "blob boom",
    );
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("clears the free-text author name on the member's posts", async () => {
    givenAnonymisableMeeple();

    await anonymiseMeepleRecord("meeple-1", NOW);

    expect(prismaMock.post.updateMany).toHaveBeenCalledWith({
      where: { author: "Lea Beispiel" },
      data: { author: null },
    });
  });

  it("closes an open deletion request in the same transaction", async () => {
    givenAnonymisableMeeple();

    await anonymiseMeepleRecord("meeple-1", NOW);

    expect(prismaMock.deletionRequest.updateMany).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1", handledAt: null },
      data: { handledAt: NOW },
    });
  });

  it("rolls back the meeple update when the raw sql fails", async () => {
    givenAnonymisableMeeple();
    prismaMock.$executeRaw.mockRejectedValueOnce(new Error("db boom"));

    await expect(anonymiseMeepleRecord("meeple-1", NOW)).rejects.toThrow(
      "db boom",
    );
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
  });
});
