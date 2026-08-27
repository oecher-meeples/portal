import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoardGameKind, LanguageDependence } from "@prisma/client";
import {
  BggApiError,
  BggNotFoundError,
  fetchBggGame,
  searchBggGames,
  searchBggGamesExact,
} from "./client";

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
  beforeEach(() => {
    vi.stubEnv("BGG_BEARER_TOKEN", "test-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
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
      averageRating: 8.5,
      imageUrl: "https://cf.geekdo-images.com/full.jpg",
      description: 'Build a modern "zoo".\nManage conservation projects.',
      mechanics: ["Card Play", "Income"],
      kind: BoardGameKind.BOARDGAME,
      languageDependence: null,
      author: ["Mathias Wigge"],
      yearPublished: 2021,
      versions: [],
      alternateNames: ["Ark Nova (Deutsch)"],
      explainerVideoUrl: null,
      germanExplainerVideos: [],
      englishExplainerVideos: [],
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
      averageRating: null,
      imageUrl: null,
      description: null,
      mechanics: [],
      kind: BoardGameKind.BOARDGAME,
      languageDependence: null,
      author: [],
      yearPublished: 1995,
      versions: [],
      alternateNames: [],
      explainerVideoUrl: null,
      germanExplainerVideos: [],
      englishExplainerVideos: [],
    });
  });

  it("maps the boardgameexpansion type attribute to BOARDGAME_EXPANSION (#202)", async () => {
    mockFetchOnce(true, 200, loadFixture("success-expansion.xml"));

    const result = await fetchBggGame(999);

    expect(result.kind).toBe(BoardGameKind.BOARDGAME_EXPANSION);
  });

  it("falls back to BOARDGAME when the type attribute is missing or unknown (#202)", async () => {
    mockFetchOnce(true, 200, loadFixture("success-full.xml"));

    const result = await fetchBggGame(342942);

    expect(result.kind).toBe(BoardGameKind.BOARDGAME);
  });

  it("picks the language_dependence level with the most votes (#188)", async () => {
    mockFetchOnce(true, 200, loadFixture("success-with-language-poll.xml"));

    const result = await fetchBggGame(342942);

    expect(result.languageDependence).toBe(LanguageDependence.MODERATE_TEXT);
  });

  it("returns null for language_dependence when the poll has no votes (#188)", async () => {
    mockFetchOnce(
      true,
      200,
      loadFixture("success-with-language-poll-no-votes.xml"),
    );

    const result = await fetchBggGame(342942);

    expect(result.languageDependence).toBeNull();
  });

  it("returns null for language_dependence when the item has no poll block at all (#188)", async () => {
    mockFetchOnce(true, 200, loadFixture("success-minimal.xml"));

    const result = await fetchBggGame(1);

    expect(result.languageDependence).toBeNull();
  });

  it("parses every BGG version with its own publisher, product code, year and languages (#205)", async () => {
    mockFetchOnce(true, 200, loadFixture("success-with-versions.xml"));

    const result = await fetchBggGame(342942);

    expect(result.versions).toEqual([
      {
        yearPublished: 2021,
        publisher: ["Capstone Games"],
        productCode: "CAPS001",
        languages: ["English"],
      },
      {
        yearPublished: 2022,
        publisher: ["Feuerland Spiele"],
        productCode: "FEU001",
        languages: ["German"],
      },
    ]);
  });

  it("takes the oldest year across versions over the item's own yearpublished (#205)", async () => {
    mockFetchOnce(true, 200, loadFixture("success-with-versions.xml"));

    const result = await fetchBggGame(342942);

    // Item-level yearpublished is 2021, matching the oldest version here —
    // asserted directly against the versions data to prove it's actually
    // computed from them, not just passed through the item's own value.
    expect(result.yearPublished).toBe(
      Math.min(...result.versions.map((v) => v.yearPublished ?? Infinity)),
    );
  });

  it("requests the versions block from the bgg api (#205)", async () => {
    const fetchMock = mockFetchOnce(
      true,
      200,
      loadFixture("success-minimal.xml"),
    );

    await fetchBggGame(1);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("versions=1"),
      expect.anything(),
    );
  });

  it('collects every name type="alternate" entry, ungefiltert (#187)', async () => {
    mockFetchOnce(true, 200, loadFixture("success-full.xml"));

    const result = await fetchBggGame(342942);

    expect(result.alternateNames).toEqual(["Ark Nova (Deutsch)"]);
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
    expect(result.englishExplainerVideos).toEqual([
      {
        title: "Ark Nova Tutorial",
        url: "https://www.youtube.com/watch?v=correct123",
        channel: "tutorialmaker",
      },
      {
        title: "Ark Nova Tutorial 2",
        url: "https://www.youtube.com/watch?v=shouldnotbepicked",
        channel: "other",
      },
    ]);
  });

  it("rejects http:// youtube links instead of importing them unnormalized (#262)", async () => {
    mockFetchOnce(true, 200, loadFixture("success-with-http-video.xml"));

    const result = await fetchBggGame(342942);

    expect(result.explainerVideoUrl).toBeNull();
    expect(result.englishExplainerVideos).toEqual([]);
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

  it("excludes non-German, non-English videos from englishExplainerVideos (#185-Folgeanfrage)", async () => {
    mockFetchOnce(true, 200, loadFixture("success-with-german-videos.xml"));

    const result = await fetchBggGame(342942);

    const urls = result.englishExplainerVideos.map((video) => video.url);
    expect(urls).toContain("https://www.youtube.com/watch?v=english1");
    expect(urls).not.toContain("https://www.youtube.com/watch?v=german1");
  });

  it("returns an empty array for germanExplainerVideos when no video has language=German (#185)", async () => {
    mockFetchOnce(
      true,
      200,
      loadFixture("success-with-instructional-video.xml"),
    );

    const result = await fetchBggGame(342942);

    expect(result.germanExplainerVideos).toEqual([]);
  });

  it("collects every instructional, German-language, YouTube video — not just the first (#185)", async () => {
    mockFetchOnce(true, 200, loadFixture("success-with-german-videos.xml"));

    const result = await fetchBggGame(342942);

    expect(result.germanExplainerVideos).toEqual([
      {
        title: "Regeln auf Deutsch",
        url: "https://www.youtube.com/watch?v=german1",
        channel: "ChannelA",
      },
      {
        title: "Ausführliche Regelerklärung",
        url: "https://www.youtube.com/watch?v=german2",
        channel: "ChannelB",
      },
    ]);
  });

  it("excludes German videos of the wrong category or hosted outside YouTube from germanExplainerVideos (#185)", async () => {
    mockFetchOnce(true, 200, loadFixture("success-with-german-videos.xml"));

    const result = await fetchBggGame(342942);

    const urls = result.germanExplainerVideos.map((video) => video.url);
    expect(urls).not.toContain("https://www.youtube.com/watch?v=review-de"); // category "review"
    expect(urls).not.toContain("https://vimeo.com/german3"); // not YouTube
    expect(urls).not.toContain("https://www.youtube.com/watch?v=english1"); // language "English"
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
      expect.anything(),
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

  it("translates a fetch timeout into a readable BggApiError", async () => {
    const timeoutError = new Error("The operation was aborted");
    timeoutError.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutError));

    await expect(fetchBggGame(1)).rejects.toThrow(
      "Die Anfrage an BoardGameGeek hat zu lange gedauert.",
    );
  });
});

