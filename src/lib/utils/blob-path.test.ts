import { describe, expect, it } from "vitest";
import { normaliseBlobPath } from "@/lib/utils/blob-path";

describe("normaliseBlobPath", () => {
  it("keeps a well-formed pathname under the expected prefix", () => {
    expect(normaliseBlobPath("markt/foo.png", "markt")).toBe("markt/foo.png");
  });

  it("discards a client-chosen prefix and enforces the expected one", () => {
    expect(normaliseBlobPath("posts/evil.png", "markt")).toBe("markt/evil.png");
  });

  it("resolves traversal segments to the basename", () => {
    expect(normaliseBlobPath("markt/../../evil.png", "markt")).toBe(
      "markt/evil.png",
    );
  });

  it("handles a bare filename with no prefix", () => {
    expect(normaliseBlobPath("evil.png", "markt")).toBe("markt/evil.png");
  });
});
