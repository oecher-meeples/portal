import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBlobUploadToken } from "@/lib/utils/blob-upload-token";
import {
  stubS3Env,
  TEST_S3_PUBLIC_BASE,
  TEST_S3_PUBLIC_ENDPOINT,
} from "@/lib/__mocks__/s3-env";

beforeEach(() => {
  stubS3Env();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function decodePolicy(fields: Record<string, string>) {
  return JSON.parse(Buffer.from(fields.Policy, "base64").toString("utf8")) as {
    conditions: unknown[];
  };
}

describe("createBlobUploadToken", () => {
  it("signs a POST against the public endpoint with size and type conditions", async () => {
    const token = await createBlobUploadToken({
      pathname: "legal/satzung.pdf",
      contentType: "application/pdf",
      allowedContentTypes: ["application/pdf"],
      maximumSizeInBytes: 1024,
    });

    expect(token.url).toBe(TEST_S3_PUBLIC_BASE);
    expect(token.url.startsWith(TEST_S3_PUBLIC_ENDPOINT)).toBe(true);
    expect(token.fields.key).toBe("legal/satzung.pdf");
    expect(token.fields["Content-Type"]).toBe("application/pdf");
    expect(token.publicUrl).toBe(`${TEST_S3_PUBLIC_BASE}/legal/satzung.pdf`);

    const { conditions } = decodePolicy(token.fields);
    expect(conditions).toContainEqual(["content-length-range", 0, 1024]);
    expect(conditions).toContainEqual([
      "eq",
      "$Content-Type",
      "application/pdf",
    ]);
  });

  it("adds a random suffix to the key when asked", async () => {
    const token = await createBlobUploadToken({
      pathname: "downloads/flyer.pdf",
      contentType: "application/pdf",
      addRandomSuffix: true,
      maximumSizeInBytes: 1024,
    });

    expect(token.fields.key).toMatch(/^downloads\/flyer-.+\.pdf$/);
    expect(token.publicUrl).toBe(`${TEST_S3_PUBLIC_BASE}/${token.fields.key}`);
  });

  it("rejects a content type outside the allowlist", async () => {
    await expect(
      createBlobUploadToken({
        pathname: "market-listings/x.svg",
        contentType: "image/svg+xml",
        allowedContentTypes: ["image/png"],
        maximumSizeInBytes: 1024,
      }),
    ).rejects.toThrow("Dateityp image/svg+xml ist nicht erlaubt.");
  });

  it("names an empty content type in the rejection", async () => {
    await expect(
      createBlobUploadToken({
        pathname: "legal/x",
        contentType: "",
        allowedContentTypes: ["application/pdf"],
        maximumSizeInBytes: 1024,
      }),
    ).rejects.toThrow("(unbekannt)");
  });
});
