import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveCoverImageUrl } from "@/lib/instagram/cover-image";

const putMock = vi.fn();

vi.mock("@/lib/utils/s3", () => ({
  putBlob: (...args: unknown[]) => putMock(...args),
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
      coverImageUrl: "https://files.example/existing-cover.png",
    });

    expect(url).toBe("https://files.example/existing-cover.png");
    expect(putMock).not.toHaveBeenCalled();
  });

  it("generates and uploads a fallback image when none is set", async () => {
    putMock.mockResolvedValue("https://files.example/generated-cover.png");

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
      "image/png",
    );
    expect(url).toBe("https://files.example/generated-cover.png");
  });
});
