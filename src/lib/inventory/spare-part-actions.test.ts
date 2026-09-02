import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return { ...actual, requireMeeple: requireMeepleMock };
});

const hasPermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  hasPermission: (...args: unknown[]) => hasPermissionMock(...args),
}));

const {
  createSparePartListing,
  updateSparePartListing,
  deleteSparePartListing,
} = await import("./spare-part-actions");

class RedirectError extends Error {}

const KEEPER = { id: "meeple-keeper", neonAuthUserId: "user-keeper" };
const OTHER = { id: "meeple-other", neonAuthUserId: "user-other" };

const VALID_INPUT = {
  title: "Allgemeines",
  condition: "gemischt",
};

function sparePartListing(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "listing-1",
    title: "Allgemeines",
    boardGameId: null,
    condition: "gemischt",
    description: null,
    keeperMeepleId: KEEPER.id,
    ...overrides,
  };
}

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(KEEPER);
  hasPermissionMock.mockReset();
  hasPermissionMock.mockResolvedValue(false);
});

describe("without a session", () => {
  it("changes nothing in the database", async () => {
    requireMeepleMock.mockRejectedValue(new RedirectError("/login"));

    await expect(createSparePartListing(VALID_INPUT)).rejects.toThrow(
      RedirectError,
    );
    await expect(
      updateSparePartListing("listing-1", VALID_INPUT),
    ).rejects.toThrow(RedirectError);
    await expect(deleteSparePartListing("listing-1")).rejects.toThrow(
      RedirectError,
    );

    expect(prismaMock.sparePartListing.create).not.toHaveBeenCalled();
    expect(prismaMock.sparePartListing.update).not.toHaveBeenCalled();
    expect(prismaMock.sparePartListing.delete).not.toHaveBeenCalled();
  });
});

describe("createSparePartListing", () => {
  it("creates a listing kept by the current meeple, ignoring any client-passed keeper", async () => {
    prismaMock.sparePartListing.create.mockResolvedValue({
      id: "listing-1",
    } as never);

    const result = await createSparePartListing({
      title: "  Allgemeines  ",
      condition: " gemischt ",
      description: "  ",
    });

    expect(result).toEqual({ success: true, id: "listing-1" });
    expect(prismaMock.sparePartListing.create).toHaveBeenCalledWith({
      data: {
        title: "Allgemeines",
        boardGameId: null,
        condition: "gemischt",
        description: null,
        keeperMeepleId: KEEPER.id,
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

describe("updateSparePartListing", () => {
  it("lets the keeper edit their own listing", async () => {
    prismaMock.sparePartListing.findUnique.mockResolvedValue(
      sparePartListing() as never,
    );
    prismaMock.sparePartListing.update.mockResolvedValue({} as never);

    const result = await updateSparePartListing("listing-1", {
      title: "Neuer Titel",
      condition: "gemischt",
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.sparePartListing.update).toHaveBeenCalledWith({
      where: { id: "listing-1" },
      data: expect.objectContaining({ title: "Neuer Titel" }),
    });
  });

  it("rejects editing someone else's listing without games:manage", async () => {
    requireMeepleMock.mockResolvedValue(OTHER);
    prismaMock.sparePartListing.findUnique.mockResolvedValue(
      sparePartListing() as never,
    );

    const result = await updateSparePartListing("listing-1", VALID_INPUT);

    expect(result).toEqual({
      error: "Nur der/die Verwahrer:in oder ein Admin kann bearbeiten.",
    });
    expect(prismaMock.sparePartListing.update).not.toHaveBeenCalled();
  });

  it("allows a meeple with games:manage to edit someone else's listing", async () => {
    requireMeepleMock.mockResolvedValue(OTHER);
    hasPermissionMock.mockResolvedValue(true);
    prismaMock.sparePartListing.findUnique.mockResolvedValue(
      sparePartListing() as never,
    );
    prismaMock.sparePartListing.update.mockResolvedValue({} as never);

    const result = await updateSparePartListing("listing-1", VALID_INPUT);

    expect(result).toEqual({ success: true });
    expect(hasPermissionMock).toHaveBeenCalledWith(
      OTHER.neonAuthUserId,
      "games:manage",
    );
  });

  it("rejects an unknown listing", async () => {
    prismaMock.sparePartListing.findUnique.mockResolvedValue(null);

    const result = await updateSparePartListing("missing", VALID_INPUT);

    expect(result).toEqual({ error: "Eintrag nicht gefunden." });
  });
});

describe("deleteSparePartListing", () => {
  it("lets the keeper delete their own listing", async () => {
    prismaMock.sparePartListing.findUnique.mockResolvedValue(
      sparePartListing() as never,
    );

    const result = await deleteSparePartListing("listing-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.sparePartListing.delete).toHaveBeenCalledWith({
      where: { id: "listing-1" },
    });
  });

  it("rejects deleting someone else's listing without games:manage", async () => {
    requireMeepleMock.mockResolvedValue(OTHER);
    prismaMock.sparePartListing.findUnique.mockResolvedValue(
      sparePartListing() as never,
    );

    const result = await deleteSparePartListing("listing-1");

    expect(result).toEqual({
      error: "Nur der/die Verwahrer:in oder ein Admin kann löschen.",
    });
    expect(prismaMock.sparePartListing.delete).not.toHaveBeenCalled();
  });
});
