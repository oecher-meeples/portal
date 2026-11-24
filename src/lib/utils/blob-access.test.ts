import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  blobKeyFrom,
  isPublicBlobKey,
  PUBLIC_BLOB_PREFIXES,
  SIGNED_BLOB_URL_TTL_SECONDS,
  signedBlobUrl,
  signedBlobUrlOrNull,
  toStoredBlobRef,
} from "@/lib/utils/blob-access";
import { stubS3Env, TEST_S3_PUBLIC_BASE } from "@/lib/__mocks__/s3-env";

beforeEach(() => {
  stubS3Env();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const NOW = new Date("2026-11-23T14:05:09.123Z");

describe("isPublicBlobKey (#112)", () => {
  it("treats only the listed prefixes as public", () => {
    expect(PUBLIC_BLOB_PREFIXES).toEqual(["instagram-covers", "legal"]);
    expect(isPublicBlobKey("instagram-covers/post.png")).toBe(true);
    expect(isPublicBlobKey("legal/satzung.pdf")).toBe(true);
  });

  it("matches the anonymous-read resources of the seaweedfs-init bucket policy", () => {
    const compose = readFileSync(
      path.resolve(__dirname, "../../../docker-compose.yml"),
      "utf8",
    );
    const resources = [
      ...compose.matchAll(/"arn:aws:s3:::\$\$S3_BUCKET\/([^"]+)"/g),
    ].map((match) => match[1]);
    expect(resources).toEqual(
      PUBLIC_BLOB_PREFIXES.map((prefix) => `${prefix}/*`),
    );
  });

  it.each([
    "downloads/satzung.pdf",
    "market-listings/a.png",
    "lfg-attachments/x.pdf",
    "meeple-profile-pictures/me.jpg",
    "important-links/icon.webp",
    "some-future-prefix/file.bin",
    // Präfix muss ein ganzes Segment sein.
    "legally-private/x.pdf",
  ])("is private by default: %s", (key) => {
    expect(isPublicBlobKey(key)).toBe(false);
  });
});

describe("blobKeyFrom", () => {
  it("keeps a key and turns our URL into its key, dropping query and signature", () => {
    expect(blobKeyFrom("downloads/a.pdf")).toBe("downloads/a.pdf");
    expect(
      blobKeyFrom(
        `${TEST_S3_PUBLIC_BASE}/downloads/Satzung%20%C3%84.pdf?X-Amz-Signature=x`,
      ),
    ).toBe("downloads/Satzung Ä.pdf");
  });

  it.each([
    "https://abc.public.blob.vercel-storage.com/downloads/a.pdf",
    "https://cf.geekdo-images.com/pic.jpg",
    "/downloads/Mitgliedsantrag.pdf",
    "   ",
  ])("returns null for references outside our bucket: %s", (value) => {
    expect(blobKeyFrom(value)).toBeNull();
  });
});

describe("toStoredBlobRef", () => {
  it("stores our upload URL as a key under the expected prefix", () => {
    expect(
      toStoredBlobRef(
        `${TEST_S3_PUBLIC_BASE}/market-listings/a.png?X-Amz-Signature=abc`,
        "market-listings",
      ),
    ).toBe("market-listings/a.png");
  });

  it.each([
    "downloads/satzung.pdf",
    `${TEST_S3_PUBLIC_BASE}/meeple-profile-pictures/someone.jpg`,
    "market-listings/../downloads/satzung.pdf",
    "market-listingsX/a.png",
  ])("refuses a key outside the prefix: %s", (value) => {
    expect(() => toStoredBlobRef(value, "market-listings")).toThrow(
      "Ungültiger Dateiverweis.",
    );
  });

  it("keeps foreign legacy URLs untouched — the app never signs them", () => {
    expect(
      toStoredBlobRef("https://cf.geekdo-images.com/a.jpg", "market-listings"),
    ).toBe("https://cf.geekdo-images.com/a.jpg");
  });
});

describe("signedBlobUrl", () => {
  it("returns the permanent URL for public prefixes", () => {
    expect(signedBlobUrl("legal/satzung.pdf")).toBe(
      `${TEST_S3_PUBLIC_BASE}/legal/satzung.pdf`,
    );
  });

  it("passes foreign URLs and app paths through", () => {
    expect(signedBlobUrl("https://cf.geekdo-images.com/a.jpg")).toBe(
      "https://cf.geekdo-images.com/a.jpg",
    );
    expect(signedBlobUrl("/downloads/Mitgliedsantrag.pdf")).toBe(
      "/downloads/Mitgliedsantrag.pdf",
    );
  });

  it("signs private keys with the TTL against the public endpoint", () => {
    const url = new URL(signedBlobUrl("downloads/a b.pdf", NOW));

    expect(`${url.origin}${url.pathname}`).toBe(
      `${TEST_S3_PUBLIC_BASE}/downloads/a%20b.pdf`,
    );
    expect(url.searchParams.get("X-Amz-Expires")).toBe(
      String(SIGNED_BLOB_URL_TTL_SECONDS),
    );
    expect(url.searchParams.get("X-Amz-Date")).toBe("20261123T140509Z");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("re-signs a stored legacy URL of our bucket instead of exposing it raw", () => {
    const url = new URL(
      signedBlobUrl(`${TEST_S3_PUBLIC_BASE}/downloads/a.pdf`, NOW),
    );
    expect(url.searchParams.has("X-Amz-Signature")).toBe(true);
  });

  it.each([
    "downloads/a.pdf",
    "market-listings/Spiel (2) – Ärger!*'.png",
    "meeple-profile-pictures/x~y_z.webp",
  ])(
    "produces exactly the URL of the official AWS presigner: %s",
    async (key) => {
      const official = await getSignedUrl(
        new S3Client({
          endpoint: "https://files.example.org",
          region: "us-east-1",
          forcePathStyle: true,
          // Sonst hängt das SDK optionale Checksum-Parameter an
          // (`x-amz-checksum-mode`, `x-amz-checksum-crc32`).
          responseChecksumValidation: "WHEN_REQUIRED",
          requestChecksumCalculation: "WHEN_REQUIRED",
          credentials: {
            accessKeyId: "test-access-key",
            secretAccessKey: "test-secret-key",
          },
        }),
        new GetObjectCommand({ Bucket: "meeples", Key: key }),
        { expiresIn: SIGNED_BLOB_URL_TTL_SECONDS, signingDate: NOW },
      );

      const ours = new URL(signedBlobUrl(key, NOW));
      const theirs = new URL(official);
      expect(ours.pathname).toBe(theirs.pathname);
      expect(Object.fromEntries(ours.searchParams)).toEqual(
        Object.fromEntries(theirs.searchParams),
      );
    },
  );

  it("keeps null for optional fields", () => {
    expect(signedBlobUrlOrNull(null)).toBeNull();
    expect(signedBlobUrlOrNull(undefined)).toBeNull();
    expect(signedBlobUrlOrNull("legal/a.pdf")).toBe(
      `${TEST_S3_PUBLIC_BASE}/legal/a.pdf`,
    );
  });
});
