import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const { createSparePartListing, deleteSparePartListing } = await import(
  "./spare-part-actions"
);

class ForbiddenError extends Error {}

const VALID_INPUT = {
  title: "Allgemeines",
  condition: "gemischt",
  keeperMeepleId: "meeple-1",
};

beforeEach(() => {
  requirePermissionMock.mockResolvedValue({ id: "admin-user" });
});

describe("without the games:manage permission", () => {
  it("changes nothing in the database", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(createSparePartListing(VALID_INPUT)).rejects.toThrow(
      ForbiddenError,
    );
    await expect(deleteSparePartListing("listing-1")).rejects.toThrow(
      ForbiddenError,
    );

    expect(prismaMock.sparePartListing.create).not.toHaveBeenCalled();
    expect(prismaMock.sparePartListing.delete).not.toHaveBeenCalled();
  });
});

describe("createSparePartListing", () => {
  it("creates a listing with normalised fields", async () => {
    prismaMock.sparePartListing.create.mockResolvedValue({
      id: "listing-1",
    } as never);

    const result = await createSparePartListing({
      title: "  Allgemeines  ",
      condition: " gemischt ",
      description: "  ",
      keeperMeepleId: "meeple-1",
    });

    expect(result).toEqual({ success: true, id: "listing-1" });
    expect(prismaMock.sparePartListing.create).toHaveBeenCalledWith({
      data: {
        title: "Allgemeines",
        boardGameId: null,
        condition: "gemischt",
        description: null,
        keeperMeepleId: "meeple-1",
      },
    });
  });

  it("rejects a missing title", async () => {
    const result = await createSparePartListing({
      ...VALID_INPUT,
      title: "  ",
    });

    expect(result).toEqual({ error: "Bitte einen Titel angeben." });
    expect(prismaMock.sparePartListing.create).not.toHaveBeenCalled();
  });

  it("rejects a missing condition", async () => {
    const result = await createSparePartListing({
      ...VALID_INPUT,
      condition: "  ",
    });

    expect(result).toEqual({ error: "Bitte einen Zustand angeben." });
    expect(prismaMock.sparePartListing.create).not.toHaveBeenCalled();
  });
});

describe("deleteSparePartListing", () => {
  it("removes exactly the given listing", async () => {
    const result = await deleteSparePartListing("listing-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.sparePartListing.delete).toHaveBeenCalledWith({
      where: { id: "listing-1" },
    });
  });
});
