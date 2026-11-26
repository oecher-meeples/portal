import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveCoverImageUrl } from "@/lib/instagram/cover-image";

const putMock = vi.fn();
const getBlobMock = vi.fn();

vi.mock("@/lib/utils/s3", () => ({
  putBlob: (...args: unknown[]) => putMock(...args),
  getBlob: (...args: unknown[]) => getBlobMock(...args),
  publicUrlForKey: (key: string) => `https://files.example/meeples/${key}`,
}));

vi.mock("@/lib/utils/blob-access", () => ({
  blobKeyFrom: (value: string) =>
    value.startsWith("https://files.example/meeples/")
      ? value.replace("https://files.example/meeples/", "")
      : null,
}));

vi.mock("@/lib/utils/to-jpeg", () => ({
  toJpeg: async () => Buffer.from("jpeg"),
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
    getBlobMock.mockReset();
  });

  const POST = {
    slug: "spieleabend-juli",
    title: "Spieleabend im Juli",
    excerpt: "Wir treffen uns wieder im Vereinsheim.",
  };

  it("converts an existing webp cover to a jpeg upload", async () => {
    getBlobMock.mockResolvedValue({
      bytes: new Uint8Array([1]),
      contentType: "image/webp",
    });
    putMock.mockResolvedValue("instagram-covers/spieleabend-juli-xyz.jpg");

    const url = await resolveCoverImageUrl({
      ...POST,
      coverImageUrl: "https://files.example/meeples/instagram-covers/c.webp",
    });

    expect(getBlobMock).toHaveBeenCalledWith("instagram-covers/c.webp");
    expect(putMock).toHaveBeenCalledWith(
      "instagram-covers/spieleabend-juli.jpg",
      expect.anything(),
      "image/jpeg",
    );
    expect(url).toBe(
      "https://files.example/meeples/instagram-covers/spieleabend-juli-xyz.jpg",
    );
  });

  it("keeps an existing jpeg cover without uploading", async () => {
    getBlobMock.mockResolvedValue({
      bytes: new Uint8Array([1]),
      contentType: "image/jpeg",
    });
    const cover = "https://files.example/meeples/instagram-covers/c.jpg";

    expect(await resolveCoverImageUrl({ ...POST, coverImageUrl: cover })).toBe(
      cover,
    );
    expect(putMock).not.toHaveBeenCalled();
  });

  it("leaves foreign cover urls untouched", async () => {
    const cover = "https://other.example/cover.png";

    expect(await resolveCoverImageUrl({ ...POST, coverImageUrl: cover })).toBe(
      cover,
    );
    expect(getBlobMock).not.toHaveBeenCalled();
    expect(putMock).not.toHaveBeenCalled();
  });

  it("generates and uploads a fallback image when none is set", async () => {
    // putBlob liefert den Key (#112), das Cover bekommt die öffentliche URL.
    putMock.mockResolvedValue("instagram-covers/spieleabend-juli-abc.jpg");

    const url = await resolveCoverImageUrl({
      slug: "spieleabend-juli",
      title: "Spieleabend im Juli",
      excerpt: "Wir treffen uns wieder im Vereinsheim.",
      coverImageUrl: null,
    });

    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock).toHaveBeenCalledWith(
      "instagram-covers/spieleabend-juli.jpg",
      expect.anything(),
      "image/jpeg",
    );
    expect(url).toBe(
      "https://files.example/meeples/instagram-covers/spieleabend-juli-abc.jpg",
    );
  });
});
