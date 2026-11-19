import { describe, expect, it } from "vitest";
import {
  BGG_IMAGE_ORIGIN,
  isOptimizableImageUrl,
  optimizedImageOrigins,
} from "./image-hosts";

describe("optimizedImageOrigins", () => {
  it("always contains the BGG origin", () => {
    expect(optimizedImageOrigins(undefined)).toEqual([BGG_IMAGE_ORIGIN]);
  });

  it("adds a public S3 endpoint by its origin", () => {
    expect(optimizedImageOrigins("https://files.example.org/meeples")).toEqual([
      BGG_IMAGE_ORIGIN,
      "https://files.example.org",
    ]);
  });

  it("leaves out local and private S3 hosts", () => {
    for (const endpoint of [
      "http://localhost:8333",
      "http://127.0.0.1:8333",
      "http://192.168.178.10:8333",
      "http://10.0.0.5",
      "http://172.20.0.3:8333",
    ]) {
      expect(optimizedImageOrigins(endpoint)).toEqual([BGG_IMAGE_ORIGIN]);
    }
  });

  it("ignores an invalid endpoint", () => {
    expect(optimizedImageOrigins("not a url")).toEqual([BGG_IMAGE_ORIGIN]);
  });
});

describe("isOptimizableImageUrl", () => {
  const origins = [BGG_IMAGE_ORIGIN, "https://files.example.org"];

  it("accepts URLs from an allowed origin", () => {
    expect(
      isOptimizableImageUrl(
        "https://cf.geekdo-images.com/abc__original/img/x.jpg",
        origins,
      ),
    ).toBe(true);
    expect(
      isOptimizableImageUrl(
        "https://files.example.org/meeples/a.webp",
        origins,
      ),
    ).toBe(true);
  });

  it("rejects other hosts, relative and invalid URLs", () => {
    expect(isOptimizableImageUrl("https://evil.example/x.jpg", origins)).toBe(
      false,
    );
    expect(isOptimizableImageUrl("/local.png", origins)).toBe(false);
    expect(
      isOptimizableImageUrl("http://cf.geekdo-images.com/x.jpg", origins),
    ).toBe(false);
  });
});
