import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveCoverImageUrl } from "@/lib/instagram/cover-image";

const putMock = vi.fn();

vi.mock("@vercel/blob", () => ({
  put: (...args: unknown[]) => putMock(...args),
}));

vi.mock("@vercel/og", () => ({
  ImageResponse: class {
    async arrayBuffer() {
      return new ArrayBuffer(0);
    }
  },
}));

describe("resolveCoverImageUrl", () => {
  afterEach(() => {
    putMock.mockReset();
  });

  it("returns the existing cover image without uploading", async () => {
    const url = await resolveCoverImageUrl({
      slug: "spieleabend-juli",
      title: "Spieleabend im Juli",
      excerpt: "Wir treffen uns wieder im Vereinsheim.",
      coverImageUrl: "https://blob.vercel-storage.com/existing-cover.png",
    });

    expect(url).toBe("https://blob.vercel-storage.com/existing-cover.png");
    expect(putMock).not.toHaveBeenCalled();
  });

  it("generates and uploads a fallback image when none is set", async () => {
    putMock.mockResolvedValue({
      url: "https://blob.vercel-storage.com/generated-cover.png",
    });

    const url = await resolveCoverImageUrl({
      slug: "spieleabend-juli",
      title: "Spieleabend im Juli",
      excerpt: "Wir treffen uns wieder im Vereinsheim.",
      coverImageUrl: null,
    });

    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock).toHaveBeenCalledWith(
      "instagram-covers/spieleabend-juli.png",
      expect.anything(),
      expect.objectContaining({ access: "public", contentType: "image/png" }),
    );
    expect(url).toBe("https://blob.vercel-storage.com/generated-cover.png");
  });
});
