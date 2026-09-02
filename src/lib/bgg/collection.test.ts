import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BggCollectionUnavailableError,
  fetchBggCollection,
} from "./collection";

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

describe("fetchBggCollection (#255)", () => {
  beforeEach(() => {
    vi.stubEnv("BGG_BEARER_TOKEN", "test-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns an empty list for a blank username without a request", async () => {
    const fetchMock = mockFetchOnce(
      true,
      200,
      loadFixture("collection-empty.xml"),
    );

    const result = await fetchBggCollection("   ");

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps owned items to bggId, title, rating and status flags", async () => {
    mockFetchOnce(true, 200, loadFixture("collection-success.xml"));

    const result = await fetchBggCollection("some-user");

    expect(result).toEqual([
      {
        bggId: 342942,
        title: "Ark Nova",
        rating: 8.5,
        forTrade: true,
        wantToPlay: false,
        imageUrl: "https://cf.geekdo-images.com/ark-nova.jpg",
      },
      {
        bggId: 13,
        title: "Catan",
        rating: null,
        forTrade: false,
        wantToPlay: true,
        imageUrl: null,
      },
    ]);
  });

  it("falls back to the thumbnail when no full image is present", async () => {
    mockFetchOnce(
      true,
      200,
      `<?xml version="1.0" encoding="utf-8"?>
      <items totalitems="1">
        <item objecttype="thing" objectid="1" subtype="boardgame" collid="1">
          <name sortindex="1">Nur Thumbnail</name>
          <status own="1" fortrade="0" wanttoplay="0" />
          <thumbnail>https://cf.geekdo-images.com/thumb-only.jpg</thumbnail>
        </item>
      </items>`,
    );

    const result = await fetchBggCollection("some-user");

    expect(result[0].imageUrl).toBe(
      "https://cf.geekdo-images.com/thumb-only.jpg",
    );
  });

  it("requests only owned, non-expansion items with stats", async () => {
    const fetchMock = mockFetchOnce(
      true,
      200,
      loadFixture("collection-success.xml"),
    );

    await fetchBggCollection("some-user");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("own=1");
    expect(url).toContain("stats=1");
    expect(url).toContain("excludesubtype=boardgameexpansion");
  });

  it("filters out items BGG returns despite own=1 not actually being owned", async () => {
    mockFetchOnce(true, 200, loadFixture("collection-not-owned.xml"));

    const result = await fetchBggCollection("some-user");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Ark Nova");
  });

  it("returns an empty list for a collection with no owned games", async () => {
    mockFetchOnce(true, 200, loadFixture("collection-empty.xml"));

    const result = await fetchBggCollection("some-user");

    expect(result).toEqual([]);
  });

  it("throws BggCollectionUnavailableError for an invalid username", async () => {
    mockFetchOnce(true, 200, loadFixture("collection-invalid-username.xml"));

    await expect(fetchBggCollection("does-not-exist")).rejects.toThrow(
      BggCollectionUnavailableError,
    );
  });
});
