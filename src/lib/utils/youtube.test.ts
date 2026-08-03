import { describe, expect, it } from "vitest";
import { getYoutubeEmbedUrl } from "@/lib/utils/youtube";

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
