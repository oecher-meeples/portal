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

const generateClientTokenMock = vi.fn();
vi.mock("@vercel/blob/client", () => ({
  generateClientTokenFromReadWriteToken: (...args: unknown[]) =>
    generateClientTokenMock(...args),
}));

const deleteBlobsMock = vi.fn();
vi.mock("@/lib/utils/blob-delete", () => ({
  deleteBlobs: (...args: unknown[]) => deleteBlobsMock(...args),
}));

const hasPermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  hasPermission: (...args: unknown[]) => hasPermissionMock(...args),
}));

const {
  createMarketListing,
  updateOwnMarketListing,
  deleteOwnMarketListing,
  deleteMarketListingImage,
  getMarketListingUploadToken,
} = await import("./actions");

class RedirectError extends Error {}

const OWNER = { id: "meeple-owner", neonAuthUserId: "user-owner" };
const OTHER = { id: "meeple-other", neonAuthUserId: "user-other" };

const VALID_INPUT = {
  title: "Catan – Seefahrer",
  description: "Vollständig, Karten in Sleeves.",
  priceEuros: 12,
  condition: "Sehr gut",
};

function marketListing(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "listing-1",
    sellerMeepleId: OWNER.id,
    title: "Catan – Seefahrer",
    description: null,
    priceEuros: 12,
    condition: "Sehr gut",
    imageUrls: [],
    ...overrides,
  };
}

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(OWNER);
  deleteBlobsMock.mockReset();
  deleteBlobsMock.mockResolvedValue(undefined);
  hasPermissionMock.mockReset();
  hasPermissionMock.mockResolvedValue(false);
  prismaMock.marketListing.create.mockResolvedValue(marketListing() as never);
});

describe("without a session", () => {
  it("writes nothing", async () => {
    requireMeepleMock.mockRejectedValue(new RedirectError("/login"));

    await expect(createMarketListing(VALID_INPUT)).rejects.toThrow(
      RedirectError,
    );
    await expect(
      updateOwnMarketListing("listing-1", VALID_INPUT),
    ).rejects.toThrow(RedirectError);
    await expect(deleteOwnMarketListing("listing-1")).rejects.toThrow(
      RedirectError,
    );
    await expect(
      getMarketListingUploadToken("market-listings/foo.png"),
    ).rejects.toThrow(RedirectError);

    expect(prismaMock.marketListing.create).not.toHaveBeenCalled();
    expect(prismaMock.marketListing.update).not.toHaveBeenCalled();
    expect(prismaMock.marketListing.delete).not.toHaveBeenCalled();
  });
});

describe("createMarketListing", () => {
  it("creates a listing owned by the current meeple", async () => {
    const result = await createMarketListing(VALID_INPUT);

    expect(result).toEqual({ success: true, id: "listing-1" });
    expect(prismaMock.marketListing.create).toHaveBeenCalledWith({
      data: {
        sellerMeepleId: OWNER.id,
        title: "Catan – Seefahrer",
        description: "Vollständig, Karten in Sleeves.",
        priceEuros: 12,
        condition: "Sehr gut",
        imageUrls: [],
      },
    });
  });

  it("stores 0..n image urls as an array", async () => {
    await createMarketListing({
      ...VALID_INPUT,
      imageUrls: ["https://blob.example/a.png", "https://blob.example/b.png"],
    });

    expect(prismaMock.marketListing.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        imageUrls: ["https://blob.example/a.png", "https://blob.example/b.png"],
      }),
    });
  });

  it("rejects a missing title", async () => {
    const result = await createMarketListing({ ...VALID_INPUT, title: "  " });

    expect(result).toEqual({ error: "Bitte einen Titel angeben." });
    expect(prismaMock.marketListing.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid price", async () => {
    const result = await createMarketListing({
      ...VALID_INPUT,
      priceEuros: -5,
    });

    expect(result).toEqual({ error: "Bitte einen gültigen Preis angeben." });
    expect(prismaMock.marketListing.create).not.toHaveBeenCalled();
  });
});

