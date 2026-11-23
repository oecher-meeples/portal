import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveCoverImageUrl } from "@/lib/instagram/cover-image";

const putMock = vi.fn();

vi.mock("@/lib/utils/s3", () => ({
  putBlob: (...args: unknown[]) => putMock(...args),
  publicUrlForKey: (key: string) => `https://files.example/meeples/${key}`,
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
    // putBlob liefert den Key (#112), das Cover bekommt die öffentliche URL.
    putMock.mockResolvedValue("instagram-covers/spieleabend-juli-abc.png");

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
    expect(url).toBe(
      "https://files.example/meeples/instagram-covers/spieleabend-juli-abc.png",
    );
  });
});
