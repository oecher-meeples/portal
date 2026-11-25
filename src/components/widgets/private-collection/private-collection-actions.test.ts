import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/members/meeples", () => ({
  requireMeeple: async () => ({ id: "meeple-1" }),
}));
vi.mock("@/lib/ludothek/private-event-loans", () => ({
  offerPrivateGameForEvent: vi.fn(),
  withdrawPrivateGameOffer: vi.fn(),
}));

const {
  removePrivateCollectionEntryAction,
  setPrivateCollectionEntryFlagAction,
} = await import("./private-collection-actions");

beforeEach(() => vi.clearAllMocks());

describe("removePrivateCollectionEntryAction", () => {
  it("only deletes entries of the current meeple", async () => {
    const result = await removePrivateCollectionEntryAction("entry-1");

    expect(result).toEqual({ success: true });
    expect(
      prismaMock.privateGameCollectionEntry.deleteMany,
    ).toHaveBeenCalledWith({ where: { id: "entry-1", meepleId: "meeple-1" } });
  });
});

describe("setPrivateCollectionEntryFlagAction", () => {
  it("sets forTrade on an own entry", async () => {
    await setPrivateCollectionEntryFlagAction("entry-1", "forTrade", true);

    expect(
      prismaMock.privateGameCollectionEntry.updateMany,
    ).toHaveBeenCalledWith({
      where: { id: "entry-1", meepleId: "meeple-1" },
      data: { forTrade: true },
    });
  });

  it("clears wantToPlay on an own entry", async () => {
    await setPrivateCollectionEntryFlagAction("entry-1", "wantToPlay", false);

    expect(
      prismaMock.privateGameCollectionEntry.updateMany,
    ).toHaveBeenCalledWith({
      where: { id: "entry-1", meepleId: "meeple-1" },
      data: { wantToPlay: false },
    });
  });

  it("rejects an unknown flag name", async () => {
    const result = await setPrivateCollectionEntryFlagAction(
      "entry-1",
      "rating" as never,
      true,
    );

    expect(result).toEqual({ error: "Ungültige Markierung." });
    expect(
      prismaMock.privateGameCollectionEntry.updateMany,
    ).not.toHaveBeenCalled();
  });
});