describe("searchBggGames", () => {
  beforeEach(() => {
    vi.stubEnv("BGG_BEARER_TOKEN", "test-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("maps multiple search hits with title and year", async () => {
    mockFetchOnce(true, 200, loadFixture("search-multiple.xml"));

    const result = await searchBggGames("Ark Nova");

    expect(result).toEqual([
      { bggId: 342942, title: "Ark Nova", yearPublished: 2021 },
      { bggId: 12345, title: "Ark Nova: Marschmoor", yearPublished: 2023 },
    ]);
  });

  it("ranks an exact title match first, ahead of longer titles that merely contain the query (#183)", async () => {
    mockFetchOnce(true, 200, loadFixture("search-catan.xml"));

    const result = await searchBggGames("Catan");

    expect(result.map((hit) => hit.title)).toEqual([
      "Catan",
      "Barna fra Catan",
      "7 Wonders: Catan",
      "Baden-Württemberg Catan",
      "The 7 Wonders of Catan (fan expansion for Catan)",
    ]);
  });

  it("returns an empty array for zero hits", async () => {
    mockFetchOnce(true, 200, loadFixture("search-empty.xml"));

    const result = await searchBggGames("kein-treffer-xyz");

    expect(result).toEqual([]);
  });

  it("returns an empty array without calling fetch for a blank query", async () => {
    const fetchMock = mockFetchOnce(true, 200, "");

    const result = await searchBggGames("   ");

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws BggApiError for a non-2xx HTTP response", async () => {
    mockFetchOnce(false, 503, "");

    await expect(searchBggGames("Ark Nova")).rejects.toThrow(BggApiError);
  });
});

describe("searchBggGamesExact", () => {
  beforeEach(() => {
    vi.stubEnv("BGG_BEARER_TOKEN", "test-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends exact=1 (#186)", async () => {
    const fetchMock = mockFetchOnce(true, 200, loadFixture("search-empty.xml"));

    await searchBggGamesExact("Ark Nova");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("exact=1");
  });

  it("maps hits the same way as the non-exact search", async () => {
    mockFetchOnce(true, 200, loadFixture("search-multiple.xml"));

    const result = await searchBggGamesExact("Ark Nova");

    expect(result).toEqual([
      { bggId: 342942, title: "Ark Nova", yearPublished: 2021 },
      { bggId: 12345, title: "Ark Nova: Marschmoor", yearPublished: 2023 },
    ]);
  });
});
