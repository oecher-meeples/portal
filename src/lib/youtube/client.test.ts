import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YoutubeApiError, searchYoutubeVideos } from "./client";

function mockFetchOnce(ok: boolean, status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("searchYoutubeVideos", () => {
  beforeEach(() => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("maps search hits to title/url/channel", async () => {
    mockFetchOnce(true, 200, {
      items: [
        {
          id: { videoId: "abc123" },
          snippet: {
            title: "Ark Nova – Regeln erklärt",
            channelTitle: "Boardgame Channel",
          },
        },
      ],
    });

    const result = await searchYoutubeVideos("Ark Nova Regeln");

    expect(result).toEqual([
      {
        title: "Ark Nova – Regeln erklärt",
        url: "https://www.youtube.com/watch?v=abc123",
        channel: "Boardgame Channel",
        subscriberCount: 0,
      },
    ]);
  });

  it("decodes HTML entities in title and channel (#185-Folgeanfrage)", async () => {
    mockFetchOnce(true, 200, {
      items: [
        {
          id: { videoId: "abc123" },
          snippet: {
            title:
              "REVIVE - Regeln zum SPIEL 22 Hype Spiel verständlich &amp; kompakt erklärt",
            channelTitle: "Brettspielblog - Die besten Brettspiele &amp; Co.",
          },
        },
      ],
    });

    const result = await searchYoutubeVideos("Revive Regeln");

    expect(result[0].title).toBe(
      "REVIVE - Regeln zum SPIEL 22 Hype Spiel verständlich & kompakt erklärt",
    );
    expect(result[0].channel).toBe(
      "Brettspielblog - Die besten Brettspiele & Co.",
    );
  });

  it("sorts results by subscriber count descending (#185-Folgeanfrage)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: { videoId: "small" },
              snippet: {
                title: "Kleinkanal-Video",
                channelTitle: "Kleinkanal",
                channelId: "channel-small",
              },
            },
            {
              id: { videoId: "big" },
              snippet: {
                title: "Großkanal-Video",
                channelTitle: "Großkanal",
                channelId: "channel-big",
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            { id: "channel-small", statistics: { subscriberCount: "120" } },
            { id: "channel-big", statistics: { subscriberCount: "45000" } },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchYoutubeVideos("Ark Nova Regeln");

    expect(result.map((video) => video.title)).toEqual([
      "Großkanal-Video",
      "Kleinkanal-Video",
    ]);
    const [channelsUrl] = fetchMock.mock.calls[1];
    expect(channelsUrl).toContain("channels");
    expect(channelsUrl).toContain("channel-small");
    expect(channelsUrl).toContain("channel-big");
  });

  it("falls back to unsorted results when the subscriber-count lookup fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: { videoId: "abc123" },
              snippet: {
                title: "Ark Nova – Regeln erklärt",
                channelTitle: "Boardgame Channel",
                channelId: "channel-abc",
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchYoutubeVideos("Ark Nova Regeln");

    expect(result).toEqual([
      {
        title: "Ark Nova – Regeln erklärt",
        url: "https://www.youtube.com/watch?v=abc123",
        channel: "Boardgame Channel",
        subscriberCount: 0,
      },
    ]);
  });

  it("sends the query, German relevance hint and API key", async () => {
    const fetchMock = mockFetchOnce(true, 200, { items: [] });

    await searchYoutubeVideos("Ark Nova Regeln");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("q=Ark+Nova+Regeln");
    expect(url).toContain("type=video");
    expect(url).toContain("relevanceLanguage=de");
    expect(url).toContain("key=test-key");
  });

  it("skips items without a videoId", async () => {
    mockFetchOnce(true, 200, {
      items: [{ id: {}, snippet: { title: "No id" } }],
    });

    const result = await searchYoutubeVideos("Ark Nova Regeln");

    expect(result).toEqual([]);
  });

  it("returns an empty array without calling fetch for a blank query", async () => {
    const fetchMock = mockFetchOnce(true, 200, {});

    const result = await searchYoutubeVideos("   ");

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws YoutubeApiError for a non-2xx HTTP response (e.g. quotaExceeded)", async () => {
    mockFetchOnce(false, 403, {});

    await expect(searchYoutubeVideos("Ark Nova Regeln")).rejects.toThrow(
      YoutubeApiError,
    );
  });

  it("translates a fetch timeout into a readable YoutubeApiError", async () => {
    const timeoutError = new Error("The operation was aborted");
    timeoutError.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutError));

    await expect(searchYoutubeVideos("Ark Nova Regeln")).rejects.toThrow(
      "Die Anfrage an YouTube hat zu lange gedauert.",
    );
  });
});
