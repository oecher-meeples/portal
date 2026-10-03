import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  getBlobPublicOrigin,
  getS3Client,
  keyFromPublicUrl,
  publicUrlForKey,
  putBlob,
  withRandomSuffix,
} from "@/lib/utils/s3";
import { stubS3Env, TEST_S3_PUBLIC_BASE } from "@/lib/__mocks__/s3-env";

beforeEach(() => {
  stubS3Env();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("publicUrlForKey / keyFromPublicUrl", () => {
  it("builds a path-style public URL and encodes each segment", () => {
    expect(publicUrlForKey("legal/Satzung 2026.pdf")).toBe(
      `${TEST_S3_PUBLIC_BASE}/legal/Satzung%202026.pdf`,
    );
  });

  it("round-trips a key through its public URL", () => {
    const key = "market-listings/Ark Nova-abc.png";
    expect(keyFromPublicUrl(publicUrlForKey(key))).toBe(key);
  });

  it("ignores query strings and fragments", () => {
    expect(keyFromPublicUrl(`${TEST_S3_PUBLIC_BASE}/a/b.png?v=1#x`)).toBe(
      "a/b.png",
    );
  });

  it("returns null for URLs outside the bucket (e.g. legacy Vercel Blob)", () => {
    expect(
      keyFromPublicUrl("https://abc.public.blob.vercel-storage.com/a.png"),
    ).toBeNull();
    expect(keyFromPublicUrl(`${TEST_S3_PUBLIC_BASE}/`)).toBeNull();
  });

  it("falls back to S3_ENDPOINT when no public endpoint is configured", () => {
    vi.stubEnv("S3_PUBLIC_ENDPOINT", "");
    vi.stubEnv("S3_ENDPOINT", "http://localhost:9000/");
    expect(publicUrlForKey("a.png")).toBe(
      "http://localhost:9000/meeples/a.png",
    );
  });
});

describe("getBlobPublicOrigin", () => {
  it("returns the origin of the public endpoint", () => {
    vi.stubEnv("S3_PUBLIC_ENDPOINT", "https://files.example.org/sub/");
    expect(getBlobPublicOrigin()).toBe("https://files.example.org");
  });

  it("returns null when unconfigured or invalid", () => {
    vi.stubEnv("S3_PUBLIC_ENDPOINT", "");
    vi.stubEnv("S3_ENDPOINT", "");
    expect(getBlobPublicOrigin()).toBeNull();
    vi.stubEnv("S3_ENDPOINT", "not a url");
    expect(getBlobPublicOrigin()).toBeNull();
  });
});

describe("withRandomSuffix", () => {
  it("inserts a random suffix before the extension", () => {
    expect(withRandomSuffix("downloads/flyer.pdf")).toMatch(
      /^downloads\/flyer-[\w-]{11}\.pdf$/,
    );
  });

  it("never yields the same key twice", () => {
    expect(withRandomSuffix("a/b.png")).not.toBe(withRandomSuffix("a/b.png"));
  });
});

describe("getS3Client", () => {
  it("throws with the variable name when credentials are missing", () => {
    vi.stubEnv("S3_ACCESS_KEY", "");
    expect(() => getS3Client()).toThrow("S3_ACCESS_KEY");
  });

  it("uses path-style addressing (required by MinIO)", () => {
    expect(getS3Client().config.forcePathStyle).toBe(true);
  });
});

describe("putBlob", () => {
  it("uploads with a random suffix and returns the public URL", async () => {
    const send = vi
      .spyOn(S3Client.prototype, "send")
      .mockResolvedValue({} as never);

    const url = await putBlob(
      "instagram-covers/post.png",
      new ArrayBuffer(4),
      "image/png",
    );

    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: "meeples",
      ContentType: "image/png",
    });
    expect(command.input.Body).toBeInstanceOf(Uint8Array);
    expect(command.input.Key).toMatch(/^instagram-covers\/post-.+\.png$/);
    expect(url).toBe(`${TEST_S3_PUBLIC_BASE}/${command.input.Key}`);
  });
});