describe("updateOwnMarketListing", () => {
  it("updates the caller's own listing", async () => {
    prismaMock.marketListing.findUnique.mockResolvedValue(
      marketListing() as never,
    );
    prismaMock.marketListing.update.mockResolvedValue({} as never);

    const result = await updateOwnMarketListing("listing-1", {
      ...VALID_INPUT,
      priceEuros: 15,
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.marketListing.update).toHaveBeenCalledWith({
      where: { id: "listing-1" },
      data: expect.objectContaining({ priceEuros: 15 }),
    });
  });

  it("rejects editing someone else's listing", async () => {
    requireMeepleMock.mockResolvedValue(OTHER);
    prismaMock.marketListing.findUnique.mockResolvedValue(
      marketListing() as never,
    );

    const result = await updateOwnMarketListing("listing-1", VALID_INPUT);

    expect(result).toEqual({
      error: "Nur die eigene Anzeige oder ein Admin kann sie bearbeiten.",
    });
    expect(prismaMock.marketListing.update).not.toHaveBeenCalled();
  });

  it("allows an admin to edit someone else's listing (#175)", async () => {
    requireMeepleMock.mockResolvedValue(OTHER);
    hasPermissionMock.mockResolvedValue(true);
    prismaMock.marketListing.findUnique.mockResolvedValue(
      marketListing() as never,
    );
    prismaMock.marketListing.update.mockResolvedValue({} as never);

    const result = await updateOwnMarketListing("listing-1", VALID_INPUT);

    expect(result).toEqual({ success: true });
    expect(hasPermissionMock).toHaveBeenCalledWith(
      OTHER.neonAuthUserId,
      "admin:access",
    );
    expect(prismaMock.marketListing.update).toHaveBeenCalled();
  });

  it("rejects an unknown listing", async () => {
    prismaMock.marketListing.findUnique.mockResolvedValue(null);

    const result = await updateOwnMarketListing("missing", VALID_INPUT);

    expect(result).toEqual({ error: "Anzeige nicht gefunden." });
  });
});

describe("deleteOwnMarketListing", () => {
  it("deletes the caller's own listing", async () => {
    prismaMock.marketListing.findUnique.mockResolvedValue(
      marketListing() as never,
    );

    const result = await deleteOwnMarketListing("listing-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.marketListing.delete).toHaveBeenCalledWith({
      where: { id: "listing-1" },
    });
  });

  it("deletes the listing's uploaded images, not just the row referencing them", async () => {
    prismaMock.marketListing.findUnique.mockResolvedValue(
      marketListing({
        imageUrls: ["https://blob/a.jpg", "https://blob/b.jpg"],
      }) as never,
    );

    await deleteOwnMarketListing("listing-1");

    expect(deleteBlobsMock).toHaveBeenCalledWith([
      "https://blob/a.jpg",
      "https://blob/b.jpg",
    ]);
  });

  it("keeps the row when blob deletion fails, so the images do not silently leak", async () => {
    prismaMock.marketListing.findUnique.mockResolvedValue(
      marketListing({ imageUrls: ["https://blob/a.jpg"] }) as never,
    );
    deleteBlobsMock.mockRejectedValue(new Error("blob boom"));

    await expect(deleteOwnMarketListing("listing-1")).rejects.toThrow(
      "blob boom",
    );
    expect(prismaMock.marketListing.delete).not.toHaveBeenCalled();
  });

  it("rejects deleting someone else's listing", async () => {
    requireMeepleMock.mockResolvedValue(OTHER);
    prismaMock.marketListing.findUnique.mockResolvedValue(
      marketListing() as never,
    );

    const result = await deleteOwnMarketListing("listing-1");

    expect(result).toEqual({
      error: "Nur die eigene Anzeige kann gelöscht werden.",
    });
    expect(prismaMock.marketListing.delete).not.toHaveBeenCalled();
  });
});

describe("deleteMarketListingImage", () => {
  it("deletes a single image blob for the logged-in meeple (#175)", async () => {
    const result = await deleteMarketListingImage("https://blob/a.jpg");

    expect(result).toEqual({ success: true });
    expect(deleteBlobsMock).toHaveBeenCalledWith(["https://blob/a.jpg"]);
  });
});

describe("getMarketListingUploadToken", () => {
  it("issues a token scoped to image content types", async () => {
    generateClientTokenMock.mockResolvedValue("token-123");

    const token = await getMarketListingUploadToken("market-listings/a.png");

    expect(token).toBe("token-123");
    expect(generateClientTokenMock).toHaveBeenCalledWith({
      pathname: "market-listings/a.png",
      allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
      addRandomSuffix: true,
      maximumSizeInBytes: 8 * 1024 * 1024,
    });
  });

  it("normalises a client-chosen prefix to the market-listings namespace", async () => {
    generateClientTokenMock.mockResolvedValue("token-123");

    await getMarketListingUploadToken("posts/../../evil.png");

    expect(generateClientTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "market-listings/evil.png" }),
    );
  });
});
