import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BggApiError, BggNotFoundError, fetchBggGame } from "./client";

function loadFixture(name: string): string {
  return fs.readFileSync(
    path.join(__dirname, "..", "__fixtures__", "bgg", name),
    "utf-8",
  );
}

function mockFetchOnce(ok: boolean, status: number, xml: string) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    text: async () => xml,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("fetchBggGame", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps a full response with all optional fields present", async () => {
    mockFetchOnce(true, 200, loadFixture("success-full.xml"));

    const result = await fetchBggGame(342942);

    expect(result).toEqual({
      title: "Ark Nova",
      minPlayers: 1,
      maxPlayers: 4,
      playTimeMinutes: 150,
      weight: 3.7,
      imageUrl: "https://cf.geekdo-images.com/full.jpg",
      description: 'Build a modern "zoo".\nManage conservation projects.',
      mechanics: ["Card Play", "Income"],
      explainerVideoUrl: null,
    });
  });

  it("maps a response with missing optional fields to null/empty defaults", async () => {
    mockFetchOnce(true, 200, loadFixture("success-minimal.xml"));

    const result = await fetchBggGame(1);

    expect(result).toEqual({
      title: "Die Siedler von Catan",
      minPlayers: 3,
      maxPlayers: 4,
      playTimeMinutes: null,
      weight: null,
      imageUrl: null,
      description: null,
      mechanics: [],
      explainerVideoUrl: null,
    });
  });

  it("picks the first instructional video with a youtube host, skipping non-matching entries", async () => {
    mockFetchOnce(
      true,
      200,
      loadFixture("success-with-instructional-video.xml"),
    );

    const result = await fetchBggGame(342942);

    expect(result.explainerVideoUrl).toBe(
      "https://www.youtube.com/watch?v=correct123",
    );
  });

  it("returns null when the videos block has no instructional entry", async () => {
    mockFetchOnce(
      true,
      200,
      loadFixture("success-videos-no-instructional.xml"),
    );

    const result = await fetchBggGame(342942);

    expect(result.explainerVideoUrl).toBeNull();
  });

  it("requests the videos block from the bgg api", async () => {
    const fetchMock = mockFetchOnce(
      true,
      200,
      loadFixture("success-minimal.xml"),
    );

    await fetchBggGame(1);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("videos=1"),
    );
  });

  it("throws BggNotFoundError for an unknown BGG id", async () => {
    mockFetchOnce(true, 200, loadFixture("not-found.xml"));

    await expect(fetchBggGame(999999999)).rejects.toThrow(BggNotFoundError);
  });

  it("throws BggApiError for a non-2xx HTTP response", async () => {
    mockFetchOnce(false, 503, "");

    await expect(fetchBggGame(1)).rejects.toThrow(BggApiError);
  });
});
