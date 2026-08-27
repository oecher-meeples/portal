import { describe, expect, it } from "vitest";
import {
  buildYoutubeRulesSearchUrl,
  getYoutubeEmbedUrl,
} from "@/lib/utils/youtube";

describe("buildYoutubeRulesSearchUrl", () => {
  it("builds a German rules search query", () => {
    expect(buildYoutubeRulesSearchUrl("Ark Nova", "de")).toBe(
      "https://www.youtube.com/results?search_query=Ark%20Nova%20Brettspiel%20Regeln",
    );
  });

  it("builds an English rules search query", () => {
    expect(buildYoutubeRulesSearchUrl("Ark Nova", "en")).toBe(
      "https://www.youtube.com/results?search_query=Ark%20Nova%20boardgame%20rules",
    );
  });

  it("url-encodes special characters in the title", () => {
    expect(buildYoutubeRulesSearchUrl("7 Wonders: Duel", "de")).toBe(
      "https://www.youtube.com/results?search_query=7%20Wonders%3A%20Duel%20Brettspiel%20Regeln",
    );
  });
});

describe("getYoutubeEmbedUrl", () => {
  it("converts a youtube.com/watch URL", () => {
    expect(
      getYoutubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("converts a watch URL without the www subdomain", () => {
    expect(getYoutubeEmbedUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("converts a youtu.be short link", () => {
    expect(getYoutubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("passes an already-embeddable /embed/ URL through unchanged", () => {
    const embedUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ";
    expect(getYoutubeEmbedUrl(embedUrl)).toBe(embedUrl);
  });

  it("ignores extra watch query params (e.g. a timestamp), using only the video id", () => {
    expect(
      getYoutubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s"),
    ).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("returns null for a non-YouTube URL", () => {
    expect(getYoutubeEmbedUrl("https://vimeo.com/12345")).toBeNull();
  });

  it("returns null for a completely invalid URL", () => {
    expect(getYoutubeEmbedUrl("not a url")).toBeNull();
  });

  it("returns null for a youtube.com URL that isn't a watch or embed link", () => {
    expect(
      getYoutubeEmbedUrl("https://www.youtube.com/channel/abc"),
    ).toBeNull();
  });

  it("returns null for a youtu.be link with no video id", () => {
    expect(getYoutubeEmbedUrl("https://youtu.be/")).toBeNull();
  });

  it("returns null for a watch URL with no v parameter", () => {
    expect(getYoutubeEmbedUrl("https://www.youtube.com/watch")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getYoutubeEmbedUrl("")).toBeNull();
  });
});
