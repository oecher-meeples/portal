import { beforeEach, describe, expect, it, vi } from "vitest";

const requireMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return { ...actual, requireMeeple: requireMeepleMock };
});
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const fetchBggCollectionMock = vi.fn();
vi.mock("@/lib/bgg/collection", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bgg/collection")>(
    "@/lib/bgg/collection",
  );
  return { ...actual, fetchBggCollection: fetchBggCollectionMock };
});

const putMock = vi.fn();
vi.mock("@vercel/blob", () => ({
  put: (...args: unknown[]) => putMock(...args),
}));

const createMarketListingMock = vi.fn();
vi.mock("@/components/feature/markt/actions", () => ({
  createMarketListing: (...args: unknown[]) => createMarketListingMock(...args),
}));

const { fetchOwnBggForTradeEntries, createMarketListingFromBgg } =
  await import("./bgg-import-actions");

const MEEPLE = { id: "meeple-1", bggUsername: "some-user" };

beforeEach(() => {
  requireMeepleMock.mockReset();
  requireMeepleMock.mockResolvedValue(MEEPLE);
  fetchBggCollectionMock.mockReset();
  putMock.mockReset();
  createMarketListingMock.mockReset();
  createMarketListingMock.mockResolvedValue({ success: true, id: "listing-1" });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/jpeg" }),
      arrayBuffer: async () => new ArrayBuffer(4),
    }),
  );
});

describe("fetchOwnBggForTradeEntries", () => {
  it("requires a saved bggUsername", async () => {
    requireMeepleMock.mockResolvedValue({ id: "meeple-1", bggUsername: null });

    const result = await fetchOwnBggForTradeEntries();

    expect(result).toEqual({
      error: "Bitte zuerst einen BGG-Benutzernamen im Profil hinterlegen.",
    });
    expect(fetchBggCollectionMock).not.toHaveBeenCalled();
  });

  it("returns only forTrade entries, mapped to bggId/title/imageUrl", async () => {
    fetchBggCollectionMock.mockResolvedValue([
      {
        bggId: 1,
        title: "Ark Nova",
        rating: null,
        forTrade: true,
        wantToPlay: false,
        imageUrl: "https://img/1.jpg",
      },
      {
        bggId: 2,
        title: "Catan",
        rating: null,
        forTrade: false,
        wantToPlay: false,
        imageUrl: null,
      },
    ]);

    const result = await fetchOwnBggForTradeEntries();

    expect(result).toEqual({
      success: true,
      entries: [{ bggId: 1, title: "Ark Nova", imageUrl: "https://img/1.jpg" }],
    });
  });
});

describe("createMarketListingFromBgg", () => {
  it("downloads the BGG image and creates the listing with it", async () => {
    putMock.mockResolvedValue({ url: "https://blob/bgg-1.jpg" });

    const result = await createMarketListingFromBgg({
      bggId: 1,
      title: "Ark Nova",
      imageUrl: "https://img/1.jpg",
      description: "Top Zustand",
      priceEuros: 30,
      condition: "Sehr gut",
    });

    expect(createMarketListingMock).toHaveBeenCalledWith({
      title: "Ark Nova",
      description: "Top Zustand",
      priceEuros: 30,
      condition: "Sehr gut",
      imageUrls: ["https://blob/bgg-1.jpg"],
    });
    expect(result).toEqual({ success: true, id: "listing-1" });
  });

  it("creates the listing without an image when there is none to import", async () => {
    await createMarketListingFromBgg({
      bggId: 1,
      title: "Ark Nova",
      imageUrl: null,
      priceEuros: 30,
      condition: "Sehr gut",
    });

    expect(createMarketListingMock).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrls: [] }),
    );
  });

  it("still creates the listing when the BGG image download fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await createMarketListingFromBgg({
      bggId: 1,
      title: "Ark Nova",
      imageUrl: "https://img/1.jpg",
      priceEuros: 30,
      condition: "Sehr gut",
    });

    expect(createMarketListingMock).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrls: [] }),
    );
  });
});
